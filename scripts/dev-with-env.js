/* eslint-disable @typescript-eslint/no-require-imports */
// .env.local 파일을 읽어서 개발 서버를 실행하는 스크립트
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let port = '3001';

// .env.local 파일에서 PORT 읽기
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^PORT\s*=\s*(.+)$/);
      if (match) {
        port = match[1].trim();
        break;
      }
    }
  }
}

console.log(`Starting Next.js dev server on port ${port}...`);
const isWindows = process.platform === 'win32';
const command = isWindows ? 'npx.cmd' : 'npx';
const args = ['next', 'dev', '-p', port];

spawn(command, args, { 
  stdio: 'inherit', 
  shell: true,
  cwd: path.join(__dirname, '..')
});
