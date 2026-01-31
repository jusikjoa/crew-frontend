'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { channelsApi, Channel } from '@/lib/api';
import Link from 'next/link';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [myChannels, setMyChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchChannels();
    fetchMyChannels();
  }, [isAuthenticated, router]);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const data = await channelsApi.getAll();
      setChannels(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '채널을 불러오는데 실패했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyChannels = async () => {
    try {
      const data = await channelsApi.getMyChannels();
      setMyChannels(data);
    } catch {
      // 내 채널 목록 로드 실패는 무시 (선택적)
    }
  };

  const handleChannelClick = (channel: Channel, e: React.MouseEvent) => {
    e.preventDefault();
    
    // 내가 속한 채널인지 확인
    const isMember = myChannels.some((myChannel) => myChannel.id === channel.id);
    
    if (isMember) {
      // 이미 가입한 채널이면 바로 채팅 페이지로 이동
      router.push(`/chat/${channel.id}`);
    } else {
      // 가입하지 않은 채널이면 가입 모달 표시
      setSelectedChannel(channel);
      setShowJoinModal(true);
      setJoinError(''); // 모달 열 때 에러 초기화
      setJoinPassword(''); // 비밀번호 초기화
    }
  };

  const handleJoinChannel = async () => {
    if (!selectedChannel || joining) return;

    setJoining(true);
    setJoinError(''); // 에러 초기화
    try {
      // 비공개 채널인 경우 비밀번호 필요
      const joinData = !selectedChannel.isPublic && joinPassword.trim()
        ? { password: joinPassword.trim() }
        : undefined;
      
      await channelsApi.join(selectedChannel.id, joinData);
      // 가입 성공 후 내 채널 목록 새로고침
      await fetchMyChannels();
      setShowJoinModal(false);
      setSelectedChannel(null);
      setJoinError('');
      setJoinPassword(''); // 비밀번호 초기화
      // 채팅 페이지로 이동
      router.push(`/chat/${selectedChannel.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '채널 가입에 실패했습니다.';
      setJoinError(message);
    } finally {
      setJoining(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Crew
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                프로필
              </Link>
              <Link
                href="/channels/my-channels"
                className="rounded-xl px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                내 채널
              </Link>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">전체 채널</h2>
            <p className="text-slate-600 dark:text-slate-400">모든 공개 채널을 탐색하세요</p>
          </div>
          <Link
            href="/channels/create"
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all transform hover:scale-105 active:scale-95"
          >
            + 채널 생성
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 dark:border-indigo-400 border-r-transparent"></div>
              <p className="mt-4 text-slate-600 dark:text-slate-400">로딩 중...</p>
            </div>
          </div>
        ) : channels.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-12 text-center shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">채널이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={(e) => handleChannelClick(channel, e)}
                className="group cursor-pointer rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-600 transition-all transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {channel.name}
                    </h3>
                    {channel.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                        {channel.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          channel.isPublic
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {channel.isPublic ? '공개' : '비공개'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 채널 가입 모달 */}
      {showJoinModal && selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              채널 가입
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{selectedChannel.name}</span> 채널에 가입하시겠습니까?
            </p>
            {selectedChannel.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                {selectedChannel.description}
              </p>
            )}
            {!selectedChannel.isPublic && (
              <div className="mb-6">
                <label htmlFor="joinPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="joinPassword"
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 transition-all"
                  placeholder="채널 비밀번호를 입력하세요"
                  disabled={joining}
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  비공개 채널은 비밀번호가 필요합니다.
                </p>
              </div>
            )}
            {joinError && (
              <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                <p className="text-sm text-red-700 dark:text-red-400">{joinError}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedChannel(null);
                  setJoinError('');
                  setJoinPassword('');
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                disabled={joining}
              >
                취소
              </button>
              <button
                onClick={handleJoinChannel}
                disabled={joining || (!selectedChannel.isPublic && !joinPassword.trim())}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
              >
                {joining ? '가입 중...' : '가입하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
