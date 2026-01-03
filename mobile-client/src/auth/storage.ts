import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ID_TOKEN_KEY = 'id_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const [accessToken, refreshToken, idToken, expiresAt] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.getItemAsync(ID_TOKEN_KEY),
    SecureStore.getItemAsync(TOKEN_EXPIRY_KEY),
  ]);

  if (!accessToken || !refreshToken || !expiresAt) return null;

  return {
    accessToken,
    refreshToken,
    idToken: idToken ?? '',
    expiresAt: parseInt(expiresAt, 10),
  };
}

export async function setStoredTokens(
  accessToken: string,
  refreshToken: string,
  idToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = Date.now() + expiresIn * 1000;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    SecureStore.setItemAsync(ID_TOKEN_KEY, idToken),
    SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiresAt.toString()),
  ]);
}

export async function clearStoredTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(ID_TOKEN_KEY),
    SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
  ]);
}

export function isTokenExpired(expiresAt: number, bufferMs: number = 60000): boolean {
  return Date.now() >= expiresAt - bufferMs;
}

export async function getStoredToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  return tokens?.accessToken ?? null;
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await clearStoredTokens();
}
