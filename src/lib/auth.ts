export interface TokenInfo {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number;
}

export class AuthTokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'accessToken';
  private static readonly REFRESH_TOKEN_KEY = 'refreshToken';
  private static readonly TOKEN_TYPE_KEY = 'tokenType';
  private static readonly EXPIRES_IN_KEY = 'expiresIn';
  private static readonly EXPIRES_AT_KEY = 'expiresAt';

  static setTokens(tokenData: {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
  }): void {
    const expiresAt = Date.now() + (tokenData.expiresIn * 1000);

    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokenData.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokenData.refreshToken);
    localStorage.setItem(this.TOKEN_TYPE_KEY, tokenData.tokenType);
    localStorage.setItem(this.EXPIRES_IN_KEY, tokenData.expiresIn.toString());
    localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toString());
  }

  static getTokens(): TokenInfo | null {
    const accessToken = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const tokenType = localStorage.getItem(this.TOKEN_TYPE_KEY);
    const expiresIn = localStorage.getItem(this.EXPIRES_IN_KEY);
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);

    if (!accessToken || !refreshToken || !tokenType || !expiresIn || !expiresAt) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      tokenType,
      expiresIn: parseInt(expiresIn),
      expiresAt: parseInt(expiresAt),
    };
  }

  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static isTokenValid(): boolean {
    const tokens = this.getTokens();
    if (!tokens) return false;

    // Check if token is expired (with 5 minute buffer)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return tokens.expiresAt > (now + bufferTime);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_TYPE_KEY);
    localStorage.removeItem(this.EXPIRES_IN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
  }

  static getAuthorizationHeader(): string | null {
    const tokens = this.getTokens();
    if (!tokens || !this.isTokenValid()) {
      return null;
    }
    return `${tokens.tokenType} ${tokens.accessToken}`;
  }
}

// JWT token decoder utility
export function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Get user info from JWT token
export function getUserInfoFromToken(token: string): {
  uid: string;
  sub: string;
  role: string;
  exp: number;
  iat: number;
} | null {
  const payload = decodeJWT(token);
  if (!payload) return null;

  return {
    uid: payload.uid,
    sub: payload.sub,
    role: payload.role,
    exp: payload.exp,
    iat: payload.iat,
  };
}

// Auto-refresh token functionality
export async function refreshTokenIfNeeded(): Promise<boolean> {
  const tokens = AuthTokenManager.getTokens();
  if (!tokens) return false;

  // If token is still valid, no need to refresh
  if (AuthTokenManager.isTokenValid()) return true;

  try {
    // Import here to avoid circular dependency
    const { apiClient } = await import('./api');

    const response = await apiClient.refreshToken(tokens.refreshToken);
    AuthTokenManager.setTokens(response);
    return true;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    AuthTokenManager.clearTokens();
    return false;
  }
}