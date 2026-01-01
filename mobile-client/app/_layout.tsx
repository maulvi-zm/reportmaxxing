import { Link, Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';

export default function RootLayout() {
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
        options={{ title: 'New Report', headerBackTitleVisible: false }}
      />
      <Stack.Screen
        name="reports/[id]"
        options={{ title: 'Report Details', headerBackTitleVisible: false }}
      />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
