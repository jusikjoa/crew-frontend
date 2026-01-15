'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { channelsApi, Channel } from '@/lib/api';
import Link from 'next/link';

export default function MyChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchMyChannels();
  }, [isAuthenticated, router]);

  const fetchMyChannels = async () => {
    try {
      setLoading(true);
      const data = await channelsApi.getMyChannels();
      setChannels(data);
    } catch (err: any) {
      setError(err.message || '채널을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
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
              <span className="text-sm text-black">
                {user?.displayName || user?.username}
              </span>
              <Link
                href="/profile"
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                프로필 설정
              </Link>
              <Link
                href="/channels"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                전체 채널 보기
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
            <h2 className="text-3xl font-bold text-gray-900">내가 속한 채널</h2>
            <p className="mt-2 text-black">참여 중인 채널 목록입니다</p>
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
            <p className="text-black">참여 중인 채널이 없습니다.</p>
            <Link
              href="/channels"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              채널 탐색하기
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/chat/${channel.id}`}
                className="block rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
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
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
