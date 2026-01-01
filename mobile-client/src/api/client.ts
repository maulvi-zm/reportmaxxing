const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

import { getStoredToken } from '../auth/storage';

const MOCK_JWT = 'mock.jwt.token';
let authToken: string | null = null;

export const apiClient = {
  baseUrl: API_BASE_URL,
  async getAuthToken() {
    if (authToken) {
      return authToken;
    }
    const storedToken = await getStoredToken();
    authToken = storedToken;
    return storedToken;
  },
  setAuthToken(token: string) {
    authToken = token;
  },
  clearAuthToken() {
    authToken = null;
  },
  async request<T>(path: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    const token = (await this.getAuthToken()) ?? MOCK_JWT;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    return (await response.json()) as T;
  },
};
