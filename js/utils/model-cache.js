// Model caching system using IndexedDB
// Similar pattern to WebLLM model caching

const DB_NAME = 'onnx-models';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const MAX_CACHE_SIZE = 500 * 1024 * 1024; // 500MB limit

let db = null;

/**
 * Initialize IndexedDB database
 */
async function initDB() {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('size', 'size', { unique: false });
      }
    };
  });
}

/**
 * Get cached model data
 * @param {string} modelKey - Unique key for the model (e.g., 'realesrgan-x4plus-v1')
 * @returns {Promise<ArrayBuffer|null>} Cached model data or null if not found
 */
export async function getCachedModel(modelKey) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(modelKey);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          // Update timestamp for LRU
          updateTimestamp(modelKey).catch(console.error);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to read from cache'));
      };
    });
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Cache model data
 * @param {string} modelKey - Unique key for the model
 * @param {ArrayBuffer} modelData - The model data to cache
 * @param {string} url - Source URL of the model
 * @returns {Promise<void>}
 */
export async function cacheModel(modelKey, modelData, url) {
  try {
    const database = await initDB();
    
    // Check cache size and evict if needed (in separate transaction)
    await enforceCacheLimit(database, modelData.byteLength);
    
    // Wait a bit to ensure previous transaction is fully complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Create new transaction for the put operation
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const modelRecord = {
        key: modelKey,
        data: modelData,
        url: url,
        timestamp: Date.now(),
        size: modelData.byteLength
      };
      
      const request = store.put(modelRecord);
      
      request.onsuccess = () => {
        // Wait for transaction to complete before resolving
        transaction.oncomplete = () => {
          resolve();
        };
        // If transaction already completed, resolve immediately
        if (transaction.readyState === 'done') {
          resolve();
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to cache model'));
      };
      
      transaction.onerror = () => {
        reject(new Error('Transaction failed'));
      };
    });
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - caching is optional, continue even if it fails
    console.warn('Model caching failed, but continuing without cache');
  }
}

/**
 * Update timestamp for LRU eviction
 */
async function updateTimestamp(modelKey) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(modelKey);
    
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        result.timestamp = Date.now();
        store.put(result);
      }
    };
  } catch (error) {
    console.error('Failed to update timestamp:', error);
  }
}

/**
 * Enforce cache size limit using LRU eviction
 */
async function enforceCacheLimit(database, newModelSize) {
  try {
    // First, get total cache size in a read-only transaction
    const readTransaction = database.transaction([STORE_NAME], 'readonly');
    const readStore = readTransaction.objectStore(STORE_NAME);
    const totalSize = await getTotalCacheSize(readStore);
    const targetSize = MAX_CACHE_SIZE - newModelSize;
    
    if (totalSize <= targetSize) {
      return; // No eviction needed
    }
    
    // Wait for read transaction to complete
    await new Promise((resolve) => {
      readTransaction.oncomplete = resolve;
      readTransaction.onerror = resolve; // Continue even if read fails
    });
    
    // Now do eviction in a separate write transaction
    return new Promise((resolve, reject) => {
      const writeTransaction = database.transaction([STORE_NAME], 'readwrite');
      const writeStore = writeTransaction.objectStore(STORE_NAME);
      
      const getAllRequest = writeStore.getAll();
      
      getAllRequest.onsuccess = () => {
        const models = getAllRequest.result;
        
        // Sort by timestamp (oldest first)
        models.sort((a, b) => a.timestamp - b.timestamp);
        
        // Evict oldest models until we're under the limit
        let currentSize = totalSize;
        const toDelete = [];
        
        for (const model of models) {
          if (currentSize <= targetSize) {
            break;
          }
          toDelete.push(model.key);
          currentSize -= model.size;
        }
        
        // Delete evicted models
        if (toDelete.length > 0) {
          let deleteCount = 0;
          const deleteComplete = () => {
            deleteCount++;
            if (deleteCount === toDelete.length) {
              writeTransaction.oncomplete = resolve;
            }
          };
          
          toDelete.forEach(key => {
            const deleteRequest = writeStore.delete(key);
            deleteRequest.onsuccess = deleteComplete;
            deleteRequest.onerror = deleteComplete; // Continue even if one fails
          });
        } else {
          writeTransaction.oncomplete = resolve;
        }
      };
      
      getAllRequest.onerror = () => {
        // If we can't get models, just resolve (no eviction)
        resolve();
      };
      
      writeTransaction.onerror = () => {
        // If eviction fails, just resolve (continue without eviction)
        resolve();
      };
    });
  } catch (error) {
    console.error('Cache limit enforcement error:', error);
    // Don't throw - eviction is optional, continue even if it fails
    return;
  }
}

