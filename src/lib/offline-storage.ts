interface OfflineTrip {
  id: string;
  tripId: string;
  vendorId: string;
  vehicleNumber: string;
  driverName?: string;
  driverPhone?: string;
  startLocation: string;
  endLocation: string;
  startTime: string;
  endTime?: string;
  distance?: number;
  fare?: number;
  status: string;
  grNumber?: string;
  notes?: string;
  isOffline: boolean;
  createdAt: string;
}

class OfflineStorage {
  private static DB_NAME = 'VendorBookingDB';
  private static STORE_NAME = 'trips';
  private static VERSION = 1;

  static async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OfflineStorage.DB_NAME, OfflineStorage.VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(OfflineStorage.STORE_NAME)) {
          const store = db.createObjectStore(OfflineStorage.STORE_NAME, { keyPath: 'id' });
          store.createIndex('tripId', 'tripId', { unique: true });
          store.createIndex('createdAt', 'createdAt');
        }
      };
    });
  }

  static async saveTrip(trip: OfflineTrip): Promise<void> {
    return new Promise((resolve, reject) => {
      this.initDB().then(db => {
        const tx = db.transaction([OfflineStorage.STORE_NAME], 'readwrite');
        const store = tx.objectStore(OfflineStorage.STORE_NAME);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        
        store.put(trip);
      }).catch(reject);
    });
  }

  static async getTrips(): Promise<OfflineTrip[]> {
    return new Promise((resolve, reject) => {
      this.initDB().then(db => {
        const tx = db.transaction([OfflineStorage.STORE_NAME], 'readonly');
        const store = tx.objectStore(OfflineStorage.STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }).catch(reject);
    });
  }

  static async getTrip(id: string): Promise<OfflineTrip | null> {
    return new Promise((resolve, reject) => {
      this.initDB().then(db => {
        const tx = db.transaction([OfflineStorage.STORE_NAME], 'readonly');
        const store = tx.objectStore(OfflineStorage.STORE_NAME);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      }).catch(reject);
    });
  }

  static async deleteTrip(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.initDB().then(db => {
        const tx = db.transaction([OfflineStorage.STORE_NAME], 'readwrite');
        const store = tx.objectStore(OfflineStorage.STORE_NAME);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        
        store.delete(id);
      }).catch(reject);
    });
  }

  static async clearTrips(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.initDB().then(db => {
        const tx = db.transaction([OfflineStorage.STORE_NAME], 'readwrite');
        const store = tx.objectStore(OfflineStorage.STORE_NAME);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        
        store.clear();
      }).catch(reject);
    });
  }

  static async syncTrips(trips: OfflineTrip[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.initDB().then(db => {
        const tx = db.transaction([OfflineStorage.STORE_NAME], 'readwrite');
        const store = tx.objectStore(OfflineStorage.STORE_NAME);
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        
        trips.forEach(trip => {
          store.put(trip);
        });
      }).catch(reject);
    });
  }
}

export default OfflineStorage;
