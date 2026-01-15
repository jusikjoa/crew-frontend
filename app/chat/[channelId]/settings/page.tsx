'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { channelsApi, Channel } from '@/lib/api';
import Link from 'next/link';

export default function ChannelSettingsPage() {
  const params = useParams();
  const channelId = params.channelId as string;
  const [channel, setChannel] = useState<Channel | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!channelId || channelId.trim() === '') {
      setError('유효하지 않은 채널 ID입니다.');
      setLoading(false);
      return;
    }

    fetchChannel();
  }, [isAuthenticated, router, channelId]);

  const fetchChannel = async () => {
    try {
      const data = await channelsApi.getById(channelId);
      setChannel(data);
      setName(data.name);
      setDescription(data.description || '');
      setIsPublic(data.isPublic);
      
      // 채널 생성자가 아닌 경우 접근 거부
      if (data.createdBy !== user?.id) {
        setError('채널 설정을 변경할 권한이 없습니다. 채널 생성자만 설정을 변경할 수 있습니다.');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || '채널 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel || saving) return;

    setSaving(true);
    setError('');

    try {
      const updatedChannel = await channelsApi.update(channelId, {
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      
      // 성공 시 채팅 페이지로 이동
      router.push(`/chat/${channelId}`);
    } catch (err: any) {
      setError(err.message || '채널 설정을 저장하는데 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-black">로딩 중...</p>
      </div>
    );
  }

  if (error && !channel) {
    return (
      <div className="flex h-screen flex-col bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link
                href={`/chat/${channelId}`}
                className="text-blue-600 hover:text-blue-700"
              >
                ← 채팅으로 돌아가기
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={`/chat/${channelId}`}
              className="text-blue-600 hover:text-blue-700"
            >
              ← 채팅으로 돌아가기
            </Link>
            <h1 className="text-xl font-bold text-gray-900">채널 설정</h1>
            <div></div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                채널 이름
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                채널 설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={saving}
                />
                <span className="ml-2 text-sm text-gray-900">공개 채널</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                공개 채널은 모든 사용자가 볼 수 있고 참여할 수 있습니다.
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href={`/chat/${channelId}`}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
