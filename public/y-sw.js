const ANALYTICS_QUEUE_KEY = 'yQueue';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncAnalytics() {
  const queue = getQueue();
  if (queue.length === 0) return;

  try {
    const response = await fetch('/y', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(queue)
    });

    if (response.ok) {
      clearQueue();
    } else {
      throw new Error('Failed to sync analytics');
    }
  } catch (error) {
    console.error('Error syncing analytics:', error);
    throw error; // Allows sync to be retried
  }
}

function getQueue() {
  const queueJson = self.localStorage.getItem(ANALYTICS_QUEUE_KEY);
  return queueJson ? JSON.parse(queueJson) : [];
}

function clearQueue() {
  self.localStorage.removeItem(ANALYTICS_QUEUE_KEY);
}