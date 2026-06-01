import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { fetchGrokAnalysis } from '../../../src/services/grokService';
import GrokPulse from '../../../components/grok/GrokPulse';
import { MaterialIcons } from '@expo/vector-icons';
import { t } from '@/i18n';
import {
  fetchBybitTicker, fetchBybitOpenInterest,
  fetchBybitFundingHistory, fetchBybitLongShortRatio,
  fetchBybitLiquidations,
  BybitTicker, BybitOpenInterestData, BybitOpenInterestEntry,
  BybitFundingRateEntry, BybitLongShortRatioEntry,
  BybitLiquidationEntry
} from '../../../src/services/bybitService';

const screenWidth = Dimensions.get("window").width;

// Komponentas suformatuotam tekstui atvaizduoti su markdown stiliaus paryškinimo palaikymu
const FormattedText = ({ text, style }: { text: string; style: any }) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return (
            <Text key={index} style={[style, { fontWeight: 'bold', color: '#FFFFFF' }]}>
              {boldText}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};

// Komponentas struktūrizuotai Grok analizei išanalizuoti ir parodyti
const StructuredAnalysis = ({ analysis }: { analysis: string }) => {
  const sections = [
    { key: 'Overview', title: 'Overview', icon: 'info-outline', color: '#58A6FF' },
    { key: 'Price Performance', title: 'Price Performance', icon: 'trending-up', color: '#4CAF50' },
    { key: 'Technical Analysis', title: 'Technical Analysis', icon: 'analytics', color: '#FF9800' },
    { key: 'Fundamental Analysis', title: 'Fundamental Analysis', icon: 'assessment', color: '#2196F3' },
    { key: 'Market Sentiment', title: 'Market Sentiment', icon: 'sentiment-satisfied', color: '#9C27B0' },
    { key: 'Risks', title: 'Risks', icon: 'warning', color: '#F44336' },
    { key: 'Future Outlook', title: 'Future Outlook', icon: 'visibility', color: '#00BCD4' },
  ];

  const parseSection = (sectionKey: string) => {
    const regex = new RegExp(`${sectionKey.replace('(', '\\(').replace(')', '\\)')}(.*?)(?=\\n\\n|$)`, 's');
    const match = analysis.match(regex);
    if (!match) return null;
    
    const content = match[1].trim();
    const bulletPoints = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('•') || line.startsWith('-'))
      .map(line => line.replace(/^[•-]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return bulletPoints;
  };

  return (
    <View style={styles.structuredAnalysisContainer}>
      {sections.map((section) => {
        const bulletPoints = parseSection(section.key);
        if (!bulletPoints || bulletPoints.length === 0) return null;

        return (
          <View key={section.key} style={[styles.analysisSection, { borderLeftColor: section.color }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name={section.icon as any} size={20} color={section.color} />
              <Text style={[styles.analysisSectionTitle, { color: section.color }]}>
                {section.title}
              </Text>
            </View>
            <View style={styles.sectionContent}>
              {bulletPoints.map((point, index) => (
                <View key={index} style={styles.bulletPoint}>
                  <View style={[styles.bulletDot, { backgroundColor: section.color }]} />
                  <FormattedText 
                    text={point} 
                    style={styles.bulletText}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}
      
      {/* Atsakomybės atsisakymas */}
      {analysis.includes('DISCLAIMER') && (
        <View style={styles.disclaimerSection}>
          <MaterialIcons name="info" size={16} color="#8B949E" />
          <FormattedText 
            text={analysis.match(/DISCLAIMER:(.*?)$/s)?.[1]?.trim() || ''} 
            style={styles.disclaimerText}
          />
        </View>
      )}
    </View>
  );
};

// Pagalbinė funkcija nuotaikos spalvai gauti
const getSentimentColor = (sentiment: 'bullish' | 'bearish' | 'neutral'): string => {
  switch (sentiment) {
    case 'bullish': return '#4CAF50';
    case 'bearish': return '#F44336';
    case 'neutral': return '#FFC107';
    default: return '#9E9E9E';
  }
};

// Pagalbinė funkcija diagramos duomenims suformatuoti
const formatChartData = (data: BybitOpenInterestEntry[]) => {
  if (!data || data.length === 0) {
    return {
      labels: [],
      datasets: [{ data: [] }]
    };
  }
  const sortedData = [...data].sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
  const labels = sortedData.map(item => {
    const date = new Date(parseInt(item.timestamp));
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`; 
  });
  const datasetData = sortedData.map(item => parseFloat(item.openInterest) / 1000000); 
  const maxLabels = 6;
  const step = Math.max(1, Math.floor(labels.length / maxLabels));
  const filteredLabels = labels.filter((_, index) => index % step === 0);
  return {
    labels: filteredLabels.length > 1 ? filteredLabels : labels, 
    datasets: [
      {
        data: datasetData,
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, 
        strokeWidth: 2 
      }
    ],
    legend: [t('stock.chart.legend')] 
  };
};

// Pagalbinė funkcija įžvalgoms apskaičiuoti
const calculateInsights = (
    tickerData: BybitTicker | null, 
    openInterestData: BybitOpenInterestData | null, 
    fundingHistory: BybitFundingRateEntry[] | null,
    longShortRatioHistory: BybitLongShortRatioEntry[] | null,
    liquidations: BybitLiquidationEntry[] | null, 
    symbol: string | undefined
): { label: string, value: string, interpretation?: string, subValue?: string }[] => {
  const insights: { label: string, value: string, interpretation?: string, subValue?: string }[] = [];
  const baseAsset = symbol ? symbol.replace('USDT', '').replace('PERP', '') : 'units'; 

  // Ticker duomenų įžvalgos
  if (tickerData) {
    const high = parseFloat(tickerData.highPrice24h);
    const low = parseFloat(tickerData.lowPrice24h);
    const range = high - low;
    const lastPrice = parseFloat(tickerData.lastPrice);
    insights.push({
      label: "24h Price Range (Volatility)",
      value: `${range.toFixed(2)} (${((range / lastPrice) * 100).toFixed(2)}%)`,
      interpretation: "A wider range indicates higher volatility in the last 24 hours. A narrower range implies lower volatility."
    });
    insights.push({
        label: "Current Open Interest",
        value: `${parseFloat(tickerData.openInterest).toLocaleString()} ${baseAsset}`,
        interpretation: `Open Interest (OI) is the total number of outstanding derivative contracts. For ${symbol}, this value represents the total amount of ${baseAsset} in active contracts. High OI can indicate strong market participation and liquidity.`
    });
    if (tickerData.fundingRate) {
        insights.push({
            label: "Current Funding Rate",
            value: `${(parseFloat(tickerData.fundingRate) * 100).toFixed(4)}%`,
            interpretation: "Positive funding: Longs pay shorts. Negative funding: Shorts pay longs. Typically paid every 8 hours. This rate can indicate short-term directional bias."
        });
    }
  }

  // Open Interest pokyčio įžvalgos
  if (openInterestData && openInterestData.list && openInterestData.list.length > 1) {
    const sortedList = [...openInterestData.list].sort((a,b) => parseInt(a.timestamp) - parseInt(b.timestamp));
    const firstOi = parseFloat(sortedList[0].openInterest);
    const lastOi = parseFloat(sortedList[sortedList.length - 1].openInterest);
    if (firstOi > 0) {
      const change = ((lastOi - firstOi) / firstOi) * 100;
      let oiInterpretation = "Interpreting OI changes often requires context with price movements:\n";
      if (change > 5) { 
        oiInterpretation += "- Strong Rise in OI: Often suggests new money flowing in. If price is also rising, it can confirm an uptrend. If price is falling, it might indicate bears are opening new short positions, potentially fueling a downtrend.";
      } else if (change < -5) { 
        oiInterpretation += "- Strong Fall in OI: Often suggests money flowing out. If price is falling, it can confirm a downtrend as longs close out. If price is rising, it might indicate shorts are covering (rally losing steam or short squeeze).";
      } else if (change > 0) {
        oiInterpretation += "- Modest Rise in OI: Growing interest. Check price action for trend strength.";
      } else {
        oiInterpretation += "- Modest Fall or Flat OI: Indecision or consolidation. Less conviction in current trend.";
      }
      insights.push({
        label: `OI Change (last ${openInterestData.list.length}h)`,
        value: `${change.toFixed(2)}%`,
        interpretation: oiInterpretation
      });
    }
  }

  // Funding istorijos įžvalgos
  if (fundingHistory && fundingHistory.length > 0) {
    const latestFunding = fundingHistory[0]; 
    const avgFundingRate = fundingHistory.reduce((acc, curr) => acc + parseFloat(curr.fundingRate), 0) / fundingHistory.length;
    insights.push({
        label: "Latest Recorded Funding Rate",
        value: `${(parseFloat(latestFunding.fundingRate) * 100).toFixed(4)}% (at ${new Date(parseInt(latestFunding.fundingRateTimestamp)).toLocaleTimeString()})`,
        subValue: `Avg over last ${fundingHistory.length} intervals: ${(avgFundingRate * 100).toFixed(4)}%`,
        interpretation: "Funding rates reflect the cost to hold a position. Consistently high positive rates may indicate bullish sentiment but can also lead to longs being 'squeezed' if price drops. Negative rates suggest bearish sentiment or shorts being squeezed."
    });
  }

  // Long/Short santykio įžvalgos
  if (longShortRatioHistory && longShortRatioHistory.length > 0) {
    const latestRatio = longShortRatioHistory[0]; 
    const longRatioPercent = parseFloat(latestRatio.buyRatio) * 100;
    const shortRatioPercent = parseFloat(latestRatio.sellRatio) * 100;
    let ratioInterpretation = "Long/Short ratio shows the sentiment of retail traders (on Bybit). Extreme ratios can be contrarian indicators.\n";
    if (longRatioPercent > 65) {
        ratioInterpretation += "- Dominantly Long: Majority expects price to rise. If too extreme, could signal a crowded trade, vulnerable to a pullback.";
    } else if (shortRatioPercent > 65) {
        ratioInterpretation += "- Dominantly Short: Majority expects price to fall. If too extreme, could signal a crowded trade, vulnerable to a short squeeze.";
    } else {
        ratioInterpretation += "- Balanced: Sentiment is mixed, no strong directional bias from this metric alone.";
    }
    insights.push({
        label: "Latest Long/Short Ratio (Retail)",
        value: `Longs: ${longRatioPercent.toFixed(2)}% / Shorts: ${shortRatioPercent.toFixed(2)}%`,
        subValue: `(recorded at ${new Date(parseInt(latestRatio.timestamp)).toLocaleTimeString()})`,
        interpretation: ratioInterpretation
    });
  }

  // Likvidavimo įžvalgos
  if (liquidations && liquidations.length > 0) {
    let totalLongsLiqdQty = 0;
    let totalShortsLiqdQty = 0;
    let longLiqCount = 0;
    let shortLiqCount = 0;

    liquidations.forEach(liq => {
      const qty = parseFloat(liq.qty);
      if (liq.side === 'Sell') { // Long pozicijos likvidavimas
        totalLongsLiqdQty += qty;
        longLiqCount++;
      } else if (liq.side === 'Buy') { // Short pozicijos likvidavimas
        totalShortsLiqdQty += qty;
        shortLiqCount++;
      }
    });

    const totalLiqdQty = totalLongsLiqdQty + totalShortsLiqdQty;
    let liqInterpretation = `Recent ${liquidations.length} liquidations recorded. Total Qty: ${totalLiqdQty.toLocaleString()} ${baseAsset}.\n`;

    if (totalLongsLiqdQty > totalShortsLiqdQty * 1.5) {
        liqInterpretation += `- Predominantly Long Liquidations: Suggests recent price drops have forced out long positions. This can sometimes precede a bounce if selling pressure is exhausted, or indicate further weakness if longs continue to capitulate.`;
    } else if (totalShortsLiqdQty > totalLongsLiqdQty * 1.5) {
        liqInterpretation += `- Predominantly Short Liquidations: Suggests recent price spikes have forced out short positions. This can sometimes fuel a rally (short squeeze) or indicate a local top if buying pressure is exhausted.`;
    } else {
        liqInterpretation += `- Mixed Liquidations: Both longs and shorts are being liquidated, indicating volatile, choppy price action rather than a clear directional cascade.`;
    }
    insights.push({
        label: `Recent Liquidations (last ${liquidations.length} events)`,
        value: `Longs Liqd: ${totalLongsLiqdQty.toLocaleString()} ${baseAsset} (${longLiqCount} orders)`,
        subValue: `Shorts Liqd: ${totalShortsLiqdQty.toLocaleString()} ${baseAsset} (${shortLiqCount} orders)`,
        interpretation: liqInterpretation
    });
  } else if (liquidations && liquidations.length === 0) { // Sėkmingai gauta, bet likvidavimų nėra
    insights.push({
      label: "Recent Liquidations",
      value: "No recent liquidation data found for this symbol.",
      interpretation: "This may mean no significant liquidations have occurred recently, or the symbol does not typically have high liquidation volumes on this market."
    });
  } else { // liquidations yra null (arba undefined), nurodo, kad duomenys nebuvo sėkmingai gauti
    insights.push({
      label: "Recent Liquidations",
      value: "Data unavailable or error during fetch.",
      interpretation: "Could not retrieve liquidation data for this symbol. This might be due to a temporary issue, an error from the data source, or lack of reported data."
    });
  }
  // Jei liquidations yra null, vadinasi, gavimo metu įvyko klaida, kuri nebuvo 404/tuščia, todėl likvidavimo įžvalgos nepridedame.

  return insights;
};

export default function StockDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  
  // Gaunamas švarus token pavadinimas be USDT priesagos
  const getCleanTokenName = (symbolString: string | undefined): string => {
    if (!symbolString) return t('stock.fallbackToken');
    return symbolString.replace(/USDT$|PERP$/g, '');
  };

  const cleanTokenName = getCleanTokenName(symbol);

  // Grok Pulse state - pradedama nuo true, kad būtų gaunama automatiškai
  const [showGrokPulse, setShowGrokPulse] = useState(true);

  // Bybit duomenų state
  const [tickerData, setTickerData] = useState<BybitTicker | null>(null);
  const [openInterestData, setOpenInterestData] = useState<BybitOpenInterestData | null>(null);
  const [fundingHistoryData, setFundingHistoryData] = useState<BybitFundingRateEntry[] | null>(null);
  const [longShortRatioData, setLongShortRatioData] = useState<BybitLongShortRatioEntry[] | null>(null);
  const [liquidationData, setLiquidationData] = useState<BybitLiquidationEntry[] | null>(null); 
  const [isLoadingBybit, setIsLoadingBybit] = useState<boolean>(true);
  const [errorBybit, setErrorBybit] = useState<string | null>(null);

  useEffect(() => {
    if (symbol) {
      // Automatiškai parodomas Grok pulse atidarant puslapį
      setShowGrokPulse(true);
      
      const getBybitData = async () => {
        setIsLoadingBybit(true);
        setErrorBybit(null);
        const bybitSymbol = symbol; 

        const results = await Promise.allSettled([
          fetchBybitTicker(bybitSymbol),
          fetchBybitOpenInterest(bybitSymbol, 'linear', '1h', 24),
          fetchBybitFundingHistory(bybitSymbol, 'linear', 20),
          fetchBybitLongShortRatio(bybitSymbol, 'linear', '1h', 20),
          fetchBybitLiquidations(bybitSymbol, 'linear', 50) 
        ]);

        if (results[0].status === 'fulfilled') {
          const tickerResult = results[0].value as { ticker?: BybitTicker, error?: string };
          if (tickerResult.error) setErrorBybit(prev => prev ? `${prev}\nTicker: ${tickerResult.error}` : `Ticker: ${tickerResult.error}`);
          else setTickerData(tickerResult.ticker || null);
        } else {
            setErrorBybit(prev => prev ? `${prev}\nTicker: Fetch failed` : `Ticker: Fetch failed`);
        }

        if (results[1].status === 'fulfilled') {
            const oiResult = results[1].value as { openInterestData?: BybitOpenInterestData, error?: string };
            if (oiResult.error) setErrorBybit(prev => prev ? `${prev}\nOI: ${oiResult.error}` : `OI: ${oiResult.error}`);
            else setOpenInterestData(oiResult.openInterestData || null);
        } else {
            setErrorBybit(prev => prev ? `${prev}\nOI: Fetch failed` : `OI: Fetch failed`);
        }

        if (results[2].status === 'fulfilled') {
            const fundingResult = results[2].value as { fundingHistory?: BybitFundingRateEntry[], error?: string };
            if (fundingResult.error) setErrorBybit(prev => prev ? `${prev}\nFunding: ${fundingResult.error}` : `Funding: ${fundingResult.error}`);
            else setFundingHistoryData(fundingResult.fundingHistory || null);
        } else {
            setErrorBybit(prev => prev ? `${prev}\nFunding: Fetch failed` : `Funding: Fetch failed`);
        }

        if (results[3].status === 'fulfilled') {
            const lsResult = results[3].value as { longShortRatioHistory?: BybitLongShortRatioEntry[], error?: string };
            if (lsResult.error) setErrorBybit(prev => prev ? `${prev}\nL/S Ratio: ${lsResult.error}` : `L/S Ratio: ${lsResult.error}`);
            else setLongShortRatioData(lsResult.longShortRatioHistory || null);
        } else {
            setErrorBybit(prev => prev ? `${prev}\nL/S Ratio: Fetch failed` : `L/S Ratio: Fetch failed`);
        }

        if (results[4].status === 'fulfilled') {
            const liqResult = results[4].value as { liquidations?: BybitLiquidationEntry[], error?: string };
            if (liqResult.error) setErrorBybit(prev => prev ? `${prev}\nLiq: ${liqResult.error}` : `Liq: ${liqResult.error}`);
            else setLiquidationData(liqResult.liquidations || null);
        } else {
            setErrorBybit(prev => prev ? `${prev}\nLiq: Fetch failed` : `Liq: Fetch failed`);
        }

        setIsLoadingBybit(false);
      };

      getBybitData();
    }
  }, [symbol]);

  const chartableOpenInterestData = openInterestData && openInterestData.list ? formatChartData(openInterestData.list) : formatChartData([]);
  
  const chartConfig = {
    backgroundGradientFrom: "#161B22",
    backgroundGradientTo: "#161B22",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(88, 166, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(201, 209, 217, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#58A6FF"
    },
    propsForBackgroundLines: {
        strokeDasharray: "",
        stroke: "#21262D",
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.scrollView}>
      <View style={styles.container}>
        {/* Patobulinta antraštė */}
        <View style={styles.headerContainer}>
          <View style={styles.tokenHeader}>
            <View style={styles.tokenIconContainer}>
              <MaterialIcons name="trending-up" size={32} color="#58A6FF" />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenName}>{cleanTokenName}</Text>
              <Text style={styles.tokenSymbol}>{symbol}</Text>
            </View>
          </View>
          
          {/* Kainos indikatorius iš ticker duomenų */}
          {tickerData && (
            <View style={styles.priceContainer}>
              <Text style={styles.currentPrice}>${parseFloat(tickerData.lastPrice).toFixed(4)}</Text>
              <Text style={styles.priceLabel}>{t('stock.currentPrice')}</Text>
            </View>
          )}
        </View>

        {/* Automatiškai įkraunama Grok AI analizės sekcija */}
        <View style={styles.grokSectionContainer}>
          <View style={styles.grokHeaderNew}>
            <View style={styles.grokTitleRowNew}>
              <MaterialIcons name="psychology" size={24} color="#FFA500" />
              <Text style={styles.grokTitleNew}>{t('stock.aiTitle')}</Text>
              <View style={styles.grokBadge}>
                <MaterialIcons name="auto-awesome" size={16} color="#FFA500" />
                <Text style={styles.badgeText}>{t('common.live')}</Text>
              </View>
            </View>
            <Text style={styles.grokSubtitle}>{t('stock.aiSubtitle')}</Text>
          </View>

          <View style={styles.grokContentNew}>
            <GrokPulse symbol={symbol || ''} />
          </View>
        </View>

        {/* Bybit duomenų sekcija */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderWithIcon}>
            <MaterialIcons name="bar-chart" size={24} color="#58A6FF" />
            <Text style={styles.sectionTitle}>{t('stock.marketData')}</Text>
          </View>
          
          {isLoadingBybit ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#58A6FF" />
              <Text style={styles.loadingText}>{t('stock.loadingMarketData')}</Text>
            </View>
          ) : errorBybit ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={24} color="#F44336" />
              <Text style={styles.errorText}>{errorBybit}</Text>
            </View>
          ) : (
            <>
              {tickerData && (
                <View style={styles.dataGrid}>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{t('stock.labels.high24h')}</Text>
                    <Text style={styles.dataValue}>${parseFloat(tickerData.highPrice24h).toFixed(4)}</Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{t('stock.labels.low24h')}</Text>
                    <Text style={styles.dataValue}>${parseFloat(tickerData.lowPrice24h).toFixed(4)}</Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{t('stock.labels.volume24h')}</Text>
                    <Text style={styles.dataValue}>{parseFloat(tickerData.volume24h).toLocaleString()}</Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{t('stock.labels.turnover24h')}</Text>
                    <Text style={styles.dataValue}>${parseFloat(tickerData.turnover24h).toLocaleString()}</Text>
                  </View>
                  {tickerData.fundingRate && (
                    <View style={styles.dataItem}>
                      <Text style={styles.dataLabel}>{t('stock.labels.fundingRate')}</Text>
                      <Text style={[
                        styles.dataValue,
                        { color: parseFloat(tickerData.fundingRate) >= 0 ? '#4CAF50' : '#F44336' }
                      ]}>
                        {(parseFloat(tickerData.fundingRate) * 100).toFixed(4)}%
                      </Text>
                    </View>
                  )}
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>{t('stock.labels.openInterest')}</Text>
                    <Text style={styles.dataValue}>{parseFloat(tickerData.openInterest).toLocaleString()}</Text>
                  </View>
                </View>
              )}

              {openInterestData && openInterestData.list && openInterestData.list.length > 1 ? (
                <View style={styles.chartContainer}>
                    <Text style={styles.subHeader}>
                      {t('stock.openInterestTrend', { hours: openInterestData.list.length })}
                    </Text>
                    <LineChart
                        data={chartableOpenInterestData}
                        width={screenWidth - 60} 
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={styles.chartStyle}
                    />
                </View>
              ) : !tickerData && !errorBybit && (
                 <Text style={styles.contentText}>{t('stock.noMarketData')}</Text>
              )}
            </>
          )}
        </View>
        
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 15, 
  },
  container: {
    width: '100%',
    maxWidth: 800,
    alignItems: 'center',
    backgroundColor: '#0D1117', 
  },
  // Nauji antraštės stiliai
  headerContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 25,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#161B22',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#21262D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 2,
  },
  tokenSymbol: {
    fontSize: 14,
    color: '#8B949E',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C9D1D9',
    marginBottom: 2,
  },
  priceLabel: {
    fontSize: 14,
    color: '#8B949E',
    fontWeight: '500',
  },
  // Patobulinti Grok sekcijos stiliai
  grokSectionContainer: {
    marginBottom: 25,
    padding: 0,
    backgroundColor: '#161B22',
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFA500',
    overflow: 'hidden',
  },
  grokHeaderNew: {
    padding: 20,
    backgroundColor: '#1A1F26',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  grokTitleRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  grokTitleNew: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFA500',
    marginLeft: 10,
    flex: 1,
  },
  grokBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
    marginLeft: 4,
  },
  grokSubtitle: {
    fontSize: 14,
    color: '#8B949E',
    lineHeight: 18,
  },
  grokContentNew: {
    padding: 20,
  },
  // Patobulinti sekcijos stiliai
  sectionContainer: {
    marginBottom: 25,
    padding: 0,
    backgroundColor: '#161B22',
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#21262D',
    overflow: 'hidden',
  },
  sectionHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1A1F26',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#58A6FF',
    marginLeft: 10,
    flex: 1,
  },
  exchangeBadge: {
    backgroundColor: '#58A6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  exchangeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  // Įkėlimo ir klaidų būsenos
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8B949E',
    marginTop: 15,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  contentText: {
    fontSize: 16,
    color: '#C9D1D9',
    textAlign: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginLeft: 10,
  },
  // Patobulintas duomenų tinklelis
  dataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
  },
  dataItem: {
    width: '48%',
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#21262D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  dataLabel: {
    fontSize: 13,
    color: '#8B949E',
    marginBottom: 6,
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C9D1D9',
  },
  chartContainer: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#161B22',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#58A6FF',
    marginBottom: 15,
    textAlign: 'center',
  },
  chartStyle: {
    borderRadius: 12,
    marginVertical: 10,
  },
  // Struktūrizuotos analizės stiliai
  structuredAnalysisContainer: {
    marginTop: 0,
  },
  analysisSection: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#21262D',
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionContent: {
    padding: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
    minWidth: 6,
  },
  bulletText: {
    fontSize: 14,
    color: '#C9D1D9',
    lineHeight: 20,
    flex: 1,
  },
  disclaimerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#21262D',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#8B949E',
    marginLeft: 8,
    lineHeight: 16,
    flex: 1,
  },
}); 
