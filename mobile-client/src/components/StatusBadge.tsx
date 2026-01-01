import { StyleSheet, Text, View } from 'react-native';
import { ReportStatus } from '../types/report';

const STATUS_STYLES: Record<ReportStatus, { label: string; color: string; background: string }> = {
  OPEN: { label: 'Open', color: '#1d4ed8', background: '#dbeafe' },
  IN_PROGRESS: { label: 'In Progress', color: '#b45309', background: '#fef3c7' },
  RESOLVED: { label: 'Resolved', color: '#047857', background: '#d1fae5' },
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const stylesForStatus = STATUS_STYLES[status];

  return (
    <View style={[styles.container, { backgroundColor: stylesForStatus.background }]}> 
      <View style={[styles.dot, { backgroundColor: stylesForStatus.color }]} />
      <Text style={[styles.label, { color: stylesForStatus.color }]}>{stylesForStatus.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
