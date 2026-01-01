import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { reportsApi } from '../api/reports';
import { Report } from '../types/report';
import { StatusBadge } from '../components/StatusBadge';

const visibilityLabels: Record<Report['visibility'], string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Private',
  ANONYMOUS: 'Anonymous',
};

export function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reportId = Array.isArray(id) ? id[0] : id ?? '';

  useEffect(() => {
    const loadReport = async () => {
      try {
        setError(null);
        const data = await reportsApi.getReportById(reportId);
        setReport(data);
      } catch (err) {
        setError('Unable to load report.');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#0f766e" />
      </SafeAreaView>
    );
  }

  if (error || !report) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.error}>{error ?? 'Report not found.'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <StatusBadge status={report.status} />
          <Text style={styles.reportId}>{report.id}</Text>
        </View>

        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.meta}>
          {report.category} • {visibilityLabels[report.visibility]} • {new Date(report.createdAt).toLocaleString()}
        </Text>

        {report.imageUri ? (
          <Image source={{ uri: report.imageUri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No photo attached</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionBody}>{report.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Timeline</Text>
          {report.updates.map((update, index) => (
            <View key={`${update.title}-${index}`} style={styles.timelineRow}>
              <View style={[styles.timelineDot, update.active && styles.timelineDotActive]} />
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineTitle, update.active && styles.timelineTitleActive]}>
                  {update.title}
                </Text>
                <Text style={styles.timelineDate}>{update.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#b91c1c',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportId: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  placeholder: {
    height: 200,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    color: '#64748b',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginTop: 4,
    marginRight: 10,
  },
  timelineDotActive: {
    backgroundColor: '#0f766e',
    borderColor: '#ccfbf1',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  timelineTitleActive: {
    color: '#0f172a',
  },
  timelineDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
