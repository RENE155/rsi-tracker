import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  ImageBackground,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/context/OnboardingContext';
import { t } from '@/i18n';

const { width } = Dimensions.get('window');
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const backgroundImages = [
  require('../assets/images/pg1.png'),
  require('../assets/images/pg2.png'),
  require('../assets/images/pg3.png'),
  require('../assets/images/pg4.png'),
  require('../assets/images/pg5.png'),
  require('../assets/images/pg6.png'),
];

type StepConfig = {
  id: string;
  title: string;
  subtitle: string;
  highlight?: string;
  bullets?: string[];
  pillars?: { title: string; copy: string }[];
  backgroundIndex: number;
  ctaLabel: string;
};

const OnboardingScreen = () => {
  const router = useRouter();
  const { markOnboardingComplete } = useOnboarding();
  const steps: StepConfig[] = [
    {
      id: 'hook',
      title: t('onboarding.steps.hook.title'),
      subtitle: t('onboarding.steps.hook.subtitle'),
      highlight: t('onboarding.steps.hook.highlight'),
      backgroundIndex: 0,
      ctaLabel: t('onboarding.steps.hook.cta'),
    },
    {
      id: 'pain',
      title: t('onboarding.steps.pain.title'),
      subtitle: t('onboarding.steps.pain.subtitle'),
      bullets: [
        t('onboarding.steps.pain.bullets.one'),
        t('onboarding.steps.pain.bullets.two'),
        t('onboarding.steps.pain.bullets.three'),
      ],
      highlight: t('onboarding.steps.pain.highlight'),
      backgroundIndex: 5,
      ctaLabel: t('onboarding.steps.pain.cta'),
    },
    {
      id: 'mechanism',
      title: t('onboarding.steps.mechanism.title'),
      subtitle: t('onboarding.steps.mechanism.subtitle'),
      pillars: [
        {
          title: t('onboarding.steps.mechanism.pillars.alerts.title'),
          copy: t('onboarding.steps.mechanism.pillars.alerts.copy'),
        },
        {
          title: t('onboarding.steps.mechanism.pillars.sentiment.title'),
          copy: t('onboarding.steps.mechanism.pillars.sentiment.copy'),
        },
        {
          title: t('onboarding.steps.mechanism.pillars.feed.title'),
          copy: t('onboarding.steps.mechanism.pillars.feed.copy'),
        },
      ],
      backgroundIndex: 2,
      ctaLabel: t('onboarding.steps.mechanism.cta'),
    },
    {
      id: 'social',
      title: t('onboarding.steps.social.title'),
      subtitle: t('onboarding.steps.social.subtitle'),
      bullets: [
        t('onboarding.steps.social.bullets.one'),
        t('onboarding.steps.social.bullets.two'),
      ],
      backgroundIndex: 4,
      ctaLabel: t('onboarding.steps.social.cta'),
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef<FlatList<StepConfig>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const hookTitleAnim = useRef(new Animated.Value(0)).current;
  const hookSubtitleAnim = useRef(new Animated.Value(0)).current;
  const hookHighlightAnim = useRef(new Animated.Value(0)).current;
  const hookGlowAnim = useRef(new Animated.Value(0)).current;
  const ctaAnim = useRef(new Animated.Value(0)).current;
  const stepTwoOpacity = useRef(new Animated.Value(1)).current;
  const stepTwoTranslateX = useRef(new Animated.Value(0)).current;
  const [ctaReady, setCtaReady] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(hookGlowAnim, {
          toValue: 1,
          duration: 2600,
          useNativeDriver: true,
        }),
        Animated.timing(hookGlowAnim, {
          toValue: 0,
          duration: 2600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [hookGlowAnim]);

  useEffect(() => {
    if (currentIndex === 0) {
      hookTitleAnim.setValue(0);
      hookSubtitleAnim.setValue(0);
      hookHighlightAnim.setValue(0);

      Animated.sequence([
        Animated.timing(hookTitleAnim, {
          toValue: 1,
          duration: 450,
          delay: 150,
          useNativeDriver: true,
        }),
        Animated.timing(hookSubtitleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(hookHighlightAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      hookTitleAnim.setValue(1);
      hookSubtitleAnim.setValue(1);
      hookHighlightAnim.setValue(1);
    }
  }, [currentIndex, hookTitleAnim, hookSubtitleAnim, hookHighlightAnim]);

  useEffect(() => {
    setCtaReady(false);
    ctaAnim.stopAnimation();
    ctaAnim.setValue(0);
    const animation = Animated.timing(ctaAnim, {
      toValue: 1,
      duration: 550,
      delay: currentIndex === 0 ? 1200 : 350,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    });
    animation.start(() => setCtaReady(true));
    return () => animation.stop();
  }, [currentIndex, ctaAnim]);

  useEffect(() => {
    stepTwoOpacity.stopAnimation();
    stepTwoTranslateX.stopAnimation();
    if (currentIndex === 1) {
      stepTwoOpacity.setValue(0);
      stepTwoTranslateX.setValue(60);
      Animated.parallel([
        Animated.timing(stepTwoOpacity, {
          toValue: 1,
          delay: 400,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(stepTwoTranslateX, {
          toValue: 0,
          delay: 400,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      stepTwoOpacity.setValue(1);
      stepTwoTranslateX.setValue(0);
    }
  }, [currentIndex, stepTwoOpacity, stepTwoTranslateX]);

  const completeAndGoToPaywall = async () => {
    await markOnboardingComplete();
    router.replace('/subscriptions-paywall');
  };

  const handleLimitedMode = async () => {
    await markOnboardingComplete();
    router.replace('/(tabs)');
  };

  const handleSkipToPaywall = async () => {
    await completeAndGoToPaywall();
  };

  const handleAdvance = async () => {
    if (currentIndex === steps.length - 1) {
      await completeAndGoToPaywall();
      return;
    }

    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const interactiveDisabled = !ctaReady;
  const progress = (currentIndex + 1) / steps.length;

  const renderStep = ({ item, index }: { item: StepConfig; index: number }) => {
    const scale = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [0.9, 1, 0.9],
      extrapolate: 'clamp',
    });
    const isFirstStep = index === 0;
    const isSecondStep = index === 1;

    const cardBody = (
      <>
        {isFirstStep ? (
          <View style={styles.heroHookShell}>
            <AnimatedLinearGradient
              colors={['rgba(93,238,195,0.45)', 'rgba(4,7,15,0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.heroHookGlow,
                {
                  opacity: hookGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.25, 0.8],
                  }),
                  transform: [
                    {
                      translateX: hookGlowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-14, 14],
                      }),
                    },
                    {
                      scale: hookGlowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1.05],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.Text
              style={[
                styles.title,
                styles.heroHookTitle,
                {
                  opacity: hookTitleAnim,
                  transform: [
                    {
                      translateY: hookTitleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [18, 0],
                      }),
                    },
                    {
                      scale: hookTitleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {item.title}
            </Animated.Text>
          </View>
        ) : (
          <Text style={styles.title}>{item.title}</Text>
        )}
        {isFirstStep ? (
          <Animated.Text
            style={[
              styles.subtitle,
              styles.heroHookSubtitle,
              {
                opacity: hookSubtitleAnim,
                transform: [
                  {
                    translateY: hookSubtitleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {item.subtitle}
          </Animated.Text>
        ) : (
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        )}
        {item.highlight && (
          <Animated.View
            style={[
              styles.highlightCard,
              isFirstStep
                ? {
                    opacity: Animated.multiply(
                      hookHighlightAnim,
                      pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.6, 1],
                      })
                    ),
                    transform: [
                      {
                        translateY: hookHighlightAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 0],
                        }),
                      },
                    ],
                  }
                : {
                    opacity: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1],
                    }),
                  },
            ]}
          >
            <Ionicons name="flash" size={18} color="#0D1425" />
            <Text style={styles.highlightText}>{item.highlight}</Text>
          </Animated.View>
        )}
        {item.bullets && (
          <View style={styles.bulletList}>
            {item.bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={18} color="#5DEEC3" />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        )}
        {item.pillars && (
          <View style={styles.pillarGrid}>
            {item.pillars.map((pillar) => (
              <View key={pillar.title} style={styles.pillarCard}>
                <Text style={styles.pillarTitle}>{pillar.title}</Text>
                <Text style={styles.pillarCopy}>{pillar.copy}</Text>
              </View>
            ))}
          </View>
        )}
      </>
    );

    const cardContentStyles = [styles.slideContent];
    if (isFirstStep) {
      cardContentStyles.push(styles.slideContentHero);
    }

    return (
      <View style={{ width }}>
        <ImageBackground
          source={backgroundImages[item.backgroundIndex]}
          style={styles.slideBackground}
          imageStyle={styles.slideImage}
        >
          <LinearGradient
            colors={['rgba(4,7,15,0.2)', 'rgba(4,7,15,0.9)']}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.slideWrapper, { transform: [{ scale }] }]}>
            <Animated.View
              style={[
                ...cardContentStyles,
                isSecondStep && {
                  opacity: stepTwoOpacity,
                  transform: [{ translateX: stepTwoTranslateX }],
                },
              ]}
            >
              {cardBody}
            </Animated.View>
          </Animated.View>
        </ImageBackground>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.FlatList
        ref={flatListRef}
        style={{ flex: 1 }}
        data={steps}
        keyExtractor={(item) => item.id}
        renderItem={renderStep}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />
      <View style={styles.footer}>
        <Animated.View
          style={[
            styles.primaryButtonWrapper,
            {
              opacity: ctaAnim,
              transform: [
                {
                  translateY: ctaAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
                {
                  scale: ctaAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.primaryButton, interactiveDisabled && styles.disabledButton]}
            onPress={handleAdvance}
            disabled={interactiveDisabled}
          >
            <Text style={styles.primaryButtonText}>
              {steps[currentIndex]?.ctaLabel || t('common.continue')}
            </Text>
            </TouchableOpacity>
        </Animated.View>
        {currentIndex === steps.length - 1 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLimitedMode}
          >
            <Text style={styles.secondaryButtonText}>{t('onboarding.limitedModeCta')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#04070F',
  },
  slideBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideWrapper: {
    width: '100%',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  slideContent: {
    backgroundColor: 'rgba(4,7,15,0.85)',
    margin: 24,
    borderRadius: 28,
    padding: 24,
  },
  slideContentHero: {
    backgroundColor: 'transparent',
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 16,
    borderRadius: 0,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  heroHookShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 32,
    padding: 18,
    marginBottom: 12,
  },
  heroHookGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  heroHookTitle: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: 0.8,
  },
  subtitle: {
    color: '#C8CEE3',
    fontSize: 16,
    marginBottom: 16,
  },
  heroHookSubtitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  highlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE68A',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  highlightText: {
    color: '#0D1425',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 10,
  },
  bulletList: {
    marginBottom: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletText: {
    color: '#E8ECFF',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  pillarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pillarCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  pillarTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  pillarCopy: {
    color: '#9AA0B9',
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: '#04070F',
  },
  primaryButtonWrapper: {
    width: '100%',
    shadowColor: '#5DEEC3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  primaryButton: {
    backgroundColor: '#5DEEC3',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#0B0F19',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9AA0B9',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
