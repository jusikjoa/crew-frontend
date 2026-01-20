'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { messagesApi, channelsApi, Message, Channel, User } from '@/lib/api';
import Link from 'next/link';

export default function ChatPage() {
  const params = useParams();
  const channelId = params.channelId as string; // 문자열로 유지
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const { isAuthenticated, logout, user } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // channelId 유효성 검사
    if (!channelId || channelId.trim() === '') {
      setError('유효하지 않은 채널 ID입니다.');
      setLoading(false);
      return;
    }

    fetchChannel();
    fetchMessages();
    fetchMembers();
    
    // 주기적으로 메시지 새로고침 (5초마다)
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAuthenticated, router, channelId, params.channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChannel = async () => {
    try {
      if (!channelId || channelId.trim() === '') {
        setError('유효하지 않은 채널 ID입니다.');
        return;
      }
      const data = await channelsApi.getById(channelId);
      setChannel(data);
    } catch (err: any) {
      setError(err.message || '채널 정보를 불러오는데 실패했습니다.');
    }
  };

  const fetchMembers = async () => {
    try {
      if (!channelId || channelId.trim() === '') {
        return;
      }
      const data = await channelsApi.getMembers(channelId);
      setMembers(data);
    } catch (err: any) {
      console.error('[Members] Error:', err);
      // 멤버 목록 로드 실패는 치명적이지 않으므로 에러 표시하지 않음
    }
  };

  const fetchMessages = async () => {
    try {
      if (!channelId || channelId.trim() === '') {
        setError('유효하지 않은 채널 ID입니다.');
        setLoading(false);
        return;
      }
      const data = await messagesApi.getByChannel(channelId);
      setMessages(data);
      setError('');
      if (process.env.NODE_ENV === 'development') {
        console.log('[Messages] Loaded:', data.length, 'messages');
      }
    } catch (err: any) {
      console.error('[Messages] Error:', err);
      setError(err.message || '메시지를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await messagesApi.create({
        content: newMessage.trim(),
        channelId: channelId, // 이미 문자열
      });
      setNewMessage('');
      // 메시지 전송 후 즉시 새로고침
      await fetchMessages();
    } catch (err: any) {
      setError(err.message || '메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleLeaveChannel = async () => {
    if (!channelId || !confirm('정말로 이 채널을 나가시겠습니까?')) {
      return;
    }

    try {
      await channelsApi.leave(channelId);
      router.push('/channels');
    } catch (err: any) {
      setError(err.message || '채널 나가기에 실패했습니다.');
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelId || !channel || deleting) {
      return;
    }

    // 채널 생성자 확인
    if (channel.createdBy !== user?.id) {
      setError('채널을 삭제할 권한이 없습니다. 채널 생성자만 삭제할 수 있습니다.');
      return;
    }

    const confirmMessage = `정말로 "${channel.name}" 채널을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 채널의 모든 메시지가 삭제됩니다.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      console.log('[Delete Channel] Attempting to delete:', {
        channelId,
        channelName: channel.name,
        createdBy: channel.createdBy,
        currentUserId: user?.id,
      });
      
      await channelsApi.delete(channelId);
      router.push('/channels');
    } catch (err: any) {
      // 에러 정보를 개별적으로 출력
      console.error('[Delete Channel Error] Full Error Object:', err);
      console.error('[Delete Channel Error] Message:', err.message);
      console.error('[Delete Channel Error] Status:', err.status);
      console.error('[Delete Channel Error] Error Details:', err.errorDetails);
      console.error('[Delete Channel Error] Stack:', err.stack);
      
      const status = err.status;
      let errorMessage = err.message || '채널 삭제에 실패했습니다.';
      
      // HTTP 상태 코드에 따라 적절한 메시지 표시
      if (status === 403) {
        errorMessage = '채널을 삭제할 권한이 없습니다. 채널 생성자만 삭제할 수 있습니다.';
      } else if (status === 401) {
        errorMessage = '인증이 필요합니다. 다시 로그인해주세요.';
      } else if (status === 404) {
        errorMessage = '채널을 찾을 수 없습니다.';
      } else if (status === 500) {
        // 500 에러인 경우 더 자세한 정보 표시 (개발 환경에서)
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `서버 오류가 발생했습니다. (상태 코드: 500)\n\n상세 정보: ${err.message}\n\n콘솔을 확인하세요.`;
        } else {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      } else if (errorMessage.includes('Internal server error')) {
        if (process.env.NODE_ENV === 'development') {
          errorMessage = `서버 오류가 발생했습니다.\n\n상세 정보: ${err.message}\n\n콘솔을 확인하세요.`;
        } else {
          errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/channels"
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                ← 채널 목록
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {channel?.name || '채널'}
                </h1>
                {channel?.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{channel.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 사이드바 토글 버튼 */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="rounded-xl p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="참여자 목록"
                title={showSidebar ? '참여자 목록 닫기' : '참여자 목록 열기'}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </button>
              {channel && channel.createdBy === user?.id && (
                <>
                  <Link
                    href={`/chat/${channelId}/settings`}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    설정
                  </Link>
                  <button
                    onClick={handleDeleteChannel}
                    disabled={deleting}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="채널 삭제"
                  >
                    {deleting ? '삭제 중...' : '삭제'}
                  </button>
                </>
              )}
              <button
                onClick={handleLeaveChannel}
                className="rounded-xl px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                나가기
              </button>
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

      {error && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 dark:border-indigo-400 border-r-transparent"></div>
                  <p className="mt-4 text-slate-600 dark:text-slate-400">메시지를 불러오는 중...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-12 text-center shadow-sm border border-slate-200 dark:border-slate-700">
                <p className="text-slate-600 dark:text-slate-400">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message) => {
                  const isOwnMessage = message.authorId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-2xl px-4 py-2.5 ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                            : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-600'
                        }`}
                      >
                        {!isOwnMessage && (
                          <p className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            {message.author?.displayName || message.author?.username || '알 수 없음'}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                        <p
                          className={`mt-1.5 text-xs ${
                            isOwnMessage ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {formatTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
            </div>
          </div>

          {/* 사이드바 */}
          {showSidebar && (
            <div className="fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl transition-transform duration-300 ease-in-out z-30 lg:relative lg:shadow-none">
            <div className="flex h-full flex-col">
              {/* 사이드바 헤더 */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  참여자 ({members.length})
                </h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="사이드바 닫기"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* 참여자 목록 */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      참여자가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                          member.id === user?.id
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm">
                          {(member.displayName || member.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {member.displayName || member.username}
                            {member.id === user?.id && (
                              <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">
                                (나)
                              </span>
                            )}
                          </p>
                          {member.displayName && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              @{member.username}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {/* 모바일에서 사이드바 오버레이 */}
          {showSidebar && (
            <div
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 transition-all"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
              >
                {sending ? '전송 중...' : '전송'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
