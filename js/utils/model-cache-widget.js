// Model Cache Widget - Floating widget for managing cached models
// Can be imported and initialized on any page

import { toast, on, qs } from '/js/ui.js';
import { getCacheStats, deleteCachedModel, clearCache, formatBytes } from '/js/utils/model-cache.js';

let webllmApi = null;

// Try to load WebLLM API
async function loadWebLLMAPI() {
  if (webllmApi) return webllmApi;
  
  try {
    if (typeof window !== 'undefined' && window.webllm) {
      webllmApi = window.webllm;
      return webllmApi;
    }
    
    try {
      const bundledModule = await import('/js/tools/bundled/webllm-bundle.js');
      webllmApi = window.webllm || bundledModule.webllm;
      if (webllmApi) return webllmApi;
    } catch (e) {
      console.log('WebLLM bundle not available:', e);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load WebLLM API:', error);
    return null;
  }
}

// Get WebLLM model list
async function getWebLLMModelList() {
  try {
    const regexPage = await fetch('/regex/generator/index.html').catch(() => null);
    if (regexPage && regexPage.ok) {
      const html = await regexPage.text();
      const selectMatch = html.match(/<select[^>]*id="model-select"[^>]*>([\s\S]*?)<\/select>/);
      if (selectMatch) {
        const options = Array.from(selectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>/g));
        if (options.length > 0) {
          return options.map(m => m[1]);
        }
      }
    }
    
    const chatPage = await fetch('/ai/chat/index.html').catch(() => null);
    if (chatPage && chatPage.ok) {
      const html = await chatPage.text();
      const selectMatch = html.match(/<select[^>]*id="chat-model-select"[^>]*>([\s\S]*?)<\/select>/);
      if (selectMatch) {
        const options = Array.from(selectMatch[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>/g));
        if (options.length > 0) {
          return options.map(m => m[1]);
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error('Failed to get WebLLM model list:', error);
    return [];
  }
}

// Get all cached WebLLM models
async function getCachedWebLLMModels() {
  const api = await loadWebLLMAPI();
  if (!api || typeof api.hasModelInCache !== 'function') {
    return [];
  }
  
  const modelList = await getWebLLMModelList();
  const cached = [];
  
  for (const modelId of modelList) {
    try {
      const isCached = await api.hasModelInCache(modelId);
      if (isCached) {
        cached.push({
          id: modelId,
          type: 'webllm',
          name: modelId,
          size: null,
          timestamp: null
        });
      }
    } catch (error) {
      console.debug(`Error checking model ${modelId}:`, error);
    }
  }
  
  return cached;
}

// Delete a WebLLM model
async function deleteWebLLMModel(modelId) {
  const api = await loadWebLLMAPI();
  if (!api || typeof api.deleteModelAllInfoInCache !== 'function') {
    throw new Error('WebLLM cache API not available');
  }
  
  await api.deleteModelAllInfoInCache(modelId);
}

// Get cached Transformers.js models from Cache API
async function getCachedTransformersModels() {
  const models = [];
  const modelMap = new Map(); // Key: modelId, Value: model info
  
  // Try to get all cache names
  let allCacheNames = [];
  try {
    allCacheNames = await caches.keys();
    console.log('All available cache names:', allCacheNames);
  } catch (error) {
    console.warn('Could not list all cache names:', error);
    return models;
  }
  
  // Filter to only Transformers.js related caches
  const transformersCacheNames = allCacheNames.filter(name => 
    name.includes('transformers') || 
    name.includes('hf-') || 
    name.includes('xenova') ||
    name.includes('huggingface') ||
    name.includes('kokoro') ||
    name.includes('sd-turbo') ||
    name.includes('janus') ||
    name.includes('web-txt2img')
  );
  
  console.log('Transformers.js cache names found:', transformersCacheNames);
  
  // Check each cache
  for (const cacheName of transformersCacheNames) {
    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      if (keys.length === 0) {
        continue; // Skip empty caches
      }
      
      console.log(`Checking ${cacheName}: ${keys.length} entries`);
      
      // Group by model ID (deduplicate by actual model, not cache name)
      for (const request of keys) {
        const url = request.url;
        
        // Skip non-model files (config files, tokenizers, etc. are part of the model)
        // Only count actual model files or verify the entry exists
        try {
          const response = await cache.match(request);
          if (!response || !response.ok) {
            continue; // Skip invalid entries
          }
        } catch (e) {
          continue; // Skip entries we can't verify
        }
        
        // Extract model ID from URL
        let modelId = null;
        let modelName = 'unknown';
        
        // Try to match Hugging Face model URLs
        // Pattern: https://huggingface.co/{org}/{model}/resolve/main/...
        const hfMatch = url.match(/huggingface\.co\/([^\/]+)\/([^\/]+)/);
        if (hfMatch) {
          modelId = `${hfMatch[1]}/${hfMatch[2]}`;
          modelName = hfMatch[2];
        } else {
          // Try other patterns
          const match = url.match(/\/(sd-turbo|janus-pro-1b|Kokoro-82M|kokoro|[\w-]+)\//i);
          if (match) {
            modelName = match[1];
            // Try to construct model ID
            if (url.includes('onnx-community')) {
              modelId = `onnx-community/${modelName}`;
            } else if (url.includes('Xenova')) {
              modelId = `Xenova/${modelName}`;
            } else {
              modelId = modelName;
            }
          } else {
            // Skip if we can't identify the model
            continue;
          }
        }
        
        // Use modelId as unique key to avoid duplicates
        if (modelId && !modelMap.has(modelId)) {
          modelMap.set(modelId, {
            id: modelId,
            type: 'transformers',
            name: modelName,
            modelId: modelId,
            size: null,
            timestamp: null,
            url: url,
            cacheName: cacheName
          });
        }
      }
    } catch (error) {
      // Cache might not exist or be accessible, skip it
      console.debug(`Cache ${cacheName} not accessible:`, error.message);
    }
  }
  
  // Only include models that have actual cache entries
  // Verify each model has at least one valid cache entry
  const verifiedModels = [];
  for (const [modelId, model] of modelMap.entries()) {
    try {
      const cache = await caches.open(model.cacheName);
      const keys = await cache.keys();
      
      // Check if there are actual model files cached (not just config files)
      let hasModelFiles = false;
      for (const request of keys) {
        if (request.url.includes(modelId) || request.url.includes(model.name)) {
          try {
            const response = await cache.match(request);
            if (response && response.ok) {
              // Check if it's a model file (usually larger files)
              const contentType = response.headers.get('content-type') || '';
              const contentLength = response.headers.get('content-length');
              
              // Model files are usually larger or have specific content types
              if (contentLength && parseInt(contentLength) > 1000) { // At least 1KB
                hasModelFiles = true;
                break;
              } else if (contentType.includes('octet-stream') || 
                         contentType.includes('application') ||
                         request.url.match(/\.(onnx|bin|safetensors|pt|pth)$/i)) {
                hasModelFiles = true;
                break;
              }
            }
          } catch (e) {
            // Skip this entry
          }
        }
      }
      
      if (hasModelFiles) {
        verifiedModels.push(model);
      }
    } catch (error) {
      console.debug(`Could not verify model ${modelId}:`, error);
    }
  }
  
  console.log('Transformers.js models found (verified):', verifiedModels.length);
  
  return verifiedModels;
}

// Delete a Transformers.js model from Cache API
async function deleteTransformersModel(model) {
  try {
    const cacheName = model.cacheName || 'web-txt2img-v1';
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    // Extract model name from the unique key (format: "cacheName:modelName")
    const modelName = model.id.includes(':') ? model.id.split(':')[1] : model.id;
    const modelId = model.modelId || modelName;
    
    // Delete all entries for this model
    // Match by model name or model ID in URL
    let deleted = 0;
    
    for (const request of keys) {
      const url = request.url;
      // Check if URL contains the model name or model ID
      const matchesModel = url.includes(modelName) || 
                          (modelId && url.includes(modelId)) ||
                          url.includes(model.id);
      
      if (matchesModel) {
        await cache.delete(request);
        deleted++;
      }
    }
    
    if (deleted === 0) {
      // Try deleting the entire cache if it's small or model-specific
      if (cacheName.includes(modelName.toLowerCase()) || cacheName.includes('kokoro')) {
        await caches.delete(cacheName);
        console.log(`Deleted entire cache: ${cacheName}`);
        return;
      }
      throw new Error('No cache entries found for this model');
    }
    
    console.log(`Deleted ${deleted} cache entries for ${modelName} from ${cacheName}`);
  } catch (error) {
    console.error('Failed to delete Transformers.js model:', error);
    throw error;
  }
}

// Get all cached models
async function getAllCachedModels() {
  const models = {
    onnx: [],
    webllm: [],
    transformers: []
  };
  
  try {
    // Try direct IndexedDB access as fallback
    let stats = await getCacheStats();
    
    if (stats && stats.models && Array.isArray(stats.models)) {
      models.onnx = stats.models.map(m => ({
        id: m.key,
        type: 'onnx',
        name: m.key,
        size: m.size,
        timestamp: m.timestamp,
        url: m.url
      }));
    }
  } catch (error) {
    console.error('Failed to get ONNX models:', error);
  }
  
  try {
    models.webllm = await getCachedWebLLMModels();
  } catch (error) {
    console.error('Failed to get WebLLM models:', error);
  }
  
  try {
    models.transformers = await getCachedTransformersModels();
  } catch (error) {
    console.error('Failed to get Transformers.js models:', error);
  }
  
  console.log('All cached models:', models);
  return models;
}

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize model cache widget on a page
export function initModelCacheWidget() {
  // Check if widget already exists
  if (document.getElementById('model-cache-widget')) {
    console.log('Model cache widget already initialized');
    return;
  }

  // Create widget HTML
  const widgetHTML = `
    <div id="model-cache-widget" class="model-cache-widget">
      <div class="model-cache-widget-toggle" id="model-cache-widget-toggle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
      </div>
      <div class="model-cache-widget-panel" id="model-cache-widget-panel">
        <div class="model-cache-widget-header">
          <h3>Model Cache Manager</h3>
          <button class="model-cache-widget-close" id="model-cache-widget-close" aria-label="Close model cache">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="model-cache-widget-content">
          <div class="model-cache-stats">
            <div class="model-cache-stat">
              <div class="model-cache-stat-label">Total Models</div>
              <div class="model-cache-stat-value" id="widget-total-models">-</div>
            </div>
            <div class="model-cache-stat">
              <div class="model-cache-stat-label">Total Size</div>
              <div class="model-cache-stat-value" id="widget-total-size">-</div>
            </div>
          </div>
          <div class="model-cache-widget-actions">
            <button id="model-cache-widget-refresh" class="model-cache-widget-btn">🔄 Refresh</button>
            <button id="model-cache-widget-clear-all" class="model-cache-widget-btn model-cache-widget-btn-danger">🗑️ Clear All</button>
          </div>
          <div id="model-cache-widget-list" class="model-cache-widget-list">
            <div class="model-cache-loading">Loading...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add widget to body
  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  // Add CSS if not already added
  if (!document.getElementById('model-cache-widget-styles')) {
    const style = document.createElement('style');
    style.id = 'model-cache-widget-styles';
    style.textContent = `
      /* Model Cache Widget Styles */
      .model-cache-widget {
        position: fixed;
        bottom: 13rem;
        right: 20px;
        z-index: 999;
      }
      
      .model-cache-widget-toggle {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--accent);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }
      
      .model-cache-widget-toggle:hover {
        background: #1976d2;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }
      
      .model-cache-widget-toggle svg {
        width: 24px;
        height: 24px;
      }
      
      .model-cache-widget-panel {
        position: fixed;
        bottom: 13rem;
        right: 20px;
        width: 600px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 15rem);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideUp 0.3s ease;
      }
      
      .model-cache-widget-panel.expanded {
        display: flex;
      }
      
      .model-cache-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg-elev);
      }
      
      .model-cache-widget-header h3 {
        margin: 0;
        font-size: 1.2rem;
      }
      
      .model-cache-widget-close {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text);
        border-radius: 4px;
        transition: background 0.2s;
      }
      
      .model-cache-widget-close:hover {
        background: var(--bg-hover);
      }
      
      .model-cache-widget-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        padding: 1rem;
      }
      
      .model-cache-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
      }
      
      .model-cache-stat {
        padding: 0.75rem;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: 6px;
      }
      
      .model-cache-stat-label {
        font-size: 0.75rem;
        color: var(--text-subtle);
        margin-bottom: 0.25rem;
      }
      
      .model-cache-stat-value {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text);
      }
      
      
      .model-cache-widget-btn {
        padding: 0.6rem 1.2rem;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
        width: 100%;
      }
      
      .model-cache-widget-btn:hover {
        background: var(--bg-hover);
      }
      
      .model-cache-widget-btn-danger {
        background: var(--error-bg, #fee);
        border-color: var(--error);
        color: var(--error);
      }
      
      .model-cache-widget-btn-danger:hover {
        background: var(--error);
        color: white;
      }
      
      .model-cache-widget-actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      
      .model-cache-widget-list {
        flex: 1;
        overflow-y: auto;
        min-height: 200px;
        max-height: 400px;
      }
      
      .model-cache-category {
        margin-bottom: 1.5rem;
      }
      
      .model-cache-category-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid var(--border);
      }
      
      .model-cache-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: var(--bg-elev);
        border: 1px solid var(--border);
        border-radius: 6px;
        margin-bottom: 0.5rem;
        transition: all 0.2s;
      }
      
      .model-cache-item:hover {
        border-color: var(--accent);
      }
      
      .model-cache-item-info {
        flex: 1;
        min-width: 0;
      }
      
      .model-cache-item-name {
        font-weight: 600;
        color: var(--text);
        margin-bottom: 0.25rem;
        word-break: break-word;
        font-size: 0.875rem;
      }
      
      .model-cache-item-details {
        font-size: 0.75rem;
        color: var(--text-subtle);
      }
      
      .model-cache-item-delete {
        padding: 0.4rem 0.8rem;
        border: 1px solid var(--error);
        background: var(--bg);
        color: var(--error);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.75rem;
        transition: all 0.2s;
        white-space: nowrap;
        margin-left: 0.5rem;
      }
      
      .model-cache-item-delete:hover {
        background: var(--error);
        color: white;
      }
      
      .model-cache-item-delete:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .model-cache-loading {
        text-align: center;
        padding: 2rem;
        color: var(--text-subtle);
      }
      
      .model-cache-empty {
        text-align: center;
        padding: 2rem;
        color: var(--text-subtle);
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @media (max-width: 900px) {
        .model-cache-widget {
          bottom: 13rem;
          right: 20px;
        }
        
        .model-cache-widget-panel {
          width: calc(100vw - 40px);
          right: 20px;
          bottom: 13rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize widget functionality
  initWidgetFunctionality();
}

// Initialize widget functionality
function initWidgetFunctionality() {
  const toggle = qs('#model-cache-widget-toggle');
  const panel = qs('#model-cache-widget-panel');
  const close = qs('#model-cache-widget-close');
  const refreshBtn = qs('#model-cache-widget-refresh');
  const clearAllBtn = qs('#model-cache-widget-clear-all');
  const listContainer = qs('#model-cache-widget-list');

  if (!toggle || !panel || !close) return;

  // Toggle panel
  on(toggle, 'click', () => {
    const isExpanded = panel.classList.contains('expanded');
    if (isExpanded) {
      panel.classList.remove('expanded');
    } else {
      panel.classList.add('expanded');
      refreshModelList();
    }
  });

  // Close panel
  on(close, 'click', () => {
    panel.classList.remove('expanded');
  });

  // Close when clicking outside the widget
  document.addEventListener('click', (e) => {
    // Only close if panel is expanded
    if (!panel.classList.contains('expanded')) {
      return;
    }
    
    // Don't close if clicking on the toggle button (it handles its own toggle)
    if (toggle.contains(e.target) || toggle === e.target) {
      return;
    }
    
    // Don't close if clicking inside the panel or any of its children
    if (panel.contains(e.target) || panel === e.target) {
      return;
    }
    
    // Close if clicking outside both toggle and panel
    panel.classList.remove('expanded');
  });

  // Refresh button
  if (refreshBtn) {
    on(refreshBtn, 'click', refreshModelList);
  }

  // Clear all button
  if (clearAllBtn) {
    on(clearAllBtn, 'click', async () => {
      const models = await getAllCachedModels();
      const totalModels = models.onnx.length + models.webllm.length + (models.transformers?.length || 0);
      
      if (totalModels === 0) {
        toast('No models to clear', 'info');
        return;
      }
      
      const confirmMessage = `Are you sure you want to delete ALL ${totalModels} cached models?\n\nThis action cannot be undone.`;
      if (!confirm(confirmMessage)) {
        return;
      }
      
      clearAllBtn.disabled = true;
      clearAllBtn.textContent = 'Clearing...';
      
      try {
        let deletedCount = 0;
        const errors = [];
        
        // Clear ONNX models (use clearCache for efficiency)
        if (models.onnx.length > 0) {
          try {
            await clearCache();
            deletedCount += models.onnx.length;
          } catch (error) {
            // Fallback to individual deletion
            for (const model of models.onnx) {
              try {
                await deleteCachedModel(model.id);
                deletedCount++;
              } catch (err) {
                errors.push(`ONNX ${model.name}: ${err.message}`);
              }
            }
          }
        }
        
        // Clear WebLLM models
        for (const model of models.webllm) {
          try {
            await deleteWebLLMModel(model.id);
            deletedCount++;
          } catch (error) {
            errors.push(`WebLLM ${model.name}: ${error.message}`);
          }
        }
        
        // Clear Transformers.js models
        for (const model of models.transformers || []) {
          try {
            await deleteTransformersModel(model);
            deletedCount++;
          } catch (error) {
            errors.push(`Transformers ${model.name}: ${error.message}`);
          }
        }
        
        if (errors.length > 0) {
          console.warn('Some models failed to delete:', errors);
          toast(`Cleared ${deletedCount} of ${totalModels} models. Some errors occurred.`, 'warning');
        } else {
          toast(`Successfully cleared all ${deletedCount} models`, 'success');
        }
        
        // Refresh the list
        await refreshModelList();
      } catch (error) {
        console.error('Failed to clear all models:', error);
        toast(`Failed to clear all models: ${error.message}`, 'error');
      } finally {
        clearAllBtn.disabled = false;
        clearAllBtn.textContent = '🗑️ Clear All';
      }
    });
  }

  // Render model list
  async function refreshModelList() {
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="model-cache-loading">Loading...</div>';

    try {
      const models = await getAllCachedModels();
      renderModelList(models);
      updateStats(models);
    } catch (error) {
      console.error('Failed to refresh model list:', error);
      listContainer.innerHTML = `<div class="model-cache-empty">Error loading models: ${escapeHtml(error.message)}</div>`;
    }
  }

  // Render model list
  function renderModelList(models) {
    if (!listContainer) return;

    console.log('Rendering model list:', models);
    const totalModels = models.onnx.length + models.webllm.length + (models.transformers?.length || 0);
    console.log('Total models to render:', totalModels, 'ONNX:', models.onnx.length, 'WebLLM:', models.webllm.length, 'Transformers:', models.transformers?.length || 0);

    if (totalModels === 0) {
      listContainer.innerHTML = `
        <div class="model-cache-empty">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
          <div>No cached models</div>
        </div>
      `;
      return;
    }

    let html = '';

    // ONNX Models
    if (models.onnx && models.onnx.length > 0) {
      console.log('Rendering ONNX models:', models.onnx);
      html += `
        <div class="model-cache-category">
          <div class="model-cache-category-title">ONNX Models (${models.onnx.length})</div>
          ${models.onnx.map(model => `
            <div class="model-cache-item">
              <div class="model-cache-item-info">
                <div class="model-cache-item-name">${escapeHtml(model.name)}</div>
                <div class="model-cache-item-details">${formatBytes(model.size || 0)} • ${formatTimestamp(model.timestamp)}</div>
              </div>
              <button class="model-cache-item-delete" data-model-id="${escapeHtml(model.id)}" data-model-type="onnx">
                Delete
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    // WebLLM Models
    if (models.webllm && models.webllm.length > 0) {
      console.log('Rendering WebLLM models:', models.webllm);
      html += `
        <div class="model-cache-category">
          <div class="model-cache-category-title">WebLLM Models (${models.webllm.length})</div>
          ${models.webllm.map(model => `
            <div class="model-cache-item">
              <div class="model-cache-item-info">
                <div class="model-cache-item-name">${escapeHtml(model.name)}</div>
                <div class="model-cache-item-details">Size not available</div>
              </div>
              <button class="model-cache-item-delete" data-model-id="${escapeHtml(model.id)}" data-model-type="webllm">
                Delete
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Transformers.js Models (Image Generation)
    if (models.transformers && models.transformers.length > 0) {
      console.log('Rendering Transformers.js models:', models.transformers);
      html += `
        <div class="model-cache-category">
          <div class="model-cache-category-title">Transformers.js Models (${models.transformers.length})</div>
          <div class="model-cache-item-details" style="font-size: 0.7rem; color: var(--text-subtle); margin-bottom: 0.5rem; padding: 0.5rem;">
            Used by: Image Generator (SD-Turbo, Janus-Pro)
          </div>
          ${models.transformers.map(model => `
            <div class="model-cache-item">
              <div class="model-cache-item-info">
                <div class="model-cache-item-name">${escapeHtml(model.name)}</div>
                <div class="model-cache-item-details">Size not available</div>
              </div>
              <button class="model-cache-item-delete" data-model-id="${escapeHtml(model.id)}" data-model-type="transformers" data-cache-name="${escapeHtml(model.cacheName || 'web-txt2img-v1')}">
                Delete
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    console.log('Generated HTML length:', html.length);
    listContainer.innerHTML = html;

    // Attach delete handlers - need to re-fetch models for delete
    listContainer.querySelectorAll('.model-cache-item-delete').forEach(btn => {
      on(btn, 'click', async () => {
        const modelId = btn.getAttribute('data-model-id');
        const modelType = btn.getAttribute('data-model-type');

        // Re-fetch models to get current state
        const currentModels = await getAllCachedModels();
        
        // Find the model
        let model = null;
        if (modelType === 'onnx') {
          model = currentModels.onnx.find(m => m.id === modelId);
        } else if (modelType === 'webllm') {
          model = currentModels.webllm.find(m => m.id === modelId);
        } else if (modelType === 'transformers') {
          model = currentModels.transformers.find(m => m.id === modelId);
          if (model) {
            model.cacheName = btn.getAttribute('data-cache-name') || 'web-txt2img-v1';
          }
        }

        if (!model) {
          toast('Model not found', 'error');
          return;
        }

        // Confirm deletion
        if (!confirm(`Delete "${model.name}"?`)) {
          return;
        }

        // Disable button during deletion
        btn.disabled = true;
        btn.textContent = 'Deleting...';

        try {
          if (model.type === 'onnx') {
            await deleteCachedModel(model.id);
            toast(`Deleted: ${model.name}`, 'success');
          } else if (model.type === 'webllm') {
            await deleteWebLLMModel(model.id);
            toast(`Deleted: ${model.name}`, 'success');
          } else if (model.type === 'transformers') {
            await deleteTransformersModel(model);
            toast(`Deleted: ${model.name}`, 'success');
          }
          await refreshModelList();
        } catch (error) {
          console.error('Failed to delete model:', error);
          toast(`Failed to delete: ${error.message}`, 'error');
          btn.disabled = false;
          btn.textContent = 'Delete';
        }
      });
    });
  }

  // Update stats
  function updateStats(models) {
    const totalModels = models.onnx.length + models.webllm.length + (models.transformers?.length || 0);
    const totalSize = models.onnx.reduce((sum, m) => sum + (m.size || 0), 0);

    const totalModelsEl = qs('#widget-total-models');
    const totalSizeEl = qs('#widget-total-size');

    if (totalModelsEl) totalModelsEl.textContent = totalModels;
    if (totalSizeEl) totalSizeEl.textContent = formatBytes(totalSize);
  }
}
