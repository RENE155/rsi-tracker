import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { GrokPulseResponse } from '../../src/services/grokService';
import { t } from '@/i18n';

type HistoricalData = GrokPulseResponse['sentiment']['historical'];

interface HistoricalSentimentChartProps {
  data: HistoricalData;
}

const sentimentToValue = (sentiment: 'bullish' | 'bearish' | 'neutral'): number => {
  switch (sentiment) {
    case 'bullish':
      return 1;
    case 'neutral':
      return 0;
    case 'bearish':
      return -1;
    default:
      return 0;
  }
};

const HistoricalSentimentChart: React.FC<HistoricalSentimentChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const chartData = {
    labels: data.map(item => item.time),
    datasets: [
      {
        data: data.map(item => sentimentToValue(item.sentiment)),
        color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: '#1C1C1E',
    backgroundGradientTo: '#1C1C1E',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    strokeWidth: 2,
    useShadows: false,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#007AFF',
    },
    // Etikečių pritaikymas
    formatYLabel: (yLabel: string) => {
      const value = parseFloat(yLabel);
      if (value === 1) return t('sentiment.short.bullish');
      if (value === 0) return t('sentiment.short.neutral');
      if (value === -1) return t('sentiment.short.bearish');
      return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('grok.historical.title')}</Text>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 32} // pagal konteinerio vidinį tarpą
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        yAxisLabel=""
        yAxisSuffix=""
        withInnerLines={false}
        withOuterLines={true}
        yLabelsOffset={-10}
        // Rankiniu būdu nustatomos Y ašies etiketės
        fromZero
        segments={2}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
  },
});

export default HistoricalSentimentChart; 
