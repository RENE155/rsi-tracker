import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GrokPulseResponse } from '../../src/services/grokService';
import { t } from '@/i18n';

type MentionVelocity = GrokPulseResponse['mentionVelocity'];

interface VelocityTrackerProps {
  level: 'high' | 'medium' | 'low';
  trend: 'increasing' | 'decreasing' | 'stable';
}

const getLevelDetails = (level: VelocityTrackerProps['level']) => {
  switch (level) {
    case 'high':
      return { icon: 'whatshot', color: '#F44336', label: t('velocity.level.high') };
    case 'medium':
      return { icon: 'local-fire-department', color: '#FF9800', label: t('velocity.level.medium') };
    case 'low':
      return { icon: 'ac-unit', color: '#00BCD4', label: t('velocity.level.low') };
    default:
      return { icon: 'help-outline', color: '#9E9E9E', label: t('velocity.level.unknown') };
  }
};

const getTrendDetails = (trend: VelocityTrackerProps['trend']) => {
  switch (trend) {
    case 'increasing':
      return { icon: 'trending-up', color: '#4CAF50', label: t('velocity.trend.increasing') };
    case 'decreasing':
      return { icon: 'trending-down', color: '#F44336', label: t('velocity.trend.decreasing') };
    case 'stable':
      return { icon: 'trending-flat', color: '#FFC107', label: t('velocity.trend.stable') };
    default:
      return { icon: 'help-outline', color: '#9E9E9E', label: t('velocity.trend.unknown') };
  }
};

const VelocityTracker: React.FC<VelocityTrackerProps> = ({ level, trend }) => {
  const levelDetails = getLevelDetails(level);
  const trendDetails = getTrendDetails(trend);

  return (
    <View style={styles.container}>
      <View style={styles.metricContainer}>
        <Text style={styles.label}>{t('velocity.labels.mentions')}</Text>
        <View style={styles.metric}>
          <MaterialIcons name={levelDetails.icon as any} size={24} color={levelDetails.color} />
          <Text style={[styles.metricText, { color: levelDetails.color }]}>{levelDetails.label}</Text>
        </View>
      </View>
      <View style={styles.separator} />
      <View style={styles.metricContainer}>
        <Text style={styles.label}>{t('velocity.labels.velocity')}</Text>
        <View style={styles.metric}>
          <MaterialIcons name={trendDetails.icon as any} size={24} color={trendDetails.color} />
          <Text style={[styles.metricText, { color: trendDetails.color }]}>{trendDetails.label}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: '#1C1C1E',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  metricContainer: {
    alignItems: 'center',
  },
  label: {
    color: '#8A8A8E',
    fontSize: 12,
    marginBottom: 4,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: '#3A3A3C',
    marginVertical: 8,
  },
});

export default VelocityTracker;
