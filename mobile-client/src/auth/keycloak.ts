import * as AuthSession from 'expo-auth-session';

const KEYCLOAK_URL = process.env.EXPO_PUBLIC_KEYCLOAK_URL ?? 'http://localhost:8080';
const REALM = 'reportmaxxing';
const CLIENT_ID = 'mobile-app';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth`,
  tokenEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
  revocationEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/revoke`,
  endSessionEndpoint: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
};

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login with username/password using Keycloak's token endpoint
 * Uses Resource Owner Password Credentials (ROPC) grant type
 */
export async function loginWithCredentials(
  username: string,
  password: string
): Promise<TokenResponse> {
  const response = await fetch(discovery.tokenEndpoint!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: CLIENT_ID,
      username,
      password,
      scope: 'openid profile email',
    }).toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Login failed');
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? '',
    expiresIn: data.expires_in ?? 900,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(discovery.tokenEndpoint!, {
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
    expiresIn: data.expires_in ?? 900,
  };
}

/**
 * Logout by revoking the refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    await fetch(discovery.revocationEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }).toString(),
    });
  } catch {
    // Revocation is best-effort
  }
}

export function getKeycloakConfig() {
  return {
    url: KEYCLOAK_URL,
    realm: REALM,
    clientId: CLIENT_ID,
  };
}
