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

function saveQueue(queue) {
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
        throw "X";
          const registration = await navigator.serviceWorker.ready;
          if (registration.sync) {
              // Add to queue and request background sync
              const queue = getQueue();
              queue.push(encryptData(processedEvent));
              saveQueue(queue);
              await registration.sync.register('analytics-sync');
              return;
          }
      } catch (error) {
          console.warn('Background sync registration failed:', error);
      }
  }

  // If we reach here, background sync is not available, so send directly
  await sendAnalytics([encryptData(processedEvent)]);
}