/**
 * Get total cache size
 */
async function getTotalCacheSize(store) {
  return new Promise((resolve, reject) => {
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const models = getAllRequest.result;
      const totalSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
      resolve(totalSize);
    };
    
    getAllRequest.onerror = () => reject(new Error('Failed to get cache size'));
  });
}

/**
 * Download model with progress tracking
 * @param {string} url - URL to download from
 * @param {Function} progressCallback - Callback for progress updates (bytesLoaded, bytesTotal)
 * @returns {Promise<ArrayBuffer>} Downloaded model data
 */
export async function downloadModel(url, progressCallback) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onprogress = (event) => {
      if (event.lengthComputable && progressCallback) {
        progressCallback(event.loaded, event.total);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else if (xhr.status === 404) {
        reject(new Error(`Model not found (404). The model file is not available at: ${url}`));
      } else {
        reject(new Error(`Failed to download model: HTTP ${xhr.status}`));
      }
    };
    
    xhr.onerror = () => {
      // Check if it's a CORS error
      const errorMsg = xhr.status === 0 
        ? 'CORS error: The model URL does not allow cross-origin requests. Please use a CDN that supports CORS (like jsDelivr) or host the model locally.'
        : 'Network error while downloading model';
      reject(new Error(errorMsg));
    };
    
    xhr.send();
  });
}

/**
 * Get or download model (checks cache first)
 * @param {string} modelKey - Unique key for the model
 * @param {string} url - URL to download from if not cached
 * @param {Function} progressCallback - Progress callback
 * @returns {Promise<ArrayBuffer>} Model data
 */
export async function getOrDownloadModel(modelKey, url, progressCallback) {
  // Check cache first
  const cached = await getCachedModel(modelKey);
  if (cached) {
    console.log(`Model ${modelKey} loaded from cache`);
    if (progressCallback) {
      progressCallback(cached.byteLength, cached.byteLength);
    }
    return cached;
  }
  
  // Download if not cached
  console.log(`Downloading model ${modelKey} from ${url}`);
  const modelData = await downloadModel(url, progressCallback);
  
  // Cache the downloaded model
  try {
    await cacheModel(modelKey, modelData, url);
    console.log(`Model ${modelKey} cached successfully`);
  } catch (error) {
    console.warn(`Failed to cache model ${modelKey}:`, error);
    // Continue even if caching fails
  }
  
  return modelData;
}

/**
 * Get cache statistics
 * @returns {Promise<Object>} Cache stats (totalSize, modelCount, models)
 */
export async function getCacheStats() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const models = request.result;
        const totalSize = models.reduce((sum, model) => sum + (model.size || 0), 0);
        
        resolve({
          totalSize,
          modelCount: models.length,
          models: models.map(m => ({
            key: m.key,
            size: m.size,
            timestamp: m.timestamp,
            url: m.url
          }))
        });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get cache stats'));
      };
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { totalSize: 0, modelCount: 0, models: [] };
  }
}

/**
 * Clear all cached models
 * @returns {Promise<void>}
 */
export async function clearCache() {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to clear cache'));
      };
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Delete a specific model from cache
 * @param {string} modelKey - Key of the model to delete
 * @returns {Promise<void>}
 */
export async function deleteCachedModel(modelKey) {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(modelKey);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete model'));
      };
    });
  } catch (error) {
    console.error('Failed to delete model:', error);
    throw error;
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

