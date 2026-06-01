import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { GrokPulseResponse } from '../../src/services/grokService';
import { t } from '@/i18n';

type Sentiment = GrokPulseResponse['sentiment']['value'];

interface SentimentGaugeProps {
  sentiment: Sentiment;
  confidence: number;
}

const getSentimentDetails = (sentiment: Sentiment) => {
  switch (sentiment) {
    case 'bullish':
      return { color: '#4CAF50', label: t('sentiment.bullish') };
    case 'bearish':
      return { color: '#F44336', label: t('sentiment.bearish') };
    case 'neutral':
      return { color: '#FFC107', label: t('sentiment.neutral') };
    default:
      return { color: '#9E9E9E', label: t('sentiment.unknown') };
  }
};

const SentimentGauge: React.FC<SentimentGaugeProps> = ({ sentiment, confidence }) => {
  const { color, label } = getSentimentDetails(sentiment);
  const size = 100;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (confidence * circumference);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          stroke="#3E3E42"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <Circle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <SvgText
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy="0.3em"
          fontSize="18"
          fontWeight="bold"
          fill={color}
        >
          {`${(confidence * 100).toFixed(0)}%`}
        </SvgText>
      </Svg>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  label: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SentimentGauge; 
