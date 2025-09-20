const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Import auth utilities
import { AuthTokenManager, refreshTokenIfNeeded } from './auth';

export interface SignupRequest {
  username: string;
  password: string;
  name: string;
}

export interface SignupResponse {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface ChatStartRequest {
  userId: string;
  message: string;
  context: string;
}

export interface ChatStartResponse {
  sessionId: string;
  response: string;
  timestamp: string;
}

export interface ChatReportsParams {
  userId: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ChatReport {
  id: string;
  userId: string;
  sessionId: string;
  reportDate: string;
  duration: number;
  messageCount: number;
  sentiment: string;
  summary: string;
}

export interface ChatReportsResponse {
  content: ChatReport[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ImageUploadRequest {
  userId: string;
  imageUrl: string;
  description: string;
  scheduledDate: string;
}

export interface ImageUploadResponse {
  id: string;
  userId: string;
  imageUrl: string;
  description: string;
  scheduledDate: string;
  uploadedAt: string;
  status: string;
}

export interface UserImage {
  id: string;
  userId: string;
  imageUrl: string;
  description: string;
  scheduledDate: string;
  uploadedAt: string;
  status: string;
  usageCount: number;
  lastUsedAt?: string;
}

export interface UserImagesResponse {
  images: UserImage[];
  totalCount: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add authorization header if needed
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (includeAuth && !endpoint.includes('/auth/')) {
      // Try to refresh token if needed before making the request
      await refreshTokenIfNeeded();

      const authHeader = AuthTokenManager.getAuthorizationHeader();
      if (authHeader) {
        headers['Authorization'] = authHeader;
      }
    }

    const config: RequestInit = {
      headers,
      ...options,
    };

    // Log request details for debugging
    console.log('🔍 API Request:', {
      method: config.method || 'GET',
      url,
      headers,
      body: config.body
    });

    try {
      const response = await fetch(url, config);

      // If unauthorized and we haven't already tried to refresh, try once more
      if (response.status === 401 && includeAuth && !endpoint.includes('/auth/')) {
        const refreshSuccess = await refreshTokenIfNeeded();
        if (refreshSuccess) {
          // Retry the request with new token
          const newAuthHeader = AuthTokenManager.getAuthorizationHeader();
          if (newAuthHeader) {
            headers['Authorization'] = newAuthHeader;
          }
          const retryResponse = await fetch(url, { ...config, headers });

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }

          return await retryResponse.json();
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ API Request Failed:', {
        url,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: config.body
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('네트워크 오류가 발생했습니다.');
    }
  }

  async signup(data: SignupRequest): Promise<SignupResponse> {
    return this.request<SignupResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'refreshToken': refreshToken,
      },
    });
  }

  async startChat(data: ChatStartRequest): Promise<ChatStartResponse> {
    return this.request<ChatStartResponse>('/api/chat/start', {
      method: 'POST',
      headers: {
        'userId': data.userId,
        'message': data.message,
        'context': data.context,
      },
    });
  }

  async getChatReports(params: ChatReportsParams): Promise<ChatReportsResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('userId', params.userId);
    if (params.page !== undefined) searchParams.append('page', params.page.toString());
    if (params.size !== undefined) searchParams.append('size', params.size.toString());
    if (params.sort) searchParams.append('sort', params.sort);

    return this.request<ChatReportsResponse>(`/api/chat/reports?${searchParams.toString()}`, {
      method: 'GET',
    });
  }

  async uploadImage(data: ImageUploadRequest): Promise<ImageUploadResponse> {
    return this.request<ImageUploadResponse>('/api/images/upload', {
      method: 'POST',
      headers: {
        'userId': data.userId,
        'imageUrl': data.imageUrl,
        'description': data.description,
        'scheduledDate': data.scheduledDate,
      },
    });
  }

  async getUserImages(userId: string): Promise<UserImagesResponse> {
    return this.request<UserImagesResponse>(`/api/images/user/${userId}`, {
      method: 'GET',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);