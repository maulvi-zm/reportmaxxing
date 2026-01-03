import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginWithCredentials } from '../auth/keycloak';
import { setStoredTokens } from '../auth/storage';

export function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const tokens = await loginWithCredentials(email.trim(), password);
      await setStoredTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
      router.replace('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Reportmaxxing</Text>
          <Text style={styles.subtitle}>Sign in to submit and track reports</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#94a3b8"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            placeholderTextColor="#94a3b8"
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>
          
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </KeyboardAvoidingView>
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  errorText: { marginTop: 12, color: '#b91c1c', fontSize: 12, textAlign: 'center' },
});
