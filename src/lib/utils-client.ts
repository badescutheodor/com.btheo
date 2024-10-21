import React from "react";
import ReactDOM from "react-dom/client";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || "";

function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
}

type DebouncedFunction<T extends (...args: any[]) => any> = (
  ...args: Parameters<T>
) => void;

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

export const confirm = ({
  message,
  title,
}: {
  message: string;
  title: string;
}): Promise<boolean> => {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = ReactDOM.createRoot(container);

    const handleConfirm = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(true);
    };

    const handleCancel = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve(false);
    };

    root.render(
      React.createElement(ConfirmationModal, {
        onClose: handleCancel,
        onConfirm: handleConfirm,
        isOpen: true,
        message,
        title,
      })
    );
  });
};

interface AnalyticsData {
  deviceType: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
  pixelRatio: number;
  language: string;
  timeZone: string;
  cookiesEnabled: boolean;
  referrer: string;
  url: string;
  timestamp: string;
  doNotTrack: boolean;
  adBlockerDetected: boolean;
  connectionType: string;
  isOnline: boolean;
  batteryStatus: string;
  isPWA: boolean;
  pageLoadTime: number;
  memoryInfo: MemoryInfo | null;
  networkInfo: NetworkInfo | null;
  hardwareConcurrency: number;
  touchPoints: number;
  geolocation: GeolocationInfo | null;
  plugins: string[];
  canvas: string;
  webGL: WebGLInfo | null;
  audio: AudioInfo | null;
}

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface NetworkInfo {
  downlink: number;
  effectiveType: string;
  rtt: number;
  saveData: boolean;
}

interface GeolocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface WebGLInfo {
  vendor: string;
  renderer: string;
}

interface AudioInfo {
  sampleRate: number;
  channelCount: number;
  state: string;
}

