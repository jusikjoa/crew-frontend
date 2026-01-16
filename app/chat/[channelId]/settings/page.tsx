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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error && !channel) {
    return (
      <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link
                href={`/chat/${channelId}`}
                className="text-slate-600 hover:text-indigo-600 transition-colors"
              >
                ← 채팅으로 돌아가기
              </Link>
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href={`/chat/${channelId}`}
              className="text-slate-600 hover:text-indigo-600 transition-colors"
            >
              ← 채팅으로 돌아가기
            </Link>
            <h1 className="text-xl font-bold text-slate-900">채널 설정</h1>
            <div></div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl">
          {error && (
            <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                채널 이름
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                채널 설명
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                disabled={saving}
              />
            </div>

            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  disabled={saving}
                />
                <span className="ml-3 text-sm font-medium text-slate-700">공개 채널</span>
              </label>
              <p className="mt-2 ml-8 text-xs text-slate-500">
                공개 채널은 모든 사용자가 볼 수 있고 참여할 수 있습니다.
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link
                href={`/chat/${channelId}`}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all transform hover:scale-105 active:scale-95"
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
