import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GrokPulseResponse } from '../../src/services/grokService';
import { t } from '@/i18n';

type Signal = GrokPulseResponse['signals'][0];

interface SignalCardProps {
  signal: Signal;
}

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

const getCategoryStyle = (category: Signal['category']) => {
  switch (category) {
    case 'TA':
      return { icon: 'analytics', color: '#FF9800', label: t('grok.categories.technical') };
    case 'News':
      return { icon: 'article', color: '#2196F3', label: t('grok.categories.news') };
    case 'Whale':
      return { icon: 'waves', color: '#00BCD4', label: t('grok.categories.whale') };
    case 'Influencer':
      return { icon: 'person', color: '#9C27B0', label: t('grok.categories.influencer') };
    default:
      return { icon: 'info-outline', color: '#9E9E9E', label: t('grok.categories.general') };
  }
};



const SignalCard: React.FC<SignalCardProps> = ({ signal }) => {
  const { icon, color, label } = getCategoryStyle(signal.category);
  const [modalVisible, setModalVisible] = useState(false);

  const openSource = () => {
    if (signal.source?.url) {
      Linking.openURL(signal.source.url).catch(err => console.error("Couldn't load page", err));
    }
  };
  
  return (
    <>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(!modalVisible)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: color }]}>
                <MaterialIcons name={icon as any} size={20} color="#FFFFFF" />
              </View>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{signal.title}</Text>
                <Text style={styles.modalSubtitle}>
                  {t('grok.signalCard.by', { author: signal.source.author })}
                </Text>
              </View>
            </View>
            
            <View style={styles.modalContentContainer}>
              <Text style={styles.modalSectionTitle}>{t('grok.signalCard.originalPost')}</Text>
              <FormattedText 
                text={signal.source.content || t('grok.signalCard.noContent')} 
                style={styles.modalText}
                variant="body"
              />
            </View>
            
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: color }]} onPress={openSource}>
              <Text style={styles.modalButtonText}>{t('grok.signalCard.viewOnX')}</Text>
              <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <TouchableOpacity 
        style={[styles.container, { borderLeftColor: color, borderLeftWidth: 4 }]} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: color }]}>
            <MaterialIcons name={icon as any} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{signal.title}</Text>
            <Text style={styles.categoryLabel}>{label}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#8B949E" />
        </View>

        <View style={styles.descriptionContainer}>
          <FormattedText 
            text={signal.description} 
            style={styles.description}
            variant="body"
          />
        </View>

        <View style={styles.implicationSection}>
          <View style={styles.implicationHeader}>
            <MaterialIcons name="lightbulb-outline" size={18} color="#FFC107" />
            <Text style={styles.implicationTitle}>{t('grok.signalCard.marketImplication')}</Text>
          </View>
          <FormattedText 
            text={signal.implication} 
            style={styles.implicationText}
            variant="body"
          />
        </View>

        {signal.source?.author && (
          <View style={styles.sourceInfo}>
            <MaterialIcons name="person-outline" size={16} color="#8B949E" />
            <Text style={styles.sourceText}>
              {t('grok.signalCard.source', { author: signal.source.author })}
            </Text>
            <MaterialIcons name="open-in-new" size={14} color="#8B949E" style={{ marginLeft: 'auto' }} />
          </View>
        )}
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 0,
    backgroundColor: '#21262D',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#30363D',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2D333B',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    lineHeight: 20,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#8B949E',
    fontWeight: '500',
  },
  descriptionContainer: {
    padding: 16,
    paddingTop: 12,
  },
  description: {
    color: '#C9D1D9',
    fontSize: 15,
    lineHeight: 22,
  },
  implicationSection: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: 'rgba(255, 193, 7, 0.05)',
    borderTopWidth: 1,
    borderTopColor: '#30363D',
  },
  implicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  implicationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFC107',
    marginLeft: 6,
  },
  implicationText: {
    color: '#E5E5EA',
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 8,
    backgroundColor: '#161B22',
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  sourceText: {
    fontSize: 12,
    color: '#8B949E',
    marginLeft: 6,
    flex: 1,
  },
  
  // Teksto formatavimo stiliai
  bulletContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#58A6FF',
    marginTop: 8,
    marginRight: 12,
    minWidth: 4,
  },
  bulletText: {
    flex: 1,
    lineHeight: 20,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 14,
    color: '#C9D1D9',
    lineHeight: 20,
  },
  captionText: {
    fontSize: 12,
    color: '#8B949E',
    lineHeight: 16,
  },

  // Modal stiliai
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalView: {
    margin: 20,
    backgroundColor: '#21262D',
    borderRadius: 16,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#30363D',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2D333B',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8B949E',
  },
  modalContentContainer: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#58A6FF',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#C9D1D9',
    lineHeight: 22,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginRight: 8,
  },
});

export default SignalCard; 
