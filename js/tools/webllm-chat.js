// WebLLM Chatbot
// Reuses the same WebLLM bundle and model list as the Regex Generator tool

import { toast, on, qs } from '/js/ui.js';

let CreateMLCEngine = null;
let webllmApi = null;
let chatEngine = null;
let isModelLoading = false;

const modelSelect = qs('#chat-model-select');
const downloadModelBtn = qs('#chat-download-model');
const checkModelBtn = qs('#chat-check-model');
const clearModelBtn = qs('#chat-clear-model');
const modelStatus = qs('#chat-model-status');
const chatLog = qs('#chat-log');
const chatInput = qs('#chat-input');
const chatSendBtn = qs('#chat-send');
const chatClearConversationBtn = qs('#chat-clear-conversation');

let messages = [];

async function listCachedModels() {
  const listEl = qs('#chat-model-list');
  if (!listEl) return;
  if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
    listEl.innerHTML = '<p class="text-sm text-muted" style="margin: 0;">Cache API not available yet. Download a model first.</p>';
    return;
  }

  const options = Array.from(modelSelect?.options || []).map(o => o.value);
  const cached = [];

  for (const id of options) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const ok = await webllmApi.hasModelInCache(id);
      if (ok) cached.push(id);
    } catch {
      // Ignore individual errors
    }
  }

  if (cached.length === 0) {
    listEl.innerHTML = '<p class="text-sm text-muted" style="margin: 0;">No cached models found.</p>';
    return;
  }

  const items = cached.map(key => {
    const isSelected = key === modelSelect.value;
    return `<li${isSelected ? ' style="font-weight: 600;"' : ''}>${key}</li>`;
  }).join('');

  listEl.innerHTML = `
    <p class="text-sm text-muted" style="margin: 0 0 0.25rem 0;">Cached models:</p>
    <ul class="text-sm" style="margin: 0; padding-left: 1.25rem;">
      ${items}
    </ul>
  `;
}

function appendMessage(role, content) {
  const wrapper = document.createElement('div');
  wrapper.style.marginBottom = '0.5rem';
  wrapper.innerHTML = `
    <div style="font-weight: 500; margin-bottom: 0.1rem;">${role === 'user' ? 'You' : 'Assistant'}</div>
    <div style="white-space: pre-wrap;">${content}</div>
  `;
  chatLog.appendChild(wrapper);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function checkWebGPUSupport() {
  return typeof navigator !== 'undefined' && !!navigator.gpu;
}

async function loadWebLLM() {
  if (CreateMLCEngine) return CreateMLCEngine;

  try {
    toast('Loading WebLLM library...', 'info');

    if (typeof window !== 'undefined' && window.CreateMLCEngine) {
      CreateMLCEngine = window.CreateMLCEngine;
      webllmApi = window.webllm || webllmApi;
      toast('WebLLM library loaded', 'success');
      return CreateMLCEngine;
    }

    // Try bundled module explicitly, in case it wasn't imported yet
    try {
      const bundledModule = await import('/js/tools/bundled/regex-generator-bundle.js');
      CreateMLCEngine = bundledModule.CreateMLCEngine || window.CreateMLCEngine;
      webllmApi = window.webllm || bundledModule.webllm || webllmApi;
      if (CreateMLCEngine && typeof CreateMLCEngine === 'function') {
        toast('WebLLM library loaded', 'success');
        return CreateMLCEngine;
      }
    } catch (e) {
      console.log('Bundled WebLLM not available for chat:', e);
    }

    throw new Error('WebLLM library not found. Run "npm install && npm run build" to create the bundle.');
  } catch (e) {
    toast(`Failed to load WebLLM: ${e.message}`, 'error');
    console.error('WebLLM load error (chat):', e);
    throw e;
  }
}

async function checkModelStatus() {
  const modelName = modelSelect.value;
  try {
    modelStatus.textContent = 'Checking model status...';
    modelStatus.style.color = 'var(--muted)';

    if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
      modelStatus.textContent = 'WebLLM cache API not available yet. Make sure the WebLLM bundle is loaded.';
      modelStatus.style.color = 'var(--error)';
      await listCachedModels();
      return false;
    }

    const cached = await webllmApi.hasModelInCache(modelName);
    if (cached) {
      modelStatus.textContent = `✓ Model "${modelName}" is cached and ready`;
      modelStatus.style.color = 'var(--ok)';
    } else {
      modelStatus.textContent = `✗ Model "${modelName}" is not cached. Click "Download & Cache Model" to download it.`;
      modelStatus.style.color = 'var(--error)';
    }
    await listCachedModels();
    return cached;
  } catch (e) {
    modelStatus.textContent = `Error checking model status: ${e.message}`;
    modelStatus.style.color = 'var(--error)';
    return false;
  }
}

