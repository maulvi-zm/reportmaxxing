import { useEffect } from 'react';
import { Link, Stack, useRouter } from 'expo-router';
import { Alert, Pressable, Text } from 'react-native';
import { onSessionExpired } from '../src/api/client';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Listen for session expiry events from the API client
    const unsubscribe = onSessionExpired(() => {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { fontWeight: '600' },
        headerTintColor: '#0f172a',
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: false }} />
      <Stack.Screen
        name="index"
        options={{
          title: 'My Reports',
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => (
            <Link href="/profile" asChild>
              <Pressable style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: '#0f766e', fontWeight: '600' }}>Profile</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen
        name="create-report"
        options={{ title: 'New Report' }}
      />
      <Stack.Screen
        name="reports/[id]"
        options={{ title: 'Report Details' }}
      />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
