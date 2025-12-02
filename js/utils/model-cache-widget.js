// Model Cache Widget - Floating widget for managing cached models
// Can be imported and initialized on any page

import { toast, on, qs } from '/js/ui.js';
import { getCacheStats, deleteCachedModel, formatBytes } from '/js/utils/model-cache.js';

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

// Get all cached models
async function getAllCachedModels() {
  const models = {
    onnx: [],
    webllm: []
  };
  
  try {
    const stats = await getCacheStats();
    models.onnx = stats.models.map(m => ({
      id: m.key,
      type: 'onnx',
      name: m.key,
      size: m.size,
      timestamp: m.timestamp,
      url: m.url
    }));
  } catch (error) {
    console.error('Failed to get ONNX models:', error);
  }
  
  try {
    models.webllm = await getCachedWebLLMModels();
  } catch (error) {
    console.error('Failed to get WebLLM models:', error);
  }
  
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="3" y1="9" x2="21" y2="9"></line>
        </svg>
        <span>Model Cache</span>
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
        top: 20px;
        right: 200px;
        z-index: 999;
      }
      
      .model-cache-widget-toggle {
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 0.75rem 1.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        font-size: 0.9rem;
        font-weight: 500;
      }
      
      .model-cache-widget-toggle:hover {
        background: #1976d2;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }
      
      .model-cache-widget-toggle svg {
        width: 20px;
        height: 20px;
      }
      
      .model-cache-widget-panel {
        position: fixed;
        top: 80px;
        right: 200px;
        width: 600px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 120px);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideDown 0.3s ease;
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
      
      .model-cache-widget-actions {
        margin-bottom: 1rem;
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
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @media (max-width: 900px) {
        .model-cache-widget {
          right: 20px;
          top: 80px;
        }
        
        .model-cache-widget-panel {
          width: calc(100vw - 40px);
          right: 20px;
          top: 140px;
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

  // Refresh button
  if (refreshBtn) {
    on(refreshBtn, 'click', refreshModelList);
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

    const totalModels = models.onnx.length + models.webllm.length;

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
    if (models.onnx.length > 0) {
      html += `
        <div class="model-cache-category">
          <div class="model-cache-category-title">ONNX Models (${models.onnx.length})</div>
          ${models.onnx.map(model => `
            <div class="model-cache-item">
              <div class="model-cache-item-info">
                <div class="model-cache-item-name">${escapeHtml(model.name)}</div>
                <div class="model-cache-item-details">${formatBytes(model.size)} • ${formatTimestamp(model.timestamp)}</div>
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
    if (models.webllm.length > 0) {
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

    listContainer.innerHTML = html;

    // Attach delete handlers
    listContainer.querySelectorAll('.model-cache-item-delete').forEach(btn => {
      on(btn, 'click', async () => {
        const modelId = btn.getAttribute('data-model-id');
        const modelType = btn.getAttribute('data-model-type');

        // Find the model
        let model = null;
        if (modelType === 'onnx') {
          model = models.onnx.find(m => m.id === modelId);
        } else if (modelType === 'webllm') {
          model = models.webllm.find(m => m.id === modelId);
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
    const totalModels = models.onnx.length + models.webllm.length;
    const totalSize = models.onnx.reduce((sum, m) => sum + (m.size || 0), 0);

    const totalModelsEl = qs('#widget-total-models');
    const totalSizeEl = qs('#widget-total-size');

    if (totalModelsEl) totalModelsEl.textContent = totalModels;
    if (totalSizeEl) totalSizeEl.textContent = formatBytes(totalSize);
  }
}
