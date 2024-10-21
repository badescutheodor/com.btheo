"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  y,
  flushQueue,
  AnalyticType,
  getAnalyticsData,
  detectChannel,
} from "../../lib/utils-client";

interface AnalyticsContextType {
  y: (type: string | number, data?: object) => Promise<void>;
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
    async (type: string | number, data?: Record<string, unknown>) => {
      try {
        await y(type, data);
      } catch (error) {
        console.error("Failed to track event:", error);
      }
    },
    []
  );

  const trackSessionStart = useCallback(() => {
    if (!hasTrackedSessionStart.current) {
      trackEvent(AnalyticType.SESSION_START);
      hasTrackedSessionStart.current = true;
    }
  }, [trackEvent]);

  const trackPageLoad = useCallback(() => {
    if (!hasTrackedPageLoad.current) {
      trackEvent(AnalyticType.PAGE_LOAD);
      hasTrackedPageLoad.current = true;
    }
  }, [trackEvent]);

  const trackPageView = useCallback(() => {
    trackEvent(AnalyticType.PAGE_VIEW, {
      pathname: pathname,
      params: searchParams,
      ...getAnalyticsData(),
      ...detectChannel(),
    });
  }, [trackEvent, pathname, searchParams]);

  const setupClickTracking = useCallback(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const closestLink = target.closest("a");

      if (closestLink) {
        const href = closestLink.getAttribute("href");
        if (href) {
          const isExternal =
            href.startsWith("http") && !href.includes(window.location.hostname);

          if (isExternal) {
            trackEvent(AnalyticType.EXTERNAL_LINK_CLICK, {
              url: href,
              elementType: closestLink.tagName,
              linkText: closestLink.textContent,
            });
          } else {
            trackEvent(AnalyticType.CLICK, {
              linkText: closestLink.textContent,
            });
          }
        }
      } else {
        trackEvent(AnalyticType.CLICK, {
          elementType: target.tagName,
          coords: { x: e.clientX, y: e.clientY },
        });
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [trackEvent]);

  const setupScrollTracking = useCallback(() => {
    let lastScrollPosition = 0;
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      if (Math.abs(scrollPosition - lastScrollPosition) > 300) {
        // Track every 300px of scroll
        trackEvent(AnalyticType.SCROLL, {
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
      trackEvent(AnalyticType.FORM_SUBMISSION, {
        formId: form.id,
        formAction: form.action,
      });
    };
    document.addEventListener("submit", handleSubmit);
    return () => document.removeEventListener("submit", handleSubmit);
  }, [trackEvent]);

  const setupErrorTracking = useCallback(() => {
    const handleError = (error: ErrorEvent) => {
      trackEvent(AnalyticType.ERROR, {
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
      trackEvent(AnalyticType.PAGE_UNLOAD, {});
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [trackEvent]);

  const cleanupEventListeners = () => {
    // This function is called in the useEffect cleanup
    // If you need to manually remove any event listeners, you can do it here
  };

  return (
    <AnalyticsContext.Provider value={{ y: trackEvent }}>
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
