export const en = {
  common: {
    cancel: "Cancel",
    continue: "Continue",
    delete: "Delete",
    disable: "Disable",
    error: "Error",
    goBack: "Go Back",
    live: "LIVE",
    na: "N/A",
    notNow: "Not Now",
    or: "OR",
    subscribe: "Subscribe",
    unknownError: "Unknown error",
  },
  tabs: {
    dashboard: "Dashboard",
    guide: "Guide",
    profile: "Profile",
  },
  header: {
    title: "RSI Tracker",
    subtitle: "Smart real-time market momentum tracker",
  },
  notFound: {
    title: "Oops!",
    message: "This screen doesn't exist.",
    link: "Go to home screen!",
  },
  auth: {
    completing: "Completing authentication...",
    titles: {
      authentication: "Authentication",
      authenticationError: "Authentication Error",
      loginFailed: "Login Failed",
      loginIssue: "Login Issue",
      signUpFailed: "Sign Up Failed",
      signUpPending: "Sign Up Pending",
      signUpSuccess: "Sign Up Successful",
    },
    messages: {
      signInCancelled: "Sign in was cancelled.",
      signInDismissed: "Sign in was dismissed.",
      signInFailed: "Sign in failed.",
      signUpCheckEmail: "Please check your email to verify your account.",
      signUpPending: "Sign up process initiated. Please follow any further instructions (e.g., email verification).",
      sessionMissing: "Login seemed successful but session data is missing. Please try again.",
    },
    errors: {
      accountDeletionUnavailable: "Account deletion is not available at this time.",
      appleSignInFailed: "Failed to sign in with Apple.",
      appleTokenFailed: "Failed to get authentication token from Apple.",
      appleUnavailable: "Apple Sign In is not available on this device.",
      authErrorWithDescription: "%{error}: %{description}",
      authTokenExtractionFailed: "Could not extract authentication tokens from redirect URL.",
      authUnexpected: "An unexpected error occurred during authentication.",
      deleteFailed: "Unable to delete account. Please try again later.",
      deleteRequiresSignIn: "You must be signed in to delete your account.",
      emailNotVerified: "Please verify your email address first. Check your inbox for a confirmation link.",
      googleSignInFailed: "Failed to sign in with Google.",
      invalidCredentials: "Invalid email or password.",
      loginGeneric: "An error occurred during sign in.",
      setSessionFailed: "Failed to set authentication session.",
      signInEmailFailed: "Failed to sign in with email.",
      signOutFailed: "Failed to sign out.",
      signUpEmailExists: "This email is already registered. Please try logging in.",
      signUpEmailFailed: "Failed to sign up with email.",
      signUpGeneric: "An error occurred during sign up.",
      supabaseNotInitialized: "Supabase client not initialized.",
    },
  },
  onboarding: {
    steps: {
      hook: {
        title: "Stop finding out after the move.",
        subtitle: "RSI + live X (formerly Twitter) sentiment alerts so you see shifts before the candle explodes.",
        highlight: "You are losing edge every minute you wait.",
        cta: "Show me how",
      },
      pain: {
        title: "You can’t watch 500+ pairs and Crypto Twitter 24/7.",
        subtitle: "Smart money is already rotating while you are refreshing feeds.",
        bullets: {
          one: "RSI overbought/oversold levels hit while you’re asleep.",
          two: "Narratives go viral on X before they hit your feed.",
          three: "By the time you react, smart money is already out.",
        },
        highlight: "You’re playing blind. They’re playing augmented.",
        cta: "Give me the edge",
      },
      mechanism: {
        title: "RSI Tracker + Grok Sentiment Engine.",
        subtitle: "500+ pairs scanned for RSI extremes blended with Grok AI sentiment to deliver confluence-only signals.",
        pillars: {
          alerts: {
            title: "Smart RSI Alerts",
            copy: "Realtime multi-timeframe monitoring.",
          },
          sentiment: {
            title: "Grok Sentiment Reads",
            copy: "Noise-filtered context from Twitter heat.",
          },
          feed: {
            title: "Priority Signal Feed",
            copy: "Only actionable confluence hits your phone.",
          },
        },
        cta: "See who it's built for",
      },
      social: {
        title: "Built for traders done winging it.",
        subtitle: "12,400+ alerts delivered to desks across 58 countries.",
        bullets: {
          one: "“I wait for confluence now. No more panic chasing.”",
          two: "“Sentiment filter deletes 80% of the noise.”",
        },
        cta: "See subscription options",
      },
    },
    limitedModeCta: "Continue in limited mode (delayed RSI-only)",
  },
  home: {
    sections: {
      rsiHigh: "Highest RSI (4H Overbought)",
      rsiLow: "Lowest RSI (4H Oversold)",
      fundingHigh: "Highest Funding Rate (Positive)",
      fundingLow: "Lowest Funding Rate (Negative)",
    },
    toast: {
      signedInTitle: "Signed In",
      signedInMessage: "Welcome back!",
    },
    premium: {
      title: "Premium Only",
      message: "Subscriptions now unlock every pair and sentiment read in real time. Activate RSI Tracker Pro to see live data.",
      badge: "Pro Only",
    },
    labels: {
      oneDayValue: "1D: %{value}",
      noOneDay: "No 1D",
      rsi4h: "4H RSI",
      funding: "Funding",
    },
    loading: {
      title: "Loading market data...",
      subtitle: "Fetching real-time insights",
    },
    noData: {
      title: "No ranking data available.",
      subtitle: "Server might be initializing.",
    },
    error: {
      connection: "Could not connect to server.",
    },
  },
  info: {
    headerTitle: "How to Use RSI Tracker",
    alerts: {
      premiumFeature: {
        title: "Premium Feature",
        message: "Unlock the complete trading guide with our Premium subscription. Get access to all trading tips and insights!",
      },
    },
    sections: {
      about: {
        title: "About RSI",
        body: "The Relative Strength Index (RSI) is a momentum oscillator developed by J. Welles Wilder Jr. that measures the speed and change of price movements. It's calculated based on the average gains and losses over a specified period (typically 14 periods) and ranges from 0 to 100.",
        bullets: {
          rsiAbove70: {
            label: "RSI above 70",
            text: "Generally considered overbought - price may be due for a pullback",
          },
          rsiBelow30: {
            label: "RSI below 30",
            text: "Generally considered oversold - price may be due for a bounce",
          },
          rsi4h: {
            label: "4H RSI",
            text: "Short-term momentum (good for intraday moves)",
          },
          rsi1d: {
            label: "1D RSI",
            text: "Longer-term momentum (better for swing trades)",
          },
          rsi50: {
            label: "RSI 50",
            text: "Neutral line - above suggests bullish momentum, below suggests bearish",
          },
        },
      },
      reading: {
        title: "Reading the Signals",
        body: "This app tracks RSI values for hundreds of crypto trading pairs on Bybit and displays coins with the strongest signals. Here's how to interpret the data:",
        bullets: {
          redRsi: {
            label: "Red RSI Values (70+)",
            text: "Potentially overbought - watch for selling pressure and potential reversals",
          },
          greenRsi: {
            label: "Green RSI Values (30-)",
            text: "Potentially oversold - look for buying opportunities and bounce signals",
          },
          day1: {
            label: "1D Value",
            text: "Daily RSI context - helps confirm if the move is part of a larger trend",
          },
          funding: {
            label: "Funding Rate",
            text: "Shows market sentiment - positive means longs pay shorts (bullish sentiment)",
          },
          volume: {
            label: "Volume",
            text: "Higher volume on RSI extremes adds conviction to the signal",
          },
        },
      },
      grok: {
        title: "Grok AI Analysis Power",
        body: "Our app integrates Grok AI to analyze real-time sentiment and market signals from X (formerly Twitter), providing you with cutting-edge insights:",
        bullets: {
          sentiment: {
            label: "Live X Sentiment Analysis",
            text: "Grok scans thousands of posts to gauge market sentiment in real-time",
          },
          influencer: {
            label: "Influencer & Whale Tracking",
            text: "Detects when major traders and influencers mention specific tokens",
          },
          news: {
            label: "News Event Detection",
            text: "Identifies breaking news and market-moving events as they happen",
          },
          momentum: {
            label: "Social Momentum Signals",
            text: "Measures mention velocity and trending patterns to predict price movements",
          },
          confidence: {
            label: "Confidence Scoring",
            text: "Each analysis includes confidence levels based on data quality and consensus",
          },
        },
        footer: "The power of X lies in its real-time nature - major market moves often start with social sentiment before appearing in price. Grok helps you stay ahead by combining technical RSI signals with social intelligence for a complete market picture.",
      },
      psychology: {
        title: "Market Psychology",
        body: "Understanding the psychology behind RSI levels helps make better trading decisions:",
        bullets: {
          rsi80: {
            label: "RSI 80+",
            text: "Extreme greed - most traders are bullish, fewer buyers left",
          },
          rsi20: {
            label: "RSI 20-",
            text: "Extreme fear - heavy selling, potential for oversold bounce",
          },
          divergence: {
            label: "RSI Divergence",
            text: "Price makes new highs but RSI doesn't - warning of weakening momentum",
          },
          hiddenDivergence: {
            label: "Hidden Divergence",
            text: "Price makes lower lows but RSI makes higher lows - potential trend continuation",
          },
        },
      },
      examples: {
        title: "Practical Examples",
        body: "Common scenarios you'll encounter in crypto trading:",
        bullets: {
          bull: {
            label: "Bull Market RSI",
            text: "In uptrends, RSI often stays above 50 and rarely drops below 30",
          },
          bear: {
            label: "Bear Market RSI",
            text: "In downtrends, RSI struggles to reach 70 and often stays below 50",
          },
          range: {
            label: "Range-bound Markets",
            text: "RSI oscillates between 30-70 more predictably",
          },
          breakout: {
            label: "Breakout Confirmation",
            text: "RSI breaking above 70 or below 30 can confirm price breakouts",
          },
        },
      },
      strategies: {
        title: "Advanced Trading Strategies",
        body: "Professional techniques for using RSI effectively:",
        bullets: {
          timeframes: {
            label: "Multiple Timeframes",
            text: "Use 4H for entries, 1D for trend direction",
          },
          support: {
            label: "Support/Resistance",
            text: "RSI levels often act as support/resistance themselves",
          },
          trend: {
            label: "Trend Following",
            text: "In strong trends, use RSI pullbacks (not reversals) as entry points",
          },
          risk: {
            label: "Risk Management",
            text: "Never risk more than 1-2% per trade, regardless of RSI signals",
          },
          confluence: {
            label: "Confluence",
            text: "Combine RSI with moving averages, volume, and price action",
          },
        },
      },
      mistakes: {
        title: "Common Mistakes to Avoid",
        body: "Learn from these frequent RSI trading errors:",
        bullets: {
          knives: {
            label: "Catching Falling Knives",
            text: "Don't buy just because RSI is oversold - wait for confirmation",
          },
          trend: {
            label: "Fighting the Trend",
            text: "Overbought can stay overbought in strong uptrends",
          },
          context: {
            label: "Ignoring Context",
            text: "Always consider market conditions and news events",
          },
          overtrading: {
            label: "Over-trading",
            text: "Quality over quantity - wait for clear setups",
          },
        },
      },
      disclaimer: {
        title: "Important Disclaimer",
        body: "This app provides educational information only and is not financial advice. Cryptocurrency trading involves significant risk of loss. Past performance does not guarantee future results. Always do your own research, practice with small amounts, and never invest more than you can afford to lose.",
      },
    },
    preview: {
      about: {
        body: "The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and change of price movements. It ranges from 0 to 100 and is typically used to identify overbought or oversold conditions.",
        bullets: {
          rsiAbove70: "RSI above 70: Generally considered overbought",
          rsiBelow30: "RSI below 30: Generally considered oversold",
        },
      },
    },
    locked: {
      title: "Premium Content",
      body: "Subscribe to unlock the complete trading guide, including detailed RSI strategies and expert tips.",
      cta: "Unlock Premium",
    },
  },
  paywall: {
    planMeta: {
      quarterly: {
        tagline: "Pre-selected · Save vs. monthly",
        badge: "Recommended",
      },
      monthly: {
        tagline: "Perfect for testing your edge",
      },
      annual: {
        tagline: "Go all-in on data",
        badge: "Best value",
      },
      weekly: {
        tagline: "Short bursts of alpha",
      },
      lifetime: {
        tagline: "Pay once, keep the feed forever",
      },
    },
    comparison: {
      title: "Limited vs RSI Pro",
      limited: {
        one: "Only RSI data",
      },
      premium: {
        one: "Instant RSI + sentiment confluence alerts",
        two: "Unlimited pairs & signal feed access",
        three: "Priority push notifications",
      },
    },
    benefits: {
      title: "Every plan unlocks",
      one: "Real-time RSI + Grok sentiment confluence",
      two: "Unlimited pairs, lists, and funding data",
      three: "Automation-ready feed & push alerts",
      four: "Cancel anytime · No hidden fees",
    },
    period: {
      week: "week",
      month: "month",
      quarter: "quarter",
      year: "year",
      lifetime: "lifetime",
      term: "term",
    },
    alerts: {
      purchaseFailedTitle: "Purchase Failed",
      purchaseFailedMessage: "Please try again later.",
      purchaseSuccessTitle: "Purchase Successful",
      purchaseSuccessMessage: "Thank you for subscribing.",
    },
    toast: {
      signedInTitle: "Signed In",
      signedInMessage: "You can now subscribe.",
    },
    loading: {
      subscriptionInfo: "Loading subscription information…",
      alreadySubscribed: "You are already subscribed.",
      noOptions: "No subscription options available right now.",
    },
    hero: {
      label: "RSI + Twitter Pulse",
      title: "Unlock real-time confluence alerts",
      subtitle: "Smart RSI alerts layered with live Twitter sentiment so you catch rotations before the crowd.",
      stats: {
        alerts: "alerts delivered",
        countries: "countries trading",
        pairs: "pairs monitored",
      },
    },
    plan: {
      choose: "Choose your plan",
      fallbackTagline: "Full access unlocked",
      perks: {
        priorityFeed: "Priority confluence feed",
        unlimitedPairs: "Unlimited pairs & sentiment filters",
      },
    },
    primaryCta: {
      title: "Activate my edge",
      subtext: "Charges %{price}/%{period}",
    },
    secondaryCta: "Continue with limited mode (delayed alerts)",
  },
  profile: {
    alerts: {
      restoreUnavailable: "Restore function not available.",
      missingInfo: {
        title: "Missing Info",
        message: "Please enter both email and password.",
      },
      appleUnavailable: {
        title: "Not Available",
        iosOnly: "Apple Sign In is only available on iOS devices.",
        unavailable: "Apple Sign In is not available on this device. Please use email/password or Google Sign In instead.",
      },
      deletionFailed: {
        title: "Deletion Failed",
        message: "There was a problem deleting your account. Please try again.",
      },
    },
    toast: {
      signedOut: {
        title: "Signed Out",
        message: "You have been signed out successfully.",
      },
      accountDeleted: {
        title: "Account Deleted",
        message: "Your account and associated data have been removed.",
      },
    },
    delete: {
      confirmTitle: "Delete Account",
      confirmMessage: "Deleting your account will permanently remove your profile, subscription data, and push notification settings. This action cannot be undone.",
      title: "Delete Account",
      description: "Permanently remove your RSI Tracker account, authentication, and stored preferences from our systems.",
      button: "Delete Account",
      footnote: "Billing is managed through Apple. Deleting your account only removes RSI Tracker data.",
    },
    welcome: "Welcome %{email}",
    subscriptionStatus: "Subscription Status: %{status}",
    status: {
      active: "Active",
      inactive: "Inactive",
    },
    settings: {
      title: "Settings",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
    },
    buttons: {
      viewSubscriptions: "View Subscriptions",
      restorePurchases: "Restore Purchases",
      signOut: "Sign Out",
      signUp: "Sign Up",
      signIn: "Sign In",
      signInGoogle: "Sign in with Google",
      signInApple: "Sign in with Apple",
    },
    signInPrompt: "Sign in to manage your account and subscriptions.",
    placeholders: {
      email: "Email",
      password: "Password",
    },
  },
  stock: {
    fallbackToken: "Token",
    currentPrice: "Current Price",
    aiTitle: "AI Market Intelligence",
    aiSubtitle: "Real-time sentiment and signals from X (formerly Twitter)",
    marketData: "Market Data",
    loadingMarketData: "Loading market data...",
    labels: {
      high24h: "24h High",
      low24h: "24h Low",
      volume24h: "24h Volume",
      turnover24h: "24h Turnover",
      fundingRate: "Funding Rate",
      openInterest: "Open Interest",
    },
    openInterestTrend: "Open Interest Trend (Last %{hours} Hours)",
    noMarketData: "No market data available for this symbol on Bybit.",
    chart: {
      legend: "Open Interest (Millions)",
    },
  },
  grok: {
    summary: {
      marketOverview: "Market Overview",
      aiRecommendation: "AI Recommendation",
      marketContext: "Market Context",
    },
    pulse: {
      loading: "Searching X for live pulse...",
      errorTitle: "Analysis Failed",
      retry: "Try Again",
      title: "Grok X Live Pulse",
      topSignals: "Top Signals",
    },
    categories: {
      technical: "Technical Analysis",
      news: "News & Events",
      whale: "Whale Activity",
      influencer: "Influencer Signal",
      general: "General",
    },
    signalCard: {
      by: "by %{author}",
      originalPost: "Original Post",
      noContent: "No content provided.",
      viewOnX: "View on X",
      marketImplication: "Market Implication",
      source: "Source: @%{author}",
    },
    historical: {
      title: "Historical Sentiment",
    },
  },
  sentiment: {
    bullish: "Bullish",
    bearish: "Bearish",
    neutral: "Neutral",
    unknown: "Unknown",
    short: {
      bullish: "Bull",
      neutral: "Neut",
      bearish: "Bear",
    },
  },
  velocity: {
    labels: {
      mentions: "Mentions",
      velocity: "Velocity",
    },
    level: {
      high: "High",
      medium: "Medium",
      low: "Low",
      unknown: "Unknown",
    },
    trend: {
      increasing: "Increasing",
      decreasing: "Decreasing",
      stable: "Stable",
      unknown: "Unknown",
    },
  },
  legal: {
    text: {
      prefix: "By subscribing, you agree to our ",
      terms: "Terms of Use",
      and: " and ",
      privacy: "Privacy Policy",
      suffix: ".",
    },
    errors: {
      privacy: "Unable to open Privacy Policy link",
      terms: "Unable to open Terms of Use link",
    },
  },
  demoMode: {
    prompt: {
      title: "Demo Mode for App Review",
      message: "Enter the demo mode password for Apple App Review:",
      enable: "Enable",
    },
    invalidPassword: {
      title: "Invalid Password",
      message: "The demo mode password is incorrect.",
    },
    enabled: {
      title: "Demo Mode Enabled",
      message: "All premium features are now accessible for Apple App Review. This mode provides full access to:\n\n• All premium data and features\n• Ad-free experience\n• All market analysis tools\n\nDemo mode will remain active until manually disabled.",
      error: "Failed to enable demo mode.",
    },
    disable: {
      title: "Disable Demo Mode",
      message: "Are you sure you want to disable demo mode? Premium features will require an active subscription.",
    },
    disabled: {
      title: "Demo Mode Disabled",
      message: "Premium features now require a subscription.",
      error: "Failed to disable demo mode.",
    },
    badge: {
      title: "🍎 DEMO MODE ACTIVE",
      subtitle: "Tap to disable",
    },
  },
  purchases: {
    restoreFailed: {
      title: "Restore Failed",
      message: "Could not restore purchases. Please try again later.",
    },
  },
};
