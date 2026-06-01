import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { fetchGrokPulse, GrokPulseResponse } from '../../src/services/grokService';
import SentimentGauge from './SentimentGauge';
import SignalCard from './SignalCard';
import VelocityTracker from './VelocityTracker';
import { MaterialIcons } from '@expo/vector-icons';
import { t } from '@/i18n';

interface GrokPulseProps {
  symbol: string;
}

const normalizeConfidence = (confidence: number | string): number => {
  if (typeof confidence === 'number') {
    return confidence;
  }
  if (typeof confidence === 'string') {
    switch (confidence.toLowerCase()) {
      case 'high': return 0.9;
      case 'medium': return 0.7;
      case 'low': return 0.4;
      default: return 0;
    }
  }
  return 0;
};

// Patobulintas teksto formatavimo komponentas
const FormattedText = ({ text, style, variant = 'body' }: {
  text: string;
  style?: any;
  variant?: 'body' | 'title' | 'caption'
}) => {
  // Tekstas suskaidomas pagal punktus ir kiekviena dalis formatuojama
  const formatTextContent = (content: string) => {
    // Tvarkomi skirtingi punktų formatai
    const bulletRegex = /^[•\-\*]\s*/;
    const lines = content.split('\n').filter(line => line.trim());

    return lines.map((line, index) => {
      const trimmedLine = line.trim();

      // Patikrinama, ar tai punktas
      if (bulletRegex.test(trimmedLine)) {
        const bulletText = trimmedLine.replace(bulletRegex, '');
        return (
          <View key={index} style={styles.bulletContainer}>
            <View style={styles.bulletDot} />
            <Text style={[style, styles.bulletText, getVariantStyle(variant)]}>
              {formatInlineText(bulletText)}
            </Text>
          </View>
        );
      }
      
      // Įprasta eilutė
      return (
        <Text key={index} style={[style, getVariantStyle(variant), { marginBottom: 6 }]}>
          {formatInlineText(trimmedLine)}
        </Text>
      );
    });
  };

  // Formatuojamas tekstas eilutės viduje (paryškinimas ir kt.)
  const formatInlineText = (text: string) => {
    // Skaidoma pagal markdown stiliaus paryškinimą (**text**) ir taip pat aptinkami svarbūs finansiniai terminai
    const parts = text.split(/(\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} style={[style, { fontWeight: 'bold', color: '#FFFFFF' }]}>
            {boldText}
          </Text>
        );
      }
      
      // Automatiškai paryškinami svarbūs finansiniai terminai ir reikšmės
      const keyTermsRegex = /(\$[\d,]+\.?\d*|[\d,]+\.?\d*%|[\d,]+\.?\d*[KMB]?|\b(?:bullish|bearish|resistance|support|breakout|breakdown|volume|price|market cap|funding rate|open interest|liquidation|whale|pump|dump|rally|correction|volatility|momentum|trend|uptrend|downtrend|buy|sell|long|short|calls|puts|strike|expiry|ATH|ATL|DCA|HODL|FOMO|FUD)\b)/gi;

      const subParts = part.split(keyTermsRegex);
      return subParts.map((subPart, subIndex) => {
        if (keyTermsRegex.test(subPart)) {
          return (
            <Text key={`${index}-${subIndex}`} style={[style, { fontWeight: 'bold', color: '#58A6FF' }]}>
              {subPart}
            </Text>
          );
        }
        return <Text key={`${index}-${subIndex}`}>{subPart}</Text>;
      });
    });
  };

  const getVariantStyle = (variant: string) => {
    switch (variant) {
      case 'title':
        return styles.titleText;
      case 'caption':
        return styles.captionText;
      default:
        return styles.bodyText;
    }
  };

  return <View>{formatTextContent(text)}</View>;
};

