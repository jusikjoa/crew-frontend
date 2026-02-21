'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

const AGENT_API_URL = 'http://localhost:8000';
const POLL_INTERVAL = 2000;

type MessageRole = 'user' | 'agent' | 'system';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: 'pending' | 'done' | 'error';
}

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content:
        '안녕하세요! AI 에이전트입니다. 웹 검색, 졸업시뮬레이션, 일반 대화 등 다양한 작업을 도와드릴 수 있습니다.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isWaiting) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    const agentMsgId = `agent-${Date.now()}`;
    const agentPendingMsg: ChatMessage = {
      id: agentMsgId,
      role: 'agent',
      content: '처리 중...',
      timestamp: new Date(),
      status: 'pending',
    };

    setMessages((prev) => [...prev, userMsg, agentPendingMsg]);
    setInput('');
    setIsWaiting(true);

    try {
      const res = await fetch(`${AGENT_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        throw new Error(`서버 오류: ${res.status}`);
      }

      const responseData = await res.json();

      // 케이스 1: 서버가 reply를 즉시 반환 (동기 방식)
      if (responseData.reply !== undefined) {
        setIsWaiting(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? { ...m, content: responseData.reply, status: 'done' }
              : m
          )
        );
        return;
      }

      // 케이스 2: 서버가 task_id를 반환 (비동기 폴링 방식)
      const task_id = responseData.task_id ?? responseData.taskId ?? responseData.id;

      if (!task_id) {
        throw new Error('서버 응답 형식을 알 수 없습니다.');
      }

      // 폴링 시작
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`${AGENT_API_URL}/chat/${task_id}`);
          if (!pollRes.ok) {
            throw new Error(`폴링 오류: ${pollRes.status}`);
          }
          const data = await pollRes.json();

          if (data.status !== 'pending') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setIsWaiting(false);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === agentMsgId
                  ? {
                      ...m,
                      content:
                        data.status === 'done'
                          ? data.reply
                          : data.reply || '오류가 발생했습니다.',
                      status: data.status,
                    }
                  : m
              )
            );
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsWaiting(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMsgId
                ? { ...m, content: '응답을 가져오는 중 오류가 발생했습니다.', status: 'error' }
                : m
            )
          );
        }
      }, POLL_INTERVAL);
    } catch (err) {
      setIsWaiting(false);
      const errorMsg = err instanceof Error ? err.message : '메시지 전송에 실패했습니다.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsgId
            ? { ...m, content: errorMsg, status: 'error' }
            : m
        )
      );
    }
  };

  const clearHistory = async () => {
    if (!confirm('대화 히스토리를 초기화하시겠습니까?')) return;
    try {
      await fetch(`${AGENT_API_URL}/clear`, { method: 'POST' });
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'system',
          content: '대화 히스토리가 초기화되었습니다.',
          timestamp: new Date(),
        },
      ]);
    } catch {
      alert('초기화에 실패했습니다.');
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* 헤더 */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/channels"
                className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                ← 채널 목록
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">AI 에이전트</h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">KAIST 학사 도우미</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearHistory}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="대화 초기화"
              >
                초기화
              </button>
              <ThemeToggle />
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 기능 안내 배너 */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50 px-4 py-2">
        <div className="mx-auto max-w-4xl flex flex-wrap gap-x-6 gap-y-1 text-xs text-indigo-700 dark:text-indigo-300">
          <span>🔍 웹 검색</span>
          <span>🎓 졸업시뮬레이션</span>
          <span>🌐 API 호출</span>
          <span>💬 일반 대화 · 번역 · 요약</span>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="rounded-full bg-slate-200 dark:bg-slate-700 px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {msg.content}
                  </div>
                </div>
              );
            }

            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 self-end">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                      : msg.status === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 shadow-sm'
                      : msg.status === 'pending'
                      ? 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-600'
                      : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {msg.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce" />
                      </div>
                      <span className="text-sm">처리 중...</span>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                  )}
                  <p
                    className={`mt-1.5 text-xs ${
                      isUser ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-4 sm:px-6">
        <form onSubmit={sendMessage} className="mx-auto max-w-4xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isWaiting ? '에이전트가 응답 중입니다...' : '메시지를 입력하세요...'}
              disabled={isWaiting}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isWaiting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
            >
              전송
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 text-center">
            졸업시뮬레이션은 브라우저가 열리고 수동 로그인(2FA)이 필요합니다
          </p>
        </form>
      </div>
    </div>
  );
}