export const getAnalyticsData = (): AnalyticsData => {
  const userAgent = navigator.userAgent;
  let deviceType: string, browserName: string, browserVersion: string, osName: string, osVersion: string;

  // Detect device type
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    deviceType = /iPad/i.test(userAgent) ? 'tablet' : 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // Detect browser
  if (userAgent.indexOf("Chrome") > -1) {
    browserName = "Chrome";
    browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1] ?? "Unknown";
  } else if (userAgent.indexOf("Safari") > -1) {
    browserName = "Safari";
    browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)?.[1] ?? "Unknown";
  } else if (userAgent.indexOf("Firefox") > -1) {
    browserName = "Firefox";
    browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1] ?? "Unknown";
  } else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident/") > -1) {
    browserName = "Internet Explorer";
    browserVersion = userAgent.match(/(?:MSIE |rv:)(\d+\.\d+)/)?.[1] ?? "Unknown";
  } else if (userAgent.indexOf("Edge") > -1) {
    browserName = "Edge";
    browserVersion = userAgent.match(/Edge\/(\d+\.\d+)/)?.[1] ?? "Unknown";
  } else {
    browserName = "Unknown";
    browserVersion = "Unknown";
  }

  // Detect OS
  if (userAgent.indexOf("Win") > -1) {
    osName = "Windows";
    osVersion = userAgent.match(/Windows NT (\d+\.\d+)/)?.[1] ?? "Unknown";
  } else if (userAgent.indexOf("Mac") > -1) {
    osName = "MacOS";
    osVersion = userAgent.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace('_', '.') ?? "Unknown";
  } else if (userAgent.indexOf("Linux") > -1) {
    osName = "Linux";
    osVersion = "Unknown";
  } else if (userAgent.indexOf("Android") > -1) {
    osName = "Android";
    osVersion = userAgent.match(/Android (\d+\.\d+)/)?.[1] ?? "Unknown";
  } else if (userAgent.indexOf("iOS") > -1) {
    osName = "iOS";
    osVersion = userAgent.match(/OS (\d+_\d+)/)?.[1]?.replace('_', '.') ?? "Unknown";
  } else {
    osName = "Unknown";
    osVersion = "Unknown";
  }

  // Check for ad blocker (basic check)
  const adBlockerCheck = (): boolean => {
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    document.body.appendChild(testAd);
    const adBlockerDetected = testAd.offsetHeight === 0;
    document.body.removeChild(testAd);
    return adBlockerDetected;
  };

  // Get memory info
  const getMemoryInfo = (): MemoryInfo | null => {
    const memory = (performance as any).memory;
    return memory ? {
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize
    } : null;
  };

  // Get network info
  const getNetworkInfo = (): NetworkInfo | null => {
    const connection = (navigator as any).connection;
    return connection ? {
      downlink: connection.downlink,
      effectiveType: connection.effectiveType,
      rtt: connection.rtt,
      saveData: connection.saveData
    } : null;
  };

  // Get geolocation (Note: This is asynchronous and requires user permission)
  const getGeolocation = (): Promise<GeolocationInfo | null> => {
    return new Promise((resolve) => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }),
          () => resolve(null)
        );
      } else {
        resolve(null);
      }
    });
  };

  // Get WebGL info
  function getWebGLInfo(): { vendor: string; renderer: string } | null {
    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | null;
  
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    } catch (e) {
      return null;
    }
  
    if (!gl) {
      return null;
    }
  
    let vendor: string | null = null;
    let renderer: string | null = null;
  
    // Type assertion for debug info extension
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info') as WEBGL_debug_renderer_info | null;
  
    if (debugInfo) {
      try {
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
      } catch (e) {
        // Some browsers might throw an error when accessing debug info
      }
    }
  
    // Fallback to standard parameters if debug info is not available
    if (!vendor) vendor = gl.getParameter(gl.VENDOR) as string;
    if (!renderer) renderer = gl.getParameter(gl.RENDERER) as string;
  
    return {
      vendor: vendor || 'unknown',
      renderer: renderer || 'unknown'
    };
  }
  
  // For TypeScript to recognize the WEBGL_debug_renderer_info interface
  interface WEBGL_debug_renderer_info {
    UNMASKED_VENDOR_WEBGL: number;
    UNMASKED_RENDERER_WEBGL: number;
  }

  // Get Audio info
  const getAudioInfo = (): AudioInfo | null => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return {
      sampleRate: audioContext.sampleRate,
      channelCount: audioContext.destination.channelCount,
      state: audioContext.state
    };
  };

  // Generate canvas fingerprint
  const getCanvasFingerprint = (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 200;
    canvas.height = 50;
    ctx.font = '18px Arial';
    ctx.fillText('Canvas Fingerprint', 10, 30);
    return canvas.toDataURL();
  };

  return {
    deviceType,
    browserName,
    browserVersion,
    osName,
    osVersion,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    colorDepth: window.screen.colorDepth,
    pixelRatio: window.devicePixelRatio || 1,
    language: navigator.language || (navigator as any).userLanguage,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    cookiesEnabled: navigator.cookieEnabled,
    referrer: document.referrer,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    doNotTrack: navigator.doNotTrack === "1" || (window as any).doNotTrack === "1",
    adBlockerDetected: adBlockerCheck(),
    connectionType: (navigator as any).connection ? (navigator as any).connection.effectiveType : 'unknown',
    isOnline: navigator.onLine,
    batteryStatus: 'unknown', // Requires async API, not included in this sync function
    isPWA: window.matchMedia('(display-mode: standalone)').matches,
    pageLoadTime: performance.now(),
    memoryInfo: getMemoryInfo(),
    networkInfo: getNetworkInfo(),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    touchPoints: navigator.maxTouchPoints || 0,
    geolocation: null, // Requires async API and user permission, not included in this sync function
    plugins: Array.from(navigator.plugins).map(p => p.name),
    canvas: getCanvasFingerprint(),
    webGL: getWebGLInfo(),
    audio: getAudioInfo(),
  };
};

const ANALYTICS_QUEUE_KEY = 'yQueue';

