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

export interface ReportGenerateRequest {
  userId: string;
  imageId: string;
}

export interface ReportGenerateResponse {
  reportId: string;
  userId: string;
  imageId: string;
  summary: string;
  memo: string;
  generatedAt: string;
  status: string;
}

export interface ReportPdfGenerateRequest {
  reportId?: string;
  userId?: string;
  includeImages?: boolean;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface ReportPdfGenerateResponse {
  pdfUrl: string;
  reportId: string;
  generatedAt: string;
  fileSize: number;
  downloadUrl: string;
}

export interface UserReport {
  id: string;
  userId: string;
  imageId: string;
  summary: string;
  memo: string;
  generatedAt: string;
  status: string;
  imageThumbnail?: string;
  imageDescription?: string;
}

export interface UserReportsResponse {
  reports: UserReport[];
  totalCount: number;
}

export interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserUpdateRequest {
  name?: string;
  password?: string;
  role?: string;
}

export interface UserUpdateResponse {
  id: string;
  username: string;
  name: string;
  role: string;
  updatedAt: string;
}

export interface UserDeleteResponse {
  success: boolean;
  message: string;
  deletedAt: string;
}

export interface PatientCreateRequest {
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  dementiaLevel: string;
  triggerElements: string;
  relationship: string;
  memo: string;
}

export interface PatientCreateResponse {
  id: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  dementiaLevel: string;
  triggerElements: string;
  relationship: string;
  memo: string;
  createdAt: string;
}

export interface PatientUpdateRequest {
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  dementiaLevel: string;
  triggerElements: string;
  relationship: string;
  memo: string;
}

export interface PatientUpdateResponse {
  id: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  dementiaLevel: string;
  triggerElements: string;
  relationship: string;
  memo: string;
  updatedAt: string;
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
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers as Record<string, string> || {}),
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
      headers
    });
    if (config.body) {
      console.log('📦 Request Body:', config.body);
    }

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
    // Ensure data is properly structured before serialization
    const requestData = {
      username: String(data.username).trim(),
      password: String(data.password),
      name: String(data.name).trim()
    };

    return this.request<SignupResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }, false);
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
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
      body: JSON.stringify(data),
    });
  }

  async getUserImages(userId: string): Promise<UserImagesResponse> {
    return this.request<UserImagesResponse>(`/api/images/user/${userId}`, {
      method: 'GET',
    });
  }

  async generateReport(data: ReportGenerateRequest): Promise<ReportGenerateResponse> {
    return this.request<ReportGenerateResponse>('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateReportPdf(data: ReportPdfGenerateRequest): Promise<ReportPdfGenerateResponse> {
    return this.request<ReportPdfGenerateResponse>('/api/reports/generate/pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserReports(userId: string): Promise<UserReportsResponse> {
    return this.request<UserReportsResponse>(`/api/reports/user/${userId}`, {
      method: 'GET',
    });
  }

  async getUserInfo(userId: string): Promise<UserInfo> {
    return this.request<UserInfo>(`/api/users/${userId}`, {
      method: 'GET',
    });
  }

  async updateUser(userId: string, data: UserUpdateRequest): Promise<UserUpdateResponse> {
    return this.request<UserUpdateResponse>(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string): Promise<UserDeleteResponse> {
    return this.request<UserDeleteResponse>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async createPatient(userId: string, data: PatientCreateRequest): Promise<PatientCreateResponse> {
    return this.request<PatientCreateResponse>(`/api/users/${userId}/info`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePatient(userId: string, _patientId: string, data: PatientUpdateRequest): Promise<PatientUpdateResponse> {
    return this.request<PatientUpdateResponse>(`/api/users/${userId}/info`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePatient(userId: string, _patientId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/users/${userId}/info`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);