const SummarySection: React.FC<{ summary: GrokPulseResponse['summary'] }> = ({ summary }) => (
  <View style={styles.summaryContainer}>
    <View style={styles.overviewSection}>
      <View style={styles.sectionHeaderRow}>
        <MaterialIcons name="insights" size={20} color="#58A6FF" />
        <Text style={styles.sectionTitle}>{t('grok.summary.marketOverview')}</Text>
      </View>
      <FormattedText 
        text={summary.overview} 
        style={styles.summaryOverview}
        variant="body"
      />
    </View>

    <View style={styles.recommendationBox}>
      <View style={styles.sectionHeaderRow}>
        <MaterialIcons name="lightbulb-outline" size={18} color="#FFC107" />
        <Text style={styles.recommendationTitle}>{t('grok.summary.aiRecommendation')}</Text>
      </View>
      <FormattedText 
        text={summary.recommendation} 
        style={styles.recommendationText}
        variant="body"
      />
    </View>

    <View style={styles.contextBox}>
      <View style={styles.sectionHeaderRow}>
        <MaterialIcons name="info-outline" size={18} color="#8B949E" />
        <Text style={styles.contextTitle}>{t('grok.summary.marketContext')}</Text>
      </View>
      <FormattedText 
        text={summary.marketContext} 
        style={styles.contextText}
        variant="caption"
      />
    </View>
  </View>
);

const GrokPulse: React.FC<GrokPulseProps> = ({ symbol }) => {
  const [data, setData] = useState<GrokPulseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchGrokPulse(symbol);
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : t('common.unknownError');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [symbol]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{t('grok.pulse.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <MaterialIcons name="error-outline" size={48} color="#F44336" />
        <Text style={styles.errorTitle}>{t('grok.pulse.errorTitle')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>{t('grok.pulse.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  // Vieno signalo tipas
  type Signal = GrokPulseResponse['signals'][0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('grok.pulse.title')}</Text>
        <TouchableOpacity onPress={fetchData} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#007AFF" /> : <MaterialIcons name="refresh" size={24} color="#007AFF" />}
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.sentimentContainer}>
            <SentimentGauge sentiment={data.sentiment.value} confidence={normalizeConfidence(data.sentiment.confidence)} />
          </View>
          <View style={styles.velocityContainer}>
            <VelocityTracker 
              level={data.mentionVelocity.rate.toLowerCase() as 'high' | 'medium' | 'low'} 
              trend={data.mentionVelocity.trend.toLowerCase() as 'increasing' | 'decreasing' | 'stable'} 
            />
          </View>
        </View>

        {data.summary && <SummarySection summary={data.summary} />}

        <View style={styles.horizontalRule} />

        {data.signals.length > 0 && <Text style={styles.signalsTitle}>{t('grok.pulse.topSignals')}</Text>}
        {data.signals.map((signal: Signal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    display: 'none', // Paslepiama antraštė, nes ją dabar tvarko tėvinis komponentas
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    color: '#8B949E',
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    color: '#AEAEB2',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    paddingBottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#21262D',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  sentimentContainer: {
    marginRight: 16,
  },
  velocityContainer: {
    flex: 1,
  },
  summaryContainer: {
    backgroundColor: '#21262D',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  summaryText: {
    color: '#E5E5EA',
    fontSize: 16,
    marginBottom: 8,
  },
  signalsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 0,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  summaryOverview: {
    color: '#C9D1D9',
    fontSize: 15,
    lineHeight: 22,
  },
  recommendationBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  recommendationText: {
    color: '#C9D1D9',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  contextBox: {
    backgroundColor: 'rgba(139, 148, 158, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B949E',
  },
  contextText: {
    color: '#8B949E',
    fontSize: 13,
    lineHeight: 18,
  },
  horizontalRule: {
      borderBottomColor: '#3A3A3C',
      borderBottomWidth: 1,
      width: '90%',
      marginVertical: 10,
  },
  overviewSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#58A6FF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  recommendationTitle: {
    color: '#FFC107',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  contextTitle: {
    color: '#8B949E',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  bulletText: {
    color: '#FFFFFF',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  captionText: {
    color: '#AEAEB2',
    fontSize: 13,
  },
  bodyText: {
    color: '#E5E5EA',
    fontSize: 15,
  },
});

export default GrokPulse; 
