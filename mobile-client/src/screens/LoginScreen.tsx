import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useKeycloakAuth, exchangeCodeForToken } from '../auth/keycloak';
import { setStoredTokens } from '../auth/storage';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);

  const { request, response, promptAsync, isLoading, redirectUri } = useKeycloakAuth();

  useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      handleCodeExchange(response.params.code);
    } else if (response?.type === 'error') {
      setError(response.params.error_description || 'Authentication failed');
    } else if (response?.type === 'dismiss') {
      setError('Authentication was cancelled');
    }
  }, [response]);

  const handleCodeExchange = async (code: string) => {
    if (!request?.codeVerifier) {
      setError('Missing code verifier');
      return;
    }

    setExchanging(true);
    setError(null);

    try {
      const tokens = await exchangeCodeForToken(
        code,
        request.codeVerifier,
        redirectUri
      );

      await setStoredTokens(
        tokens.accessToken,
        tokens.refreshToken,
        tokens.idToken,
        tokens.expiresIn
      );

      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete login');
    } finally {
      setExchanging(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    await promptAsync();
  };

  const isButtonDisabled = isLoading || exchanging;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Reportmaxxing</Text>
          <Text style={styles.subtitle}>Sign in to submit and track reports</Text>
        </View>

        <View style={styles.card}>
          <Pressable
            style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isButtonDisabled}
          >
            {isButtonDisabled ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in with Keycloak</Text>
            )}
          </Pressable>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={styles.hint}>
            You will be redirected to Keycloak to sign in securely.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 6 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  errorText: { marginTop: 12, color: '#b91c1c', fontSize: 12, textAlign: 'center' },
  hint: { marginTop: 16, fontSize: 12, color: '#64748b', textAlign: 'center' },
});
