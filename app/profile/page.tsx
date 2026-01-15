'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, User } from '@/lib/api';
import Link from 'next/link';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { isAuthenticated, user: authUser, updateUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !authUser) {
      router.push('/login');
      return;
    }

    fetchUser();
  }, [isAuthenticated, authUser, router]);

  const fetchUser = async () => {
    if (!authUser?.id) return;

    try {
      setLoading(true);
      const data = await usersApi.getById(authUser.id);
      setUser(data);
      setEmail(data.email);
      setUsername(data.username);
      setDisplayName(data.displayName || '');
    } catch (err: any) {
      setError(err.message || '사용자 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || saving) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updateData: { email?: string; username?: string; displayName?: string } = {};
      
      if (email.trim() !== user.email) {
        updateData.email = email.trim();
      }
      if (username.trim() !== user.username) {
        updateData.username = username.trim();
      }
      const currentDisplayName = user.displayName || '';
      const newDisplayName = displayName.trim();
      if (newDisplayName !== currentDisplayName) {
        updateData.displayName = newDisplayName || undefined;
      }

      // 변경사항이 없으면 요청하지 않음
      if (Object.keys(updateData).length === 0) {
        setSuccess('변경된 내용이 없습니다.');
        setSaving(false);
        return;
      }

      const updatedUser = await usersApi.update(user.id, updateData);

      setUser(updatedUser);
      updateUser(updatedUser);
      setSuccess('프로필이 성공적으로 업데이트되었습니다.');
    } catch (err: any) {
      setError(err.message || '프로필 업데이트에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || changingPassword) return;

    if (!newPassword || newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      return;
    }

    setChangingPassword(true);
    setError('');
    setSuccess('');

    try {
      await usersApi.updatePassword(user.id, {
        password: newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
    } catch (err: any) {
      setError(err.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!isAuthenticated || !authUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-black">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/channels"
              className="text-blue-600 hover:text-blue-700"
            >
              ← 채널 목록으로 돌아가기
            </Link>
            <h1 className="text-xl font-bold text-gray-900">프로필 설정</h1>
            <div></div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* 프로필 정보 수정 */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">프로필 정보</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-900">
                사용자명
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-900">
                표시명 (선택사항)
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>

        {/* 비밀번호 변경 */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">비밀번호 변경</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-900">
                새 비밀번호
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={changingPassword}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={changingPassword}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {changingPassword ? '변경 중...' : '비밀번호 변경'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
