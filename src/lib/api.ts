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
}

export const apiClient = new ApiClient(API_BASE_URL);