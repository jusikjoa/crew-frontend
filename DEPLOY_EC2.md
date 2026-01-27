# EC2 초기 배포 가이드 (Docker + GitHub Actions CD)

이 문서는 현재 구성된 **CD 워크플로우(`.github/workflows/cd.yml`)** 를 사용하기 위해,  
AWS EC2에 처음 배포할 때 필요한 준비 과정을 정리한 것입니다.

---

## 1. 사전 준비 사항

- **AWS EC2 인스턴스**
  - OS: Amazon Linux 2 / Ubuntu LTS 등 (예시는 Ubuntu 기준)
  - 퍼블릭 IP 또는 도메인 할당
  - 보안 그룹에서 **TCP 22(SSH)**, **TCP 3001(앱 포트)** 오픈
- **Docker Hub 계정 & Access Token**
- **GitHub 리포지토리 권한** (Settings 변경 가능)

---
ssh -i crew-frontend-ec2-key.pem ubuntu@13.125.225.5


## 2. EC2에 Docker 설치

SSH로 EC2에 접속 후, Docker를 설치합니다.

```bash
# 패키지 업데이트 (Ubuntu 기준)
sudo apt update -y

# Docker 설치
sudo apt install -y docker.io

# docker 명령을 sudo 없이 사용하기 위해 현재 유저를 docker 그룹에 추가
sudo usermod -aG docker $USER

# 변경 적용을 위해 재로그인 필요
exit
```

다시 SSH로 접속 후:

```bash
docker version
```

정상적으로 버전이 출력되면 설치가 완료된 것입니다.

---

## 3. 애플리케이션 환경 변수 파일 생성

CD 워크플로우는 EC2에서 `--env-file /home/ubuntu/crew-frontend.env` 를 사용하도록 되어 있습니다.  
해당 경로에 환경 변수 파일을 만들어 주세요.

```bash
ssh ubuntu@<EC2_HOST>

nano /home/ubuntu/crew-frontend.env
```

예시:

```env
NEXT_PUBLIC_API_URL=http://your-backend-host:3000
NEXT_PUBLIC_WS_URL=http://your-backend-host:3000
NODE_ENV=production
PORT=3001
```

필요한 값은 실제 백엔드 환경에 맞게 수정하세요.

---

## 4. GitHub Secrets 설정

GitHub 리포지토리에서 아래 값을 등록합니다.

1. 리포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 버튼으로 다음 키들을 추가

필수:

- `DOCKERHUB_USERNAME` : Docker Hub 사용자명
- `DOCKERHUB_TOKEN` : Docker Hub Access Token (비밀번호 대신)
- `EC2_HOST` : EC2 퍼블릭 IP 또는 도메인 (예: `3.XX.XX.XX` 또는 `ec2-3-XX-XX-XX.compute.amazonaws.com`)
- `EC2_USER` : EC2 SSH 유저명 (Ubuntu AMI는 보통 `ubuntu`, Amazon Linux는 `ec2-user`)
- `EC2_SSH_KEY` : EC2 접속용 **개인키 파일(.pem)의 전체 내용** (맨 위 `-----BEGIN ...` 부터 끝까지 복사)

선택:

- `EC2_PORT` : SSH 포트 (기본 22 사용 시 생략 가능)

> 주의: `EC2_SSH_KEY` 는 절대 공개 리포지토리에 올리면 안 됩니다. 반드시 **Secrets** 에만 저장하세요.

---

## 5. Docker Hub 리포지토리 준비

CD 워크플로우는 다음 형식의 이미지 이름을 사용합니다.

```text
${DOCKERHUB_USERNAME}/crew-frontend
```

Docker Hub에서 리포지토리를 미리 만들어 두면 좋습니다.

1. Docker Hub 로그인
2. **Create Repository** 클릭
3. 이름: `crew-frontend`
4. Public / Private 선택 (원하는 대로)

---

## 6. 첫 배포 트리거

모든 준비가 끝났다면, `main` 브랜치로 코드를 push 하면 CD가 동작합니다.

1. 로컬에서 코드 커밋 후 `main` 브랜치로 push
2. GitHub 리포지토리 → **Actions** 탭에서
   - `CD to EC2 via Docker` 워크플로우 실행 상태 확인
3. 워크플로우가 성공하면, EC2에서 다음이 자동으로 수행됩니다.
   - Docker Hub에서 최신 이미지 pull
   - 기존 `crew-frontend` 컨테이너 stop/remove
   - 포트 `3001`로 새 컨테이너 실행

EC2에서 컨테이너 상태 확인:

```bash
ssh ubuntu@<EC2_HOST>
docker ps
```

`crew-frontend` 컨테이너가 `Up` 상태이면 성공입니다.

브라우저에서 다음 주소로 접속해 확인합니다.

```text
http://<EC2_HOST>:3001
```

---

## 7. 배포 실패 시 체크 포인트

1. **GitHub Actions 로그 확인**
   - Build, Push, SSH 단계 중 어디에서 실패했는지 확인
2. **EC2에서 직접 로그 확인**
   ```bash
   docker logs crew-frontend
   ```
3. **포트/보안 그룹 확인**
   - EC2 보안 그룹에서 **3001 포트 인바운드 허용** 여부
4. **환경 변수 파일 확인**
   - `/home/ubuntu/crew-frontend.env` 내용 및 경로가 올바른지

필요하면 워크플로우의 `docker run` 옵션(포트, env 파일 경로 등)을 수정해 사용할 수 있습니다.