export enum AnalyticType {
  PAGE_VIEW = 1,
  CLICK = 2,
  SCROLL = 3,
  FORM_SUBMISSION = 4,
  CUSTOM_EVENT = 5,
  ERROR = 6,
  CONVERSION = 7,
  PAGE_LOAD = 8,
  PAGE_UNLOAD = 9,
  SESSION_START = 10,
  EXTERNAL_LINK_CLICK = 11,
}

function processEventType(eventType: AnalyticType | string): number {
  if (typeof eventType === 'string') {
      const enumValue = AnalyticType[eventType as keyof typeof AnalyticType];
      if (enumValue !== undefined) {
          return enumValue;
      } else {
          console.warn(`Unknown analytic type: ${eventType}. Defaulting to CUSTOM_EVENT.`);
          return AnalyticType.CUSTOM_EVENT;
      }
  }

  return eventType;
}

function getQueue() {
  const queueJson = localStorage.getItem(ANALYTICS_QUEUE_KEY);
  return queueJson ? JSON.parse(queueJson) : [];
}

function saveQueue(queue: string) {
  localStorage.setItem(ANALYTICS_QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue() {
  const queue = getQueue();
  if (queue.length === 0) return;

  try {
    const response = await fetch('/y', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: queue })
    });

    if (response.ok) {
      localStorage.removeItem(ANALYTICS_QUEUE_KEY);
    } else {
      console.error('Failed to flush analytics queue');
    }
  } catch (error) {
    console.error('Error flushing analytics queue:', error);
  }
}

async function sendAnalytics(events: any[]): Promise<void> {
  try {
      const response = await fetch('/y', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({ data: events })
      });

      if (!response.ok) {
          throw new Error('Failed to send analytics');
      }
  } catch (error) {
      console.error('Error sending analytics:', error);
      // Optionally, we could add failed events back to the queue here
  }
}

export async function y(type: string | number, data?: Record<string, unknown>) {
  const processedEvent: any = {
    type: processEventType(type),
  };

  if (data) {
    processedEvent.data = data;
  }

  // Check if service worker and background sync are available
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
              // Add to queue and request background sync
              const queue = getQueue();
              queue.push(encryptData(processedEvent));
              saveQueue(queue);
              await (registration as any).sync.register('analytics-sync');
              return;
          }
      } catch (error) {
          console.warn('Background sync registration failed:', error);
      }
  }

  // If we reach here, background sync is not available, so send directly
  await sendAnalytics([encryptData(processedEvent)]);
}

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

interface ChannelDetectionResult {
  channel: string;
  utmParams: UtmParams;
  isNewSession: boolean;
}

type ReferralCategories = {
  [key: string]: string[];
};

type SearchEngines = {
  [key: string]: string;
};

