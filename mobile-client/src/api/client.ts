const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8081';

import { getStoredTokens, setStoredTokens, clearStoredTokens, isTokenExpired } from '../auth/storage';
import { refreshAccessToken } from '../auth/keycloak';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

// Event emitter for auth state changes
type AuthEventListener = () => void;
const authEventListeners: AuthEventListener[] = [];

export function onSessionExpired(listener: AuthEventListener): () => void {
  authEventListeners.push(listener);
  return () => {
    const index = authEventListeners.indexOf(listener);
    if (index > -1) {
      authEventListeners.splice(index, 1);
    }
  };
}

function notifySessionExpired(): void {
  authEventListeners.forEach((listener) => listener());
}

export const apiClient = {
  baseUrl: API_BASE_URL,

  async getValidToken(): Promise<string | null> {
    const tokens = await getStoredTokens();
    if (!tokens) return null;

    // Add buffer time (30 seconds) to refresh before actual expiry
    const bufferMs = 30 * 1000;
    if (isTokenExpired(tokens.expiresAt, bufferMs)) {
      try {
        const newTokens = await refreshAccessToken(tokens.refreshToken);
        await setStoredTokens(
          newTokens.accessToken,
          newTokens.refreshToken,
          newTokens.expiresIn
        );
        return newTokens.accessToken;
      } catch {
        // Refresh failed, clear tokens and notify
        await clearStoredTokens();
        notifySessionExpired();
        return null;
      }
    }

    return tokens.accessToken;
  },

  async request<T>(path: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const token = await this.getValidToken();

    if (!token) {
      throw new AuthenticationError('Not authenticated');
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Try to refresh token once
      if (retryCount < 1) {
        const tokens = await getStoredTokens();
        if (tokens?.refreshToken) {
          try {
            const newTokens = await refreshAccessToken(tokens.refreshToken);
            await setStoredTokens(
              newTokens.accessToken,
              newTokens.refreshToken,
              newTokens.expiresIn
            );
            // Retry the request with new token
            return this.request<T>(path, options, retryCount + 1);
          } catch {
            // Refresh failed
          }
        }
      }
      
      // Clear tokens and notify session expired
      await clearStoredTokens();
      notifySessionExpired();
      throw new SessionExpiredError();
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Request failed (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as T;
  },
};