async function downloadModel() {
  if (isModelLoading) {
    toast('Model is already loading. Please wait...', 'info');
    return;
  }

  const modelName = modelSelect.value;
  let hasError = false;
  let errorMessage = null;
  const setError = (msg) => {
    hasError = true;
    errorMessage = msg;
  };

  try {
    isModelLoading = true;
    downloadModelBtn.disabled = true;
    downloadModelBtn.textContent = 'Downloading...';
    modelStatus.textContent = `Downloading model "${modelName}"... This may take several minutes.`;
    modelStatus.style.color = 'var(--muted)';

    const createEngine = await loadWebLLM();
    if (!createEngine || typeof createEngine !== 'function') {
      throw new Error('WebLLM CreateMLCEngine is not available. Please refresh the page.');
    }

    toast(`Starting download of ${modelName}...`, 'info');

    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            if (hasError) return;
            const progress = report.progress || 0;
            const text = report.text || '';
            const percentage = (progress * 100).toFixed(1);
            modelStatus.textContent = `Downloading: ${percentage}% - ${text}`;
            if (progress === 1) {
              modelStatus.textContent = `✓ Model "${modelName}" downloaded and cached successfully!`;
              modelStatus.style.color = 'var(--ok)';
            }
          },
          gpuDevice: null,
        }
      );
    } catch (engineError) {
      setError(engineError.message);
      throw engineError;
    }

    chatEngine = engine;
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';

    toast('Model downloaded and cached successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready to use`;
    modelStatus.style.color = 'var(--ok)';
    listCachedModels().catch(console.error);
  } catch (e) {
    setError(e.message || 'Unknown error');
    isModelLoading = false;
    downloadModelBtn.disabled = false;
    downloadModelBtn.textContent = 'Download & Cache Model';

    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to download model: ${errorMsg}`, 'error');

    let errorText = `✗ Error: ${errorMsg}`;
    if (errorMsg.includes('GPU') || errorMsg.includes('WebGPU')) {
      errorText += '\n\n⚠️ WebGPU is required but not available or not fully supported.';
    } else if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('storage')) {
      errorText += '\n\n⚠️ Your browser cache may be full. Try clearing some models or increasing storage.';
    }

    setTimeout(() => {
      if (hasError) {
        modelStatus.textContent = errorText;
        modelStatus.style.color = 'var(--error)';
        modelStatus.style.whiteSpace = 'pre-wrap';
      }
    }, 100);

    modelStatus.textContent = errorText;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    console.error('Model download error (chat):', e);
  }
}

async function initializeChatEngine() {
  if (chatEngine) return chatEngine;

  const modelName = modelSelect.value;
  let hasError = false;
  let errorMessage = null;
  const setError = (msg) => {
    hasError = true;
    errorMessage = msg;
  };

  try {
    const createEngine = await loadWebLLM();
    if (!createEngine || typeof createEngine !== 'function') {
      throw new Error('WebLLM CreateMLCEngine is not available. Please refresh the page.');
    }

    toast('Loading model from cache...', 'info');

    let engine;
    try {
      engine = await createEngine(
        modelName,
        {
          initProgressCallback: (report) => {
            if (hasError) return;
            const progress = report.progress || 0;
            const text = report.text || '';
            if (progress < 1) {
              const percentage = (progress * 100).toFixed(1);
              modelStatus.textContent = `Loading: ${percentage}% - ${text}`;
            }
          },
          gpuDevice: null,
        }
      );
    } catch (engineError) {
      setError(engineError.message);
      throw engineError;
    }

    chatEngine = engine;
    toast('Model loaded successfully!', 'success');
    modelStatus.textContent = `✓ Model "${modelName}" is ready`;
    modelStatus.style.color = 'var(--ok)';
    return engine;
  } catch (e) {
    setError(e.message || 'Unknown error');
    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to load model: ${errorMsg}`, 'error');
    let errorText = `✗ Error loading model: ${errorMsg}`;
    setTimeout(() => {
      if (hasError) {
        modelStatus.textContent = errorText;
        modelStatus.style.color = 'var(--error)';
        modelStatus.style.whiteSpace = 'pre-wrap';
      }
    }, 100);
    modelStatus.textContent = errorText;
    modelStatus.style.color = 'var(--error)';
    modelStatus.style.whiteSpace = 'pre-wrap';
    throw e;
  }
}

