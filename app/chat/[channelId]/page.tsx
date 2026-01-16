'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/channels"
                className="text-blue-600 hover:text-blue-700"
              >
                ← 채널 목록
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {channel?.name || '채널'}
                </h1>
                {channel?.description && (
                  <p className="text-sm text-black">{channel.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {channel && channel.createdBy === user?.id && (
                <Link
                  href={`/chat/${channelId}/settings`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  채널 설정
                </Link>
              )}
              <button
                onClick={handleLeaveChannel}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                채널 나가기
              </button>
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

      {error && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-black">메시지를 불러오는 중...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow">
                <p className="text-black">아직 메시지가 없습니다. 첫 메시지를 보내보세요!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.authorId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 shadow'
                        }`}
                      >
                        {!isOwnMessage && (
                          <p className="mb-1 text-xs font-semibold">
                            {message.author?.displayName || message.author?.username || '알 수 없음'}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        <p
                          className={`mt-1 text-xs ${
                            isOwnMessage ? 'text-blue-100' : 'text-black'
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

        <div className="border-t bg-white px-4 py-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSendMessage} className="mx-auto max-w-4xl">
            <div className="flex gap-4">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-black focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
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
