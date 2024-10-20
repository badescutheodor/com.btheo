"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { y, flushQueue } from "../../lib/utils-client";

enum EventType {
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
}

interface AnalyticsContextType {
  y: (type: EventType, data: object) => Promise<void>;
  trackCustomEvent: (eventName: string, eventData: object) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
}) => {
  const hasTrackedPageLoad = useRef(false);
  const hasTrackedSessionStart = useRef(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const setupAnalytics = async () => {
      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "Notification" in window
      ) {
        try {
          const registration = await navigator.serviceWorker.register(
            "/y-sw.js"
          );
          console.log(
            "Analytics Service Worker registered with scope:",
            registration.scope
          );

          if ("periodicSync" in registration) {
            try {
              await (registration as any).periodicSync.register(
                "analytics-sync",
                {
                  minInterval: 24 * 60 * 60 * 1000, // 1 day
                }
              );
            } catch (error) {
              console.warn("Periodic background sync cannot be used:", error);
            }
          }
        } catch (error) {
          console.error("Error setting up analytics:", error);
        }
      } else {
        console.warn("Service Worker or Notification API not supported");
      }
    };

    setupAnalytics();

    const messageHandler = (event: MessageEvent) => {
      if (event.data && event.data.type === "FLUSH_ANALYTICS") {
        flushQueue();
      }
    };

    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", messageHandler);
    }

    // Automated event tracking setup
    trackSessionStart();
    trackPageLoad();
    setupClickTracking();
    setupScrollTracking();
    setupFormSubmissionTracking();
    setupErrorTracking();
    setupPageUnloadTracking();

    return () => {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", messageHandler);
      }
      cleanupEventListeners();
    };
  }, []);

  // Track route changes
  useEffect(() => {
    trackPageView();
  }, [pathname, searchParams]);

  const trackEvent = useCallback(
    async (type: string | number, data?: object) => {
      try {
        await y({
          type,
          data,
        });
      } catch (error) {
        console.error("Failed to track event:", error);
      }
    },
    []
  );

  const trackCustomEvent = useCallback(
    async (eventName: string, eventData: object) => {
      await trackEvent(EventType.CUSTOM_EVENT, { eventName, ...eventData });
    },
    [trackEvent]
  );

  const trackSessionStart = useCallback(() => {
    if (!hasTrackedSessionStart.current) {
      trackEvent(EventType.SESSION_START);
      hasTrackedSessionStart.current = true;
    }
  }, [trackEvent]);

  const trackPageLoad = useCallback(() => {
    if (!hasTrackedPageLoad.current) {
      trackEvent(EventType.PAGE_LOAD);
      hasTrackedPageLoad.current = true;
    }
  }, [trackEvent]);

  const trackPageView = useCallback(() => {
    trackEvent(EventType.PAGE_VIEW, {
      url: window.location.href,
      pathname: pathname,
      params: searchParams,
    });
  }, [trackEvent, pathname, searchParams]);

  const setupClickTracking = useCallback(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      trackEvent(EventType.CLICK, {
        elementType: target.tagName,
        elementId: target.id,
        elementClasses: Array.from(target.classList).join(", "),
      });
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [trackEvent]);

  const setupScrollTracking = useCallback(() => {
    let lastScrollPosition = 0;
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (Math.abs(scrollPosition - lastScrollPosition) > 300) {
        // Track every 100px of scroll
        trackEvent(EventType.SCROLL, {
          scrollPosition,
        });
        lastScrollPosition = scrollPosition;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [trackEvent]);

  const setupFormSubmissionTracking = useCallback(() => {
    const handleSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      trackEvent(EventType.FORM_SUBMISSION, {
        formId: form.id,
        formAction: form.action,
      });
    };
    document.addEventListener("submit", handleSubmit);
    return () => document.removeEventListener("submit", handleSubmit);
  }, [trackEvent]);

  const setupErrorTracking = useCallback(() => {
    const handleError = (error: ErrorEvent) => {
      trackEvent(EventType.ERROR, {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        colno: error.colno,
      });
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [trackEvent]);

  const setupPageUnloadTracking = useCallback(() => {
    const handleUnload = () => {
      trackEvent(EventType.PAGE_UNLOAD, {});
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [trackEvent]);

  const cleanupEventListeners = () => {};

  return (
    <AnalyticsContext.Provider value={{ y: trackEvent, trackCustomEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = (): AnalyticsContextType => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
};