export function detectChannel(): ChannelDetectionResult {
  const ATTRIBUTION_WINDOW = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const CHANNEL_STORAGE_KEY = 'userChannel';
  const CHANNEL_TIMESTAMP_KEY = 'channelTimestamp';
  const UTM_STORAGE_KEY = 'utmParams';

  const PAID_KEYWORDS: string[] = ['ppc', 'cpc', 'cpm', 'cpv', 'paidsearch', 'adwords'];
  const ORGANIC_SOCIAL: string[] = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'pinterest.com', 't.co'];
  const PAID_SOCIAL: string[] = ['facebook:ad', 'instagram:ad', 'liads', 'ads.twitter.com'];
  
  const SEARCH_ENGINES: SearchEngines = {
    'google': 'Google',
    'bing': 'Bing',
    'yahoo': 'Yahoo',
    'baidu': 'Baidu',
    'duckduckgo': 'DuckDuckGo',
    'yandex': 'Yandex'
  };

  const REFERRAL_CATEGORIES: ReferralCategories = {
    'news': ['nytimes.com', 'cnn.com', 'bbc.com', 'theguardian.com'],
    'tech': ['techcrunch.com', 'wired.com', 'cnet.com', 'theverge.com'],
    'ecommerce': ['amazon.com', 'ebay.com', 'etsy.com', 'shopify.com']
  };

  function getUrlParams(): URLSearchParams {
    return new URLSearchParams(window.location.search);
  }

  function isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > ATTRIBUTION_WINDOW;
  }

  function categorizeReferral(referrer: string): string {
    const domain = new URL(referrer).hostname;
    for (const [category, domains] of Object.entries(REFERRAL_CATEGORIES)) {
      if (domains.some(d => domain.includes(d))) {
        return `referral_${category}`;
      }
    }
    return 'referral_other';
  }

  function detectPaidSearch(source: string | undefined, medium: string | undefined, term: string | undefined): string | null {
    if (PAID_KEYWORDS.some(keyword => medium?.includes(keyword))) {
      return `paid_search_${source || 'unknown'}`;
    }
    if (source === 'google' && medium === 'cpc') {
      return 'paid_search_google';
    }
    if (term && PAID_KEYWORDS.some(keyword => term.includes(keyword))) {
      return `paid_search_${source || 'unknown'}`;
    }
    return null;
  }

  function detectSocial(referrer: string, utmSource: string | undefined, utmMedium: string | undefined): string | null {
    if (PAID_SOCIAL.some(domain => referrer.includes(domain) || utmSource?.includes(domain))) {
      return 'paid_social';
    }
    if (ORGANIC_SOCIAL.some(domain => referrer.includes(domain))) {
      return 'organic_social';
    }
    if (utmSource && ORGANIC_SOCIAL.some(domain => utmSource.includes(domain))) {
      return utmMedium === 'cpc' ? 'paid_social' : 'organic_social';
    }
    return null;
  }

  function detectSearchEngine(referrer: string): string | null {
    for (const [key, value] of Object.entries(SEARCH_ENGINES)) {
      if (referrer.includes(key)) {
        return `organic_search_${value.toLowerCase()}`;
      }
    }
    return null;
  }

  function saveChannelData(channel: string, utmParams: UtmParams): void {
    localStorage.setItem(CHANNEL_STORAGE_KEY, channel);
    localStorage.setItem(CHANNEL_TIMESTAMP_KEY, Date.now().toString());
    if (Object.keys(utmParams).length > 0) {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams));
    }
  }

  // Check if we have a recent stored channel
  const storedChannel = localStorage.getItem(CHANNEL_STORAGE_KEY);
  const timestamp = parseInt(localStorage.getItem(CHANNEL_TIMESTAMP_KEY) || '0');
  if (storedChannel && !isExpired(timestamp)) {
    return {
      channel: storedChannel,
      utmParams: JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) || '{}'),
      isNewSession: false
    };
  }

  // If we're here, we need to detect a new channel
  const urlParams = getUrlParams();
  const utmSource = urlParams.get('utm_source')?.toLowerCase();
  const utmMedium = urlParams.get('utm_medium')?.toLowerCase();
  const utmCampaign = urlParams.get('utm_campaign')?.toLowerCase();
  const utmTerm = urlParams.get('utm_term')?.toLowerCase();
  const utmContent = urlParams.get('utm_content')?.toLowerCase();
  
  const referrer = document.referrer.toLowerCase();

  const utmParams: UtmParams = {
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: utmTerm,
    utm_content: utmContent
  };

  let channel: string;

  // Check for paid search
  channel = detectPaidSearch(utmSource, utmMedium, utmTerm) || '';
  if (channel) {
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // Check for social
  channel = detectSocial(referrer, utmSource, utmMedium) || '';
  if (channel) {
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // Check for organic search
  channel = detectSearchEngine(referrer) || '';
  if (channel) {
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // Check for email
  if (utmMedium === 'email') {
    channel = 'email';
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // Check for referral
  if (referrer && new URL(referrer).hostname !== window.location.hostname) {
    channel = categorizeReferral(referrer);
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // If utm_source exists but hasn't been categorized yet, use it as the channel
  if (utmSource) {
    channel = `other_${utmSource}`;
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // Direct
  if (!referrer) {
    channel = 'direct';
    saveChannelData(channel, utmParams);
    return { channel, utmParams, isNewSession: true };
  }

  // Fallback
  channel = 'other';
  saveChannelData(channel, utmParams);
  return { channel, utmParams, isNewSession: true };
}