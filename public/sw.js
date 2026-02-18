const CACHE_NAME = 'vendor-booking-cache-v1';
const OFFLINE_TRIPS_KEY = 'offline-trips';

self.addEventListener('install', (event) => {
  event.waitUntil().then(() => {
    return self.clients.claimAll();
  });
});

self.addEventListener('activate', (event) => {
  event.waitUntil().then(() => {
    return self.clients.claimAll();
  });
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).then((response) => {
        // Cache successful API responses
        if (response.ok && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  event.waitUntil(
    syncOfflineTrips().then(() => {
      self.registration.showNotification('Trips synced successfully', {
        icon: '/icon-192x192.png',
        tag: 'sync-success',
        body: 'All offline trips have been synced to the server.',
      });
    })
  );
});

async function syncOfflineTrips() {
  try {
    const offlineTrips = await getOfflineTrips();
    
    if (offlineTrips.length === 0) {
      return;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trips/bulk-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
      body: JSON.stringify({ trips: offlineTrips }),
    });

    if (response.ok) {
      await clearOfflineTrips();
      return true;
    }
    
    throw new Error('Sync failed');
  } catch (error) {
    console.error('Sync error:', error);
    return false;
  }
}

async function getOfflineTrips() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VendorBookingDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['trips'], 'readonly');
      const store = transaction.objectStore('trips');
      
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function clearOfflineTrips() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VendorBookingDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['trips'], 'readwrite');
      const store = transaction.objectStore('trips');
      
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    };
  });
}