async function sendMessage() {
  const content = chatInput.value.trim();
  if (!content) {
    toast('Please enter a message.', 'error');
    return;
  }

  chatInput.value = '';
  appendMessage('user', content);
  messages.push({ role: 'user', content });

  try {
    chatSendBtn.disabled = true;
    chatSendBtn.textContent = 'Sending...';

    let engine = chatEngine;
    if (!engine) {
      engine = await initializeChatEngine();
    }

    let reply = '';
    try {
      if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
        const response = await engine.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: 'You are a helpful, concise assistant running locally in the browser via WebLLM.',
            },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 512,
        });
        if (response && response.choices && response.choices[0]?.message?.content) {
          reply = response.choices[0].message.content.trim();
        }
      } else if (engine.chat) {
        const response = await engine.chat({
          messages: [
            { role: 'system', content: 'You are a helpful, concise assistant running locally in the browser via WebLLM.' },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 512,
        });
        if (typeof response === 'string') {
          reply = response.trim();
        } else if (response && response.content) {
          reply = response.content;
        }
      } else if (engine.generate) {
        const fullPrompt = [
          'You are a helpful, concise assistant running locally in the browser via WebLLM.',
          '',
          ...messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`),
          'Assistant:',
        ].join('\n');
        reply = await engine.generate(fullPrompt, { temperature: 0.7, max_tokens: 512 });
      } else {
        throw new Error('WebLLM engine does not support chat or generate methods');
      }
    } catch (apiError) {
      console.error('Chat API error:', apiError);
      throw new Error(`Failed to generate response: ${apiError.message}`);
    }

    reply = reply.trim();
    appendMessage('assistant', reply);
    messages.push({ role: 'assistant', content: reply });
  } catch (e) {
    const errorMsg = e.message || 'Unknown error';
    toast(`Chat failed: ${errorMsg}`, 'error');
    appendMessage('assistant', `Error: ${errorMsg}`);
  } finally {
    chatSendBtn.disabled = false;
    chatSendBtn.textContent = 'Send';
  }
}

async function clearSelectedModel() {
  const modelName = modelSelect.value;
  try {
    if (!webllmApi || typeof webllmApi.deleteModelAllInfoInCache !== 'function') {
      toast('WebLLM cache API not available to clear a single model.', 'error');
      return;
    }

    await webllmApi.deleteModelAllInfoInCache(modelName);
    toast(`Cleared cache for model "${modelName}"`, 'success');
    if (chatEngine) {
      chatEngine = null;
    }
    modelStatus.textContent = `✗ Model "${modelName}" is not cached.`;
    modelStatus.style.color = 'var(--error)';
    listCachedModels().catch(console.error);
  } catch (e) {
    console.error('Clear selected model error:', e);
    toast(`Failed to clear model cache: ${e.message}`, 'error');
  }
}

function clearConversation() {
  messages = [];
  chatLog.innerHTML = '<p class="text-sm text-muted">Conversation cleared. Start a new chat.</p>';
}

// Event wiring
if (downloadModelBtn) on(downloadModelBtn, 'click', downloadModel);
if (checkModelBtn) on(checkModelBtn, 'click', checkModelStatus);
if (clearModelBtn) on(clearModelBtn, 'click', clearSelectedModel);
if (chatSendBtn) on(chatSendBtn, 'click', sendMessage);
if (chatClearConversationBtn) on(chatClearConversationBtn, 'click', clearConversation);

if (chatInput) {
  on(chatInput, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter allows new lines
  });
}

if (modelSelect) {
  on(modelSelect, 'change', () => {
    chatEngine = null;
    modelStatus.textContent = 'Model changed. Click "Check Model Status" or "Download & Cache Model".';
    modelStatus.style.color = 'var(--muted)';
  });
}

// On load: check WebGPU and model status
if (!checkWebGPUSupport()) {
  const warningMsg = '⚠️ WebGPU is not available in your browser. WebLLM requires WebGPU to run models. Use Chrome 113+, Edge 113+, or Safari 18+ with WebGPU enabled.';
  modelStatus.textContent = warningMsg;
  modelStatus.style.color = 'var(--error)';
  console.warn(warningMsg);
} else {
  checkModelStatus().finally(() => {
    listCachedModels().catch(console.error);
  });
}


