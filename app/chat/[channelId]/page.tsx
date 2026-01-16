'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { messagesApi, channelsApi, Message, Channel } from '@/lib/api';
import Link from 'next/link';

export default function ChatPage() {
  const params = useParams();
  const channelId = params.channelId as string; // 문자열로 유지
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
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
              {channel && channel.createdBy === user?.id && (
                <Link
                  href={`/chat/${channelId}/settings`}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  설정
                </Link>
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
