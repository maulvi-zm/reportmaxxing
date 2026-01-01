import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function exchangeCredentialsForToken(
  email: string,
  password: string
): Promise<string> {
  // Replace with a real auth request to your backend.
  if (!email || !password) {
    throw new Error('Missing credentials');
  }
  return 'mock.jwt.token';
}
