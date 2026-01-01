import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Report } from '../types/report';
import { StatusBadge } from './StatusBadge';

const visibilityLabels: Record<Report['visibility'], string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Private',
  ANONYMOUS: 'Anonymous',
};

export function ReportCard({
  report,
  onPress,
}: {
  report: Report;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.header}>
        <StatusBadge status={report.status} />
        <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.title}>{report.title}</Text>
      <Text style={styles.meta}>{report.category} • {visibilityLabels[report.visibility]}</Text>
      <Text numberOfLines={2} style={styles.description}>{report.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#64748b',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#334155',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});
