import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logoutWithBrowser } from '../auth/keycloak';
import { getStoredTokens, clearStoredTokens } from '../auth/storage';
import { fetchProfile, UserProfile } from '../api/profile';

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  CITIZEN: 'Citizen',
  DEPARTMENT_STAFF: 'Department Staff',
};

export function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProfile();
      setProfile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load profile';
      setError(message);
      
      // If session expired, redirect to login
      if (message === 'Session expired' || message === 'Not authenticated') {
        await clearStoredTokens();
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            const tokens = await getStoredTokens();
            if (tokens?.idToken) {
              await logoutWithBrowser(tokens.idToken);
            }
          } catch {
          } finally {
            await clearStoredTokens();
            router.replace('/login');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return <SafeAreaView style={styles.safeArea} />;
  }

  const displayName = profile.name || profile.email.split('@')[0];
  const roleDisplay = ROLE_DISPLAY_NAMES[profile.role] || profile.role;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{roleDisplay}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>User ID</Text>
          <Text style={[styles.value, styles.userId]}>{profile.id.slice(0, 8)}...</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.open_reports}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.resolved_reports}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
      </View>

      <Pressable style={styles.refreshButton} onPress={loadProfile}>
        <Text style={styles.refreshText}>Refresh Profile</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f766e',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  email: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 18,
    marginHorizontal: 20,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  userId: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  refreshButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    marginHorizontal: 20,
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  logoutText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '600',
  },
});
