// Model Cache Manager
// Lists and manages all cached models across different tools

import { toast, on, qs } from '/js/ui.js';
import { getCacheStats, deleteCachedModel, formatBytes } from '/js/utils/model-cache.js';

let webllmApi = null;
let webllmModelList = [];

// Try to load WebLLM API
async function loadWebLLMAPI() {
  if (webllmApi) return webllmApi;
  
  try {
    // Check if WebLLM is available in window
    if (typeof window !== 'undefined' && window.webllm) {
      webllmApi = window.webllm;
      return webllmApi;
    }
    
    // Try to load from bundled module
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

// Get WebLLM model list from regex generator or chat tool
async function getWebLLMModelList() {
  try {
    // Try to get model list from regex generator page
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
    
    // Try chat page as fallback
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
    
    // Fallback: common WebLLM models (extracted from the HTML)
    return [
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
      'Qwen2-0.5B-Instruct-q4f16_1-MLC',
      'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      'Qwen2-1.5B-Instruct-q4f16_1-MLC',
      'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
      'Phi-3.5-mini-instruct-q4f16_1-MLC',
      'Phi-3-mini-4k-instruct-q4f16_1-MLC',
      'Llama-3.1-8B-Instruct-q4f16_1-MLC',
      'Llama-3-8B-Instruct-q4f16_1-MLC',
      'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
      'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
      'Qwen2.5-7B-Instruct-q4f16_1-MLC',
      'Qwen2-7B-Instruct-q4f16_1-MLC',
      'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
      'Hermes-2-Pro-Mistral-7B-q4f16_1-MLC',
      'Llama-3-70B-Instruct-q3f16_1-MLC',
      'Llama-3.1-70B-Instruct-q3f16_1-MLC',
      'Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC',
      'Qwen2-Math-7B-Instruct-q4f16_1-MLC',
      'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
      'WizardMath-7B-V1.1-q4f16_1-MLC',
      'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
      'DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC'
    ];
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
          size: null, // WebLLM doesn't expose size easily
          timestamp: null
        });
      }
    } catch (error) {
      // Ignore errors for individual models
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
    webllm: [],
    imageGen: [] // SDTurbo/Janus models - harder to enumerate
  };
  
  // Get ONNX models
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
  
  // Get WebLLM models
  try {
    models.webllm = await getCachedWebLLMModels();
  } catch (error) {
    console.error('Failed to get WebLLM models:', error);
  }
  
  return models;
}

// Delete a model
async function deleteModel(model) {
  try {
    if (model.type === 'onnx') {
      await deleteCachedModel(model.id);
      toast(`Deleted ONNX model: ${model.name}`, 'success');
    } else if (model.type === 'webllm') {
      await deleteWebLLMModel(model.id);
      toast(`Deleted WebLLM model: ${model.name}`, 'success');
    } else {
      throw new Error(`Unknown model type: ${model.type}`);
    }
    
    // Refresh the list
    await refreshModelList();
  } catch (error) {
    console.error('Failed to delete model:', error);
    toast(`Failed to delete model: ${error.message}`, 'error');
  }
}

// Format timestamp
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Render model list
function renderModelList(models) {
  const container = qs('#models-container');
  if (!container) return;
  
  const totalModels = models.onnx.length + models.webllm.length;
  
  if (totalModels === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h2>No Cached Models</h2>
        <p>You don't have any cached models yet. Models will appear here after you download them in their respective tools.</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  // ONNX Models
  if (models.onnx.length > 0) {
    html += `
      <div class="model-category">
        <div class="category-header">
          <div>
            <div class="category-title">ONNX Models</div>
            <div class="category-count">Used by: Image Enhancement, AI Detector</div>
          </div>
          <div class="category-count">${models.onnx.length} model${models.onnx.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="model-list">
          ${models.onnx.map(model => `
            <div class="model-item">
              <div class="model-info">
                <div class="model-name">${escapeHtml(model.name)}</div>
                <div class="model-details">
                  <span class="model-size">📦 ${formatBytes(model.size)}</span>
                  <span>🕒 ${formatTimestamp(model.timestamp)}</span>
                </div>
              </div>
              <div class="model-actions">
                <button class="delete-btn" data-model-id="${escapeHtml(model.id)}" data-model-type="onnx">
                  Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // WebLLM Models
  if (models.webllm.length > 0) {
    html += `
      <div class="model-category">
        <div class="category-header">
          <div>
            <div class="category-title">WebLLM Models</div>
            <div class="category-count">Used by: Regex Generator, WebLLM Chatbot</div>
          </div>
          <div class="category-count">${models.webllm.length} model${models.webllm.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="model-list">
          ${models.webllm.map(model => `
            <div class="model-item">
              <div class="model-info">
                <div class="model-name">${escapeHtml(model.name)}</div>
                <div class="model-details">
                  <span>Size information not available</span>
                </div>
              </div>
              <div class="model-actions">
                <button class="delete-btn" data-model-id="${escapeHtml(model.id)}" data-model-type="webllm">
                  Delete
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  // Attach delete handlers
  container.querySelectorAll('.delete-btn').forEach(btn => {
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
      if (!confirm(`Are you sure you want to delete "${model.name}"?\n\nThis action cannot be undone.`)) {
        return;
      }
      
      // Disable button during deletion
      btn.disabled = true;
      btn.textContent = 'Deleting...';
      
      try {
        await deleteModel(model);
      } finally {
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
  
  const totalModelsEl = qs('#total-models');
  const totalSizeEl = qs('#total-size');
  const onnxCountEl = qs('#onnx-count');
  const webllmCountEl = qs('#webllm-count');
  
  if (totalModelsEl) totalModelsEl.textContent = totalModels;
  if (totalSizeEl) totalSizeEl.textContent = formatBytes(totalSize);
  if (onnxCountEl) onnxCountEl.textContent = models.onnx.length;
  if (webllmCountEl) webllmCountEl.textContent = models.webllm.length;
}

// Refresh model list
async function refreshModelList() {
  const container = qs('#models-container');
  const errorContainer = qs('#error-container');
  const refreshBtn = qs('#refresh-btn');
  
  if (container) {
    container.innerHTML = '<div class="loading">Loading cached models...</div>';
  }
  
  if (errorContainer) {
    errorContainer.innerHTML = '';
  }
  
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '🔄 Refreshing...';
  }
  
  try {
    const models = await getAllCachedModels();
    renderModelList(models);
    updateStats(models);
  } catch (error) {
    console.error('Failed to refresh model list:', error);
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="error-message">
          <strong>Error loading models:</strong> ${escapeHtml(error.message)}
        </div>
      `;
    }
    if (container) {
      container.innerHTML = '<div class="empty-state"><p>Failed to load models. Please try refreshing.</p></div>';
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = '🔄 Refresh Cache List';
    }
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
async function init() {
  const refreshBtn = qs('#refresh-btn');
  if (refreshBtn) {
    on(refreshBtn, 'click', refreshModelList);
  }
  
  // Load initial list
  await refreshModelList();
}

// Run on page load
init().catch(console.error);

