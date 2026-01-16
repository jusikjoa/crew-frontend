// 개발 환경에서는 Next.js rewrites를 통해 프록시 사용
// 프로덕션에서는 직접 백엔드 URL 사용
const API_BASE_URL = 
  typeof window !== 'undefined' && process.env.NODE_ENV === 'development'
    ? '/api' // Next.js rewrites를 통해 프록시
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// 개발 환경에서 API URL 확인용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API] Base URL:', API_BASE_URL);
}

export interface User {
  id: number;
  email: string;
  username: string;
  displayName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Channel {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  content: string;
  authorId: number;
  channelId: number;
  createdAt: string;
  updatedAt: string;
  author?: User;
  channel?: Channel;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  displayName?: string;
}

export interface SignupResponse {
  user: User;
}

export interface CreateMessageRequest {
  content: string;
  channelId: string; // 백엔드가 문자열을 기대함
}

export interface CreateChannelRequest {
  name: string;
  description?: string;
  isPublic: boolean;
}

export interface UpdateChannelRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  username?: string;
  displayName?: string;
}

export interface UpdatePasswordRequest {
  password: string;
}

// API 호출 헬퍼 함수
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  // 개발 환경에서 요청 정보 로깅
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[API Request]', {
      method: options.method || 'GET',
      url,
      headers,
    });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors', // CORS 모드 명시
    });
  } catch (fetchError: any) {
    // 네트워크 오류 처리
    console.error('[API Error]', {
      url,
      error: fetchError.message,
      name: fetchError.name,
      stack: fetchError.stack,
    });
    
    if (fetchError.message === 'Failed to fetch' || fetchError.name === 'TypeError') {
      throw new Error(
        `백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요. (${API_BASE_URL})\n` +
        `요청 URL: ${url}\n` +
        `가능한 원인: CORS 설정 문제 또는 네트워크 연결 문제`
      );
    }
    throw fetchError;
  }

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      // 다양한 에러 응답 형식 처리
      if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (Array.isArray(errorData.message)) {
        // NestJS validation 에러 형식
        errorMessage = errorData.message.join(', ');
      }
    } catch (jsonError) {
      // JSON 파싱 실패 시 텍스트로 읽기 시도
      try {
        const text = await response.text();
        if (text) {
          errorMessage = text;
        }
      } catch (textError) {
        // 텍스트 읽기도 실패하면 기본 메시지 사용
      }
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiCall<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  signup: async (data: SignupRequest): Promise<SignupResponse> => {
    return apiCall<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Channels API
export const channelsApi = {
  getAll: async (): Promise<Channel[]> => {
    return apiCall<Channel[]>('/channels');
  },

  getMyChannels: async (): Promise<Channel[]> => {
    return apiCall<Channel[]>('/channels/my-channels');
  },

  getById: async (id: number | string): Promise<Channel> => {
    return apiCall<Channel>(`/channels/${id}`);
  },

  join: async (id: number | string): Promise<Channel> => {
    return apiCall<Channel>(`/channels/${id}/join`, {
      method: 'POST',
    });
  },

  leave: async (id: number | string): Promise<void> => {
    return apiCall<void>(`/channels/${id}/leave`, {
      method: 'POST',
    });
  },

  create: async (data: CreateChannelRequest): Promise<Channel> => {
    return apiCall<Channel>('/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number | string, data: UpdateChannelRequest): Promise<Channel> => {
    return apiCall<Channel>(`/channels/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Messages API
export const messagesApi = {
  getByChannel: async (channelId: number | string): Promise<Message[]> => {
    return apiCall<Message[]>(`/messages/channel/${channelId}`);
  },

  create: async (data: CreateMessageRequest): Promise<Message> => {
    return apiCall<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersApi = {
  getById: async (id: number): Promise<User> => {
    return apiCall<User>(`/users/${id}`);
  },

  update: async (id: number, data: UpdateUserRequest): Promise<User> => {
    return apiCall<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updatePassword: async (id: number, data: UpdatePasswordRequest): Promise<void> => {
    return apiCall<void>(`/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
