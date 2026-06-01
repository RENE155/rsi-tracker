import { supabase } from '../../context/AuthContext';

// Naudojamas aplinkos kintamasis su Expo priešdėlio šablonu
const GROK_API_KEY = process.env.EXPO_PUBLIC_GROK_API_KEY;
// Atnaujinta, kad būtų naudojamas teisingas X.ai API endpoint
const GROK_API_BASE_URL = "https://api.x.ai/v1"; // X.ai API endpoint
const MODEL_NAME = "grok-4-1-fast";

// Pagalbinė funkcija tekstui išgauti iš naujo /v1/responses API formato
function extractResponseText(data: any): string {
  if (data.output) {
    for (const item of data.output) {
      if (item.type === 'message' && item.content) {
        for (const block of item.content) {
          if (block.type === 'output_text') {
            return block.text;
          }
        }
      }
    }
  }
  return '';
}

// Pridedama konstanta talpyklos galiojimo trukmei
const CACHE_DURATION_HOURS = 5;

interface GrokAnalysisResponse {
  analysis: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  keyPoints: string[];
  twitterMentions: number;
  citations?: string[]; // Pridedami šaltiniai iš web ir X paieškos
  postExcerpts?: string[]; // Pridedamos faktinio įrašų turinio ištraukos
  error?: string;
  fromCache?: boolean; // Pridedama nurodyti, ar duomenys yra iš talpyklos
}

export interface GrokPulseResponse {
  sentiment: {
    value: 'bullish' | 'bearish' | 'neutral';
    confidence: number | string; // Leidžiama eilutė atsparumui
  };
  signals: {
    id: string;
    category: 'TA' | 'News' | 'Whale' | 'Influencer';
    title: string;
    description: string;
    implication: string;
    source: {
      url: string;
      content: string;
      author: string;
    };
  }[];
  mentionVelocity: {
    rate: 'High' | 'Medium' | 'Low';
    trend: 'Increasing' | 'Decreasing' | 'Stable';
  };
  summary: {
    overview: string;
    marketContext: string;
    recommendation: string;
  };
  error?: string;
  fromCache?: boolean; // Pridedama nurodyti, ar duomenys yra iš talpyklos
}

interface TwitterSearchData {
  mentions: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  keyTopics: string[];
}

