import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:8080';
const REALM = 'reportmaxxing';
const CLIENT_ID = 'mobile-app';

const issuer = `${KEYCLOAK_URL}/realms/${REALM}`;

export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri();
}

export function useKeycloakAuth() {
  const redirectUri = getRedirectUri();
  const discoveryDoc = AuthSession.useAutoDiscovery(issuer);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    discoveryDoc
  );

  return {
    request,
    response,
    promptAsync,
    isLoading: !request || !discoveryDoc,
    redirectUri,
  };
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResponse> {
  const tokenEndpoint = `${issuer}/protocol/openid-connect/token`;

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    idToken: data.id_token ?? '',
    expiresIn: data.expires_in ?? 900,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const tokenEndpoint = `${issuer}/protocol/openid-connect/token`;

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token refresh failed');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    idToken: data.id_token ?? '',
    expiresIn: data.expires_in ?? 900,
  };
}

export async function logoutWithBrowser(idToken: string): Promise<void> {
  const redirectUri = getRedirectUri();
  const endSessionEndpoint = `${issuer}/protocol/openid-connect/logout`;

  const logoutUrl = `${endSessionEndpoint}?` +
    new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: redirectUri,
      client_id: CLIENT_ID,
    }).toString();

  await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

export function getKeycloakConfig() {
  return {
    url: KEYCLOAK_URL,
    realm: REALM,
    clientId: CLIENT_ID,
  };
}
