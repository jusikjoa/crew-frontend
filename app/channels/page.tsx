'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
  const { isAuthenticated, logout, user } = useAuth();
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
    } catch (err: any) {
      setError(err.message || '채널을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyChannels = async () => {
    try {
      const data = await channelsApi.getMyChannels();
      setMyChannels(data);
    } catch (err: any) {
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
    }
  };

  const handleJoinChannel = async () => {
    if (!selectedChannel || joining) return;

    setJoining(true);
    setJoinError(''); // 에러 초기화
    try {
      await channelsApi.join(selectedChannel.id);
      // 가입 성공 후 내 채널 목록 새로고침
      await fetchMyChannels();
      setShowJoinModal(false);
      setSelectedChannel(null);
      setJoinError('');
      // 채팅 페이지로 이동
      router.push(`/chat/${selectedChannel.id}`);
    } catch (err: any) {
      setJoinError(err.message || '채널 가입에 실패했습니다.');
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Crew</h1>
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                프로필 설정
              </Link>
              <Link
                href="/channels/my-channels"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                내 채널 보기
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">전체 채널</h2>
            <p className="mt-2 text-black">모든 공개 채널을 탐색하세요</p>
          </div>
          <Link
            href="/channels/create"
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + 채널 생성
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-black">로딩 중...</p>
          </div>
        ) : channels.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-black">채널이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                onClick={(e) => handleChannelClick(channel, e)}
                className="cursor-pointer rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {channel.name}
                    </h3>
                    {channel.description && (
                      <p className="mt-2 text-sm text-black line-clamp-2">
                        {channel.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center gap-2 text-xs text-black">
                      <span
                        className={`rounded-full px-2 py-1 ${
                          channel.isPublic
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="rounded-lg bg-white p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              채널 가입
            </h3>
            <p className="text-black mb-4">
              <span className="font-medium">{selectedChannel.name}</span> 채널에 가입하시겠습니까?
            </p>
            {selectedChannel.description && (
              <p className="text-sm text-gray-600 mb-4">
                {selectedChannel.description}
              </p>
            )}
            {joinError && (
              <div className="mb-4 rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{joinError}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setSelectedChannel(null);
                  setJoinError('');
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={joining}
              >
                취소
              </button>
              <button
                onClick={handleJoinChannel}
                disabled={joining}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