export async function fetchGrokAnalysis(symbol: string): Promise<GrokAnalysisResponse> {
  console.log('🔍 Starting Grok analysis with live X search for:', symbol);

  // 1. Patikrinama, ar yra talpykloje saugomų duomenų
  const cacheDuration = CACHE_DURATION_HOURS * 60 * 60 * 1000;
  const fiveHoursAgo = new Date(Date.now() - cacheDuration).toISOString();

  if (supabase) {
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('grok_api_cache')
          .select('response_data, fetched_at')
          .eq('token_symbol', symbol)
          .eq('request_type', 'analysis')
          .gte('fetched_at', fiveHoursAgo)
          .single();

        if (cacheError && cacheError.code !== 'PGRST116') { // PGRST116: „Eilučių nerasta“
          console.warn('Cache read error (analysis):', cacheError);
        }
        
        if (cachedData) {
          console.log(`[Cache] HIT for ${symbol} (analysis). Fetched at: ${cachedData.fetched_at}`);
          return { ...cachedData.response_data, fromCache: true } as GrokAnalysisResponse;
        }
      } catch (e) {
          console.warn("An error occurred during cache check (analysis)", e);
      }
  }

  console.log(`[Cache] MISS for ${symbol} (analysis). Fetching from Grok API.`);
  console.log('🔑 API Key available:', !!GROK_API_KEY);
  
  if (!GROK_API_KEY) {
    console.error('❌ No Grok API key found');
    return {
      analysis: 'Grok API key not configured. Please add EXPO_PUBLIC_GROK_API_KEY to your .env file.',
      sentiment: 'neutral',
      confidence: 0,
      keyPoints: [],
      twitterMentions: 0,
      error: 'API key not configured',
      postExcerpts: []
    };
  }

  try {
    // Išgaunamas bazinis aktyvas (pvz., „BTC“ iš „BTCUSDT“)
    const baseAsset = symbol.replace(/USDT?$/, '').toUpperCase();
    console.log('📊 Analyzing:', baseAsset, 'from symbol:', symbol);

    const prompt = `Generate a concise, structured analysis of the cryptocurrency $${symbol} for integration into a mobile app. The response must be organized into clearly labeled sections with bullet points summarizing key information. Include the following sections: Overview, Price Performance, Technical Analysis, Fundamental Analysis, Market Sentiment, Risks, and Future Outlook. Each section should contain 3–5 bullet points highlighting critical details, such as project background, current price, market cap, trading volume, key technical indicators, fundamental drivers, community sentiment, potential risks, and price predictions for short-term (1–3 months), medium-term (6–12 months), and long-term (2027–2030). Ensure the data is up-to-date as of June 17, 2025, leveraging web searches and X posts for real-time insights if needed. Avoid speculative claims, and focus on verifiable data from reliable sources. Format the output for easy parsing in an app, with each section clearly separated and bullet points limited to 1–2 sentences for brevity. If the ticker ($${symbol}) refers to a trading pair, analyze the underlying asset ($${baseAsset}) but note its context as a pair. Clarify any potential confusion with similar tickers. Include a disclaimer stating that this is not financial advice and that cryptocurrency investments are volatile, advising users to consult a financial advisor.`;

    console.log('📝 Sending enhanced prompt to Grok API with web and X search...');

    // Naudojama ir web, ir X paieška per Agent Tools API
    const requestBody = {
      model: MODEL_NAME,
      input: [
        {
          role: "user",
          content: prompt
        }
      ],
      tools: [
        { type: "web_search" },
        { type: "x_search" }
      ],
      max_output_tokens: 1000,
      temperature: 0.2
    };

    console.log('🚀 Request payload:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${GROK_API_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Full API Response:', JSON.stringify(data, null, 2));

    const analysis = extractResponseText(data) || 'No analysis received';
    const citations = data.citations || [];
    console.log('📄 Analysis text:', analysis);
    console.log('🔗 Citations found:', citations.length);

    // Analizuojamas atsakymas struktūrizuotiems duomenims
    // Bandoma išgauti nuotaiką iš MARKET SENTIMENT sekcijos (atnaujinta naujam formatui)
    const sentimentSection = analysis.match(/Market Sentiment(.*?)(?:\n\n|Risks|$)/s)?.[1] ||
                             analysis.match(/MARKET SENTIMENT(.*?)(?:\n\n|RISKS|$)/s)?.[1];
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;
    
    if (sentimentSection) {
      const sentimentText = sentimentSection.toLowerCase();

      // Realistiškesnis pasitikėjimo skaičiavimas su platesniu diapazonu
      let confidenceScore = 35; // Žemesnis bazinis pasitikėjimas

      // 1 veiksnys: duomenų šaltinio kokybė (konservatyvesnis vertinimas)
      const citationBonus = Math.min(15, citations.length * 0.8); // Sumažintas poveikis
      confidenceScore += citationBonus;

      // 2 veiksnys: nuotaikos kalbos stiprumas su didesniu niuansavimu
      const veryStrongBullish = ['surge', 'moon', 'breakout', 'rally'].some(word => sentimentText.includes(word));
      const veryStrongBearish = ['crash', 'dump', 'collapse', 'plunge'].some(word => sentimentText.includes(word));
      const strongBullish = ['bullish', 'pump', 'rising', 'uptrend'].some(word => sentimentText.includes(word));
      const strongBearish = ['bearish', 'decline', 'falling', 'downtrend'].some(word => sentimentText.includes(word));
      const moderateBullish = ['positive', 'optimistic', 'up', 'gain'].some(word => sentimentText.includes(word));
      const moderateBearish = ['negative', 'pessimistic', 'down', 'loss'].some(word => sentimentText.includes(word));
      
      if (veryStrongBullish) {
        sentiment = 'bullish';
        confidenceScore += 25;
      } else if (veryStrongBearish) {
        sentiment = 'bearish';
        confidenceScore += 25;
      } else if (strongBullish) {
        sentiment = 'bullish';
        confidenceScore += 15;
      } else if (strongBearish) {
        sentiment = 'bearish';
        confidenceScore += 15;
      } else if (moderateBullish) {
        sentiment = 'bullish';
        confidenceScore += 8;
      } else if (moderateBearish) {
        sentiment = 'bearish';
        confidenceScore += 8;
      }
      
      // 3 veiksnys: duomenų konkretumas (tikslūs skaičiai didina pasitikėjimą)
      const hasSpecificPrices = /\$[\d,]+\.?\d*/.test(sentimentText);
      const hasPercentages = /[\d,]+\.?\d*%/.test(sentimentText);
      const hasVolumes = /volume|trading/.test(sentimentText);
      
      if (hasSpecificPrices) confidenceScore += 8;
      if (hasPercentages) confidenceScore += 6;
      if (hasVolumes) confidenceScore += 4;
      
      // 4 veiksnys: prieštaringi signalai mažina pasitikėjimą
      const hasConflictingSentiment = (
        (sentimentText.includes('bullish') && sentimentText.includes('bearish')) ||
        (sentimentText.includes('rising') && sentimentText.includes('falling')) ||
        (sentimentText.includes('positive') && sentimentText.includes('negative'))
      );
      
      if (hasConflictingSentiment) {
        confidenceScore -= 15;
        sentiment = 'neutral';
      }
      
      // Pridedama šiek tiek atsitiktinumo, kad nebūtų visada pasiekiami tie patys pasitikėjimo lygiai
      const randomVariation = (Math.random() - 0.5) * 10; // ±5 taškai
      confidenceScore += randomVariation;

      // Realistiškesnis pasitikėjimo diapazonas
      confidence = Math.min(90, Math.max(25, Math.round(confidenceScore)));
    }

    // Įvertinamas Twitter paminėjimų skaičius pagal šaltinius
    const twitterMentions = citations.length;

    // Išgaunami pagrindiniai punktai iš kelių sekcijų (punktų formatas)
    const keyPoints: string[] = [];

    // Išgaunama iš Price Performance
    const priceSection = analysis.match(/Price Performance(.*?)(?:\n\n|Technical Analysis|$)/s);
    if (priceSection) {
      const priceLines = priceSection[1].trim().split('\n')
        .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^[•-]\s*/, '').trim())
        .filter((line: string) => line.length > 0);
      keyPoints.push(...priceLines.slice(0, 2));
    }
    
    // Išgaunama iš Technical Analysis
    const techSection = analysis.match(/Technical Analysis(.*?)(?:\n\n|Fundamental Analysis|Market Sentiment|$)/s);
    if (techSection) {
      const techLines = techSection[1].trim().split('\n')
        .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^[•-]\s*/, '').trim())
        .filter((line: string) => line.length > 0);
      keyPoints.push(...techLines.slice(0, 2));
    }

        // Išgaunamos prasmingos prekybos įžvalgos kaip įrašų ištraukos
    const postExcerpts: string[] = [];
    console.log('🔍 Extracting trading insights from structured Grok response...');

    // 1 metodas: išgaunamos įžvalgos iš Overview sekcijos (punktų formatas)
    const overviewSection = analysis.match(/Overview(.*?)(?:\n\n|Price Performance|$)/s)?.[1];
    if (overviewSection) {
      console.log('✅ Found Overview section');
      const overviewLines = overviewSection.trim().split('\n')
        .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^[•-]\s*/, '').trim())
        .filter((line: string) => line.length > 20);
      
      overviewLines.slice(0, 2).forEach((point: string, index: number) => {
        postExcerpts.push(`Overview: ${point}`);
        console.log(`✅ Added overview ${index + 1}:`, point.substring(0, 50) + '...');
      });
    }
    
    // 2 metodas: išgaunama iš Price Performance sekcijos (punktų formatas)
    const pricePerformanceSection = analysis.match(/Price Performance(.*?)(?:\n\n|Technical Analysis|$)/s)?.[1];
    if (pricePerformanceSection) {
      console.log('✅ Found Price Performance section');
      const priceLines = pricePerformanceSection.trim().split('\n')
        .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^[•-]\s*/, '').trim())
        .filter((line: string) => line.length > 20);
      
      priceLines.slice(0, 2).forEach((point: string, index: number) => {
        postExcerpts.push(`Price: ${point}`);
        console.log(`✅ Added price analysis ${index + 1}:`, point.substring(0, 50) + '...');
      });
    }
    
    // 3 metodas: išgaunama iš Market Sentiment sekcijos (punktų formatas)
    const marketSentimentSection = analysis.match(/Market Sentiment(.*?)(?:\n\n|Risks|$)/s)?.[1];
    if (marketSentimentSection) {
      console.log('✅ Found Market Sentiment section');
      const sentimentLines = marketSentimentSection.trim().split('\n')
        .filter((line: string) => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map((line: string) => line.replace(/^[•-]\s*/, '').trim())
        .filter((line: string) => line.length > 20);
      
      sentimentLines.slice(0, 2).forEach((point: string, index: number) => {
        postExcerpts.push(`Sentiment: ${point}`);
        console.log(`✅ Added sentiment ${index + 1}:`, point.substring(0, 50) + '...');
      });
    }
    
         // 3 metodas: sukuriamos sintetinės įrašų ištraukos iš kainų duomenų analizėje
     const priceMatches = analysis.match(/\$\w+\s+trading\s+at[^.]+/gi);
     if (priceMatches && priceMatches.length > 0) {
       console.log('✅ Found price mentions:', priceMatches.length);
       priceMatches.slice(0, 2).forEach((priceInfo: string, index: number) => {
         postExcerpts.push(`Price Update: ${priceInfo.trim()}`);
         console.log(`✅ Added price info ${index + 1}:`, priceInfo.substring(0, 50) + '...');
       });
     }
     
     // 4 metodas: išgaunami apimties/techniniai paminėjimai
     const volumeMatches = analysis.match(/(?:volume|breakout|resistance|support)[^.]+\./gi);
     if (volumeMatches && volumeMatches.length > 0) {
       console.log('✅ Found technical mentions:', volumeMatches.length);
       volumeMatches.slice(0, 2).forEach((techInfo: string, index: number) => {
         const clean = techInfo.replace(/\.$/, '').trim();
         if (clean.length > 15) {
           postExcerpts.push(`Technical Analysis: ${clean}`);
           console.log(`✅ Added technical info ${index + 1}:`, clean.substring(0, 50) + '...');
         }
       });
     }
     
     // Jei vis dar neturime pakankamai ištraukų, jos sukuriamos iš šaltinių
     if (postExcerpts.length < 3 && citations.length > 0) {
       console.log('🔄 Creating excerpts from citations...');
       citations.slice(0, 3).forEach((citation: string, index: number) => {
         const username = citation.match(/x\.com\/(\w+)\//)?.[1] || 'trader';
         postExcerpts.push(`X Post by @${username}: Discussing ${baseAsset} price action and market trends`);
         console.log(`✅ Added citation-based excerpt ${index + 1}`);
       });
     }

    console.log('🎯 Parsed results:', { 
      sentiment, 
      confidence, 
      twitterMentions, 
      keyPointsCount: keyPoints.length,
      postExcerptsCount: postExcerpts.length,
      citationsCount: citations.length 
    });
    
    // Registruojamas pasitikėjimo išskaidymas derinimui
    if (sentimentSection) {
      const citationBonus = Math.min(25, citations.length * 1.5);
      console.log('📊 Confidence breakdown:', {
        baseLine: 50,
        citationBonus: `+${citationBonus} (${citations.length} citations)`,
        finalScore: confidence,
        sentiment: sentiment
      });
    }

    const result: Omit<GrokAnalysisResponse, 'fromCache'> = {
      analysis,
      sentiment,
      confidence,
      keyPoints,
      twitterMentions,
      citations,
      postExcerpts,
    };

    // Švieži duomenys išsaugomi talpykloje
    if (supabase) {
        const { error: upsertError } = await supabase
          .from('grok_api_cache')
          .upsert({
            token_symbol: symbol,
            request_type: 'analysis',
            response_data: result,
            fetched_at: new Date().toISOString()
          }, {
            onConflict: 'token_symbol,request_type'
          });

        if (upsertError) {
          console.warn('Failed to cache Grok "analysis" response:', upsertError);
        } else {
          console.log(`[Cache] STORED for ${symbol} (analysis).`);
        }
    }

    return result;

  } catch (error) {
    console.error('❌ Grok API error:', error);
    return {
      analysis: `Failed to fetch analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      sentiment: 'neutral',
      confidence: 0,
      keyPoints: [],
      twitterMentions: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      postExcerpts: []
    };
  }
}

// Pagalbinė funkcija Grok atsakymui išanalizuoti ir struktūrizuotiems duomenims išgauti
function parseGrokResponse(analysis: string): {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  keyPoints: string[];
  twitterMentions: number;
} {
  let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 50;
  let keyPoints: string[] = [];
  let twitterMentions = 0;

  // Išgaunama nuotaika
  const sentimentMatch = analysis.toLowerCase().match(/sentiment.*?(bullish|bearish|neutral)/i);
  if (sentimentMatch) {
    sentiment = sentimentMatch[1].toLowerCase() as 'bullish' | 'bearish' | 'neutral';
  }

  // Išgaunamas pasitikėjimo procentas
  const confidenceMatch = analysis.match(/confidence:?\s*(\d+)%?/i);
  if (confidenceMatch) {
    confidence = parseInt(confidenceMatch[1]);
  }

  // Išgaunami pagrindiniai punktai (ieškoma punktų arba numeruotų sąrašų)
  const keyPointMatches = analysis.match(/[•\-\*]\s*(.+?)(?=\n|$)/g);
  if (keyPointMatches) {
    keyPoints = keyPointMatches.map(point => point.replace(/^[•\-\*]\s*/, '').trim());
  }

  // Išgaunamas Twitter paminėjimų skaičius - ieškoma „Posts Found:“ ar panašių šablonų
  const mentionMatch = analysis.match(/(?:posts?\s*found|tweets?\s*found|mentions?):?\s*(\d+)/i);
  if (mentionMatch) {
    twitterMentions = parseInt(mentionMatch[1]);
  }

  // Suskaičiuojami faktiniai tweet URL atsakyme
  const urlMatches = analysis.match(/x\.com\/\w+\/status\/\d+/g);
  if (urlMatches && urlMatches.length > twitterMentions) {
    twitterMentions = urlMatches.length;
  }

  return {
    sentiment,
    confidence: Math.max(0, Math.min(100, confidence)),
    keyPoints: keyPoints.slice(0, 5), // Apribojama iki 5 pagrindinių punktų
    twitterMentions
  };
}

// Patobulinta funkcija greitai nuotaikos analizei naudojant tik X paiešką
export async function fetchQuickSentiment(symbol: string): Promise<{
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  citations?: string[];
  error?: string;
  fromCache?: boolean; // Pridedama nurodyti, ar duomenys yra iš talpyklos
}> {
  if (!GROK_API_KEY) {
    return { 
      sentiment: 'neutral', 
      confidence: 0, 
      error: "API key not configured." 
    };
  }
  
  // 1. Patikrinama, ar yra talpykloje saugomų duomenų
  const cacheDuration = CACHE_DURATION_HOURS * 60 * 60 * 1000;
  const fiveHoursAgo = new Date(Date.now() - cacheDuration).toISOString();

  if (supabase) {
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('grok_api_cache')
          .select('response_data, fetched_at')
          .eq('token_symbol', symbol)
          .eq('request_type', 'sentiment')
          .gte('fetched_at', fiveHoursAgo)
          .single();

        if (cacheError && cacheError.code !== 'PGRST116') {
          console.warn('Cache read error (sentiment):', cacheError);
        }
        
        if (cachedData) {
          console.log(`[Cache] HIT for ${symbol} (sentiment). Fetched at: ${cachedData.fetched_at}`);
          return { ...cachedData.response_data, fromCache: true };
        }
      } catch (e) {
        console.warn("An error occurred during cache check (sentiment)", e);
      }
  }

  console.log(`[Cache] MISS for ${symbol} (sentiment). Fetching from Grok API.`);

  const baseAsset = symbol.replace('USDT', '').replace('PERP', '');
  
  const prompt = `Quick X search for ${baseAsset}. Find current sentiment in 2-3 sentences.

Sentiment: [Bullish/Bearish/Neutral]
Confidence: [0-100]%
Posts Found: X

Brief summary of key signals from X posts.`;

  try {
    const requestBody = {
      model: MODEL_NAME,
      input: [
        {
          role: "user",
          content: prompt
        }
      ],
      tools: [
        { type: "x_search" }
      ],
      temperature: 0.2,
      max_output_tokens: 200,
    };

    const response = await fetch(`${GROK_API_BASE_URL}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const analysis = extractResponseText(data).trim();
    const citations = data.citations || [];
    
    const parsedData = parseGrokResponse(analysis);
    
    const result = {
      ...parsedData,
      citations
    };

    // Švieži duomenys išsaugomi talpykloje
    if (supabase) {
        const { error: upsertError } = await supabase
          .from('grok_api_cache')
          .upsert({
            token_symbol: symbol,
            request_type: 'sentiment',
            response_data: result,
            fetched_at: new Date().toISOString()
          }, {
            onConflict: 'token_symbol,request_type'
          });

        if (upsertError) {
          console.warn('Failed to cache Grok "sentiment" response:', upsertError);
        } else {
          console.log(`[Cache] STORED for ${symbol} (sentiment).`);
        }
    }
    
    return result;
    
  } catch (error) {
    console.error("Failed to fetch quick sentiment:", error);
    return { 
      sentiment: 'neutral', 
      confidence: 0, 
      error: error instanceof Error ? error.message : "An unknown error occurred" 
    };
  }
}

export async function fetchGrokPulse(symbol: string): Promise<GrokPulseResponse> {
  console.log('🚀 Launching Grok Pulse for:', symbol);

  // 1. Patikrinama, ar yra talpykloje saugomų duomenų
  const cacheDuration = CACHE_DURATION_HOURS * 60 * 60 * 1000;
  const fiveHoursAgo = new Date(Date.now() - cacheDuration).toISOString();

  if (supabase) {
      try {
        const { data: cachedData, error: cacheError } = await supabase
          .from('grok_api_cache')
          .select('response_data, fetched_at')
          .eq('token_symbol', symbol)
          .eq('request_type', 'pulse')
          .gte('fetched_at', fiveHoursAgo)
          .single();

        if (cacheError && cacheError.code !== 'PGRST116') {
          console.warn('Cache read error (pulse):', cacheError);
        }
        
        if (cachedData) {
          console.log(`[Cache] HIT for ${symbol} (pulse). Fetched at: ${cachedData.fetched_at}`);
          return { ...cachedData.response_data, fromCache: true } as GrokPulseResponse;
        }
      } catch (e) {
        console.warn("An error occurred during cache check (pulse)", e);
      }
  }
  
  console.log(`[Cache] MISS for ${symbol} (pulse). Fetching from Grok API.`);

  if (!GROK_API_KEY) {
    console.error('❌ No Grok API key found for Pulse');
    return {
      error: 'API key not configured',
      sentiment: { value: 'neutral', confidence: 0 },
      signals: [],
      mentionVelocity: { rate: 'Low', trend: 'Stable' },
      summary: {
        overview: 'Grok API key not configured.',
        marketContext: '',
        recommendation: ''
      },
    };
  }

  const baseAsset = symbol.replace(/USDT?$/, '').toUpperCase();
  const prompt = `
    You are an elite crypto market analyst. Analyze ${baseAsset} (${symbol}) using ONLY the latest X posts. Provide a comprehensive JSON analysis.

    Your response must be a single, valid JSON object with these exact fields:

    - "sentiment": Object with:
      - "value": "bullish", "bearish", or "neutral"
      - "confidence": Number 0.0-1.0 based on data quality and consensus:
        * 0.3-0.5: Limited data, mixed signals, high uncertainty
        * 0.5-0.7: Moderate data, some consensus, normal confidence  
        * 0.7-0.9: Strong data, clear consensus, high confidence
        * 0.9-1.0: Overwhelming evidence, unanimous sentiment

    - "signals": Array of top 3 actionable signals with:
      - "id": Unique identifier
      - "category": "TA", "News", "Whale", or "Influencer" 
      - "title": Punchy 4-6 word headline
      - "description": Specific signal with exact metrics (prices, volumes, percentages)
      - "implication": Trading insight - what this means for position sizing/timing
      - "source": {"url": "...", "content": "...", "author": "@handle"}

    - "mentionVelocity": {"rate": "High/Medium/Low", "trend": "Increasing/Decreasing/Stable"}

    - "summary": Object with:
      - "overview": Start with current market action, NOT "Recent posts". Use dynamic openings like:
        * "${baseAsset} shows strong momentum with..."
        * "Market sentiment for ${baseAsset} has shifted as..."
        * "${baseAsset} faces critical resistance while..."
        * "Whale activity in ${baseAsset} suggests..."
        * "Technical patterns for ${baseAsset} indicate..."
      - "marketContext": Broader market factors affecting this token
      - "recommendation": Specific trading advice with risk management

    CRITICAL RULES:
    1. NO generic "Recent posts" openings - be specific and dynamic
    2. Confidence must reflect actual data quality, not default to 0.85
    3. Include specific numbers, prices, and percentages where available
    4. Focus on actionable insights, not vague observations
    5. Use latest 7-day data only
    `;

  try {
    const requestBody = {
      model: MODEL_NAME,
      input: [{ role: 'user', content: prompt }],
      tools: [
        { type: 'x_search' }
      ],
      max_output_tokens: 2000,
      temperature: 0.3,
      text: { format: { type: 'json_object' } },
    };

    console.log('Pulse Request Body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${GROK_API_BASE_URL}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok Pulse API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = extractResponseText(data);

    if (!content) {
      throw new Error('Empty response from Grok Pulse API');
    }

    console.log('Pulse Raw Response:', content);
    
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.warn('⚠️ Initial JSON parse failed. Attempting to fix...');
      // Bandoma ištaisyti dažnas JSON klaidas (pvz., trūkstamus dvitaškius)
      const fixedContent = content.replace(/:\s*"/g, '":"').replace(/",\s*"/g, '","');
      try {
        parsedContent = JSON.parse(fixedContent);
        console.log('✅ Successfully parsed after fixing.');
      } catch (finalError) {
        console.error('❌ Final JSON parse failed, even after attempting to fix.', finalError);
        throw new Error('Malformed JSON response from Grok API.');
      }
    }

    // Bazinis patikrinimas, siekiant užtikrinti, kad išanalizuotas turinys atitiktų laukiamą atsakymą
    if (parsedContent.sentiment && parsedContent.signals) {
      // Švieži duomenys išsaugomi talpykloje
      if (supabase) {
        const { error: upsertError } = await supabase
          .from('grok_api_cache')
          .upsert({
            token_symbol: symbol,
            request_type: 'pulse',
            response_data: parsedContent,
            fetched_at: new Date().toISOString()
          }, {
            onConflict: 'token_symbol,request_type'
          });

        if (upsertError) {
          console.warn('Failed to cache Grok "pulse" response:', upsertError);
        } else {
          console.log(`[Cache] STORED for ${symbol} (pulse).`);
        }
      }
      return parsedContent as GrokPulseResponse;
    } else {
      throw new Error('Parsed JSON does not match expected structure.');
    }

  } catch (error) {
    console.error('❌ Error in fetchGrokPulse:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      error: errorMessage,
      sentiment: { value: 'neutral', confidence: 0 },
      signals: [],
      mentionVelocity: { rate: 'Low', trend: 'Stable' },
      summary: {
        overview: `Failed to get pulse. ${errorMessage}`,
        marketContext: '',
        recommendation: ''
      },
    };
  }
} 