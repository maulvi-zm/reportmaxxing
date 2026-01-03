import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { reportsApi } from '../api/reports';
import { Report } from '../types/report';
import { ReportCard } from '../components/ReportCard';
import { AuthenticationError } from '../api/client';
import { clearStoredTokens } from '../auth/storage';

const tabs = ['All', 'My Reports', 'Open', 'Resolved'] as const;
type TabKey = (typeof tabs)[number];

export function HomeScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      setError(null);
      const data = await reportsApi.getAllReports();
      setReports(data);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        // Session expired - will be handled by global listener
        await clearStoredTokens();
        router.replace('/login');
        return;
      }
      setError('Unable to load reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const publicReports = reports.filter((report) => report.visibility !== 'PRIVATE');
    const myReports = reports.filter((report) => report.isMine);

    switch (activeTab) {
      case 'All':
        return publicReports;
      case 'My Reports':
        return myReports;
      case 'Open':
        return publicReports.filter(
          (report) => report.status === 'OPEN' || report.status === 'IN_PROGRESS'
        );
      case 'Resolved':
        return publicReports.filter((report) => report.status === 'RESOLVED');
      default:
        return publicReports;
    }
  }, [activeTab, reports]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Reports</Text>
          <Text style={styles.subtitle}>Track issues across the city.</Text>
        </View>
        <Text style={styles.count}>{filteredReports.length}</Text>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const selected = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabPill, selected && styles.tabPillActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              onPress={() => router.push(`/reports/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>No reports</Text>
              <Text style={styles.emptyText}>Try a different tab or create a report.</Text>
            </View>
          }
        />
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.fabContainer} onPress={() => router.push('/create-report')}>
        <Text style={styles.fabLabel}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f766e',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  tabPillActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#0f172a',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  error: {
    textAlign: 'center',
    color: '#b91c1c',
    paddingBottom: 12,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f766e',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabLabel: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '600',
  },
});
