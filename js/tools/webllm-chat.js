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
const chatNewChatBtn = qs('#chat-new-chat');
const chatList = qs('#chat-list');

let messages = [];
let currentChatId = null;

const STORAGE_KEY = 'webllm-chat-saved-chats';

// Load chats from localStorage
function loadChats() {
  try {
    const chatsJson = localStorage.getItem(STORAGE_KEY);
    return chatsJson ? JSON.parse(chatsJson) : {};
  } catch (e) {
    console.error('Error loading chats:', e);
    return {};
  }
}

// Save chats to localStorage
function saveChats(chats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    return true;
  } catch (e) {
    console.error('Error saving chats:', e);
    toast('Error saving chat. Storage may be full.', 'error');
    return false;
  }
}

// Generate unique ID
function generateChatId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Generate title from first message
function generateChatTitle(messages) {
  if (!messages || messages.length === 0) {
    return 'New Chat';
  }
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const content = firstUserMessage.content.trim();
    if (content.length <= 50) {
      return content;
    }
    return content.substring(0, 50) + '...';
  }
  return 'New Chat';
}

// Save current chat
function saveCurrentChat() {
  if (messages.length === 0) {
    return; // Don't save empty chats
  }

  const chats = loadChats();
  const now = Date.now();
  const title = generateChatTitle(messages);

  if (currentChatId && chats[currentChatId]) {
    // Update existing chat
    chats[currentChatId].title = title;
    chats[currentChatId].messages = messages;
    chats[currentChatId].updated = now;
  } else {
    // Create new chat
    currentChatId = generateChatId();
    chats[currentChatId] = {
      id: currentChatId,
      title: title,
      messages: messages,
      created: now,
      updated: now,
      model: modelSelect ? modelSelect.value : null
    };
  }

  saveChats(chats);
  displayChatList();
}

// Load a chat
function loadChat(chatId) {
  const chats = loadChats();
  const chat = chats[chatId];
  
  if (!chat) {
    toast('Chat not found', 'error');
    return;
  }

  // Save current chat before loading new one
  if (currentChatId && messages.length > 0) {
    saveCurrentChat();
  }

  currentChatId = chatId;
  messages = chat.messages || [];
  
  // Update model if different
  if (chat.model && modelSelect && chat.model !== modelSelect.value) {
    modelSelect.value = chat.model;
    chatEngine = null; // Reset engine when model changes
  }

  // Display messages
  chatLog.innerHTML = '';
  messages.forEach(msg => {
    appendMessage(msg.role, msg.content);
  });

  displayChatList();
}

// Create new chat
function newChat() {
  // Save current chat before creating new one
  if (currentChatId && messages.length > 0) {
    saveCurrentChat();
  }

  currentChatId = null;
  messages = [];
  chatLog.innerHTML = '<p class="text-sm text-muted">Select a model, download it if needed, then start chatting. Your messages and responses stay in your browser.</p>';
  displayChatList();
}

// Delete a chat
function deleteChat(chatId) {
  if (!confirm('Are you sure you want to delete this chat?')) {
    return;
  }

  const chats = loadChats();
  delete chats[chatId];
  saveChats(chats);

  if (currentChatId === chatId) {
    newChat();
  } else {
    displayChatList();
  }
}

// Display chat list
function displayChatList() {
  if (!chatList) return;

  const chats = loadChats();
  const chatEntries = Object.values(chats).sort((a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0));

  if (chatEntries.length === 0) {
    chatList.innerHTML = '<p class="text-sm text-muted" style="padding: 1rem; text-align: center; margin: 0;">No saved chats yet</p>';
    return;
  }

  chatList.innerHTML = chatEntries.map(chat => {
    const isActive = chat.id === currentChatId;
    const date = new Date(chat.updated || chat.created);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
      <div class="chat-item" data-chat-id="${chat.id}" style="
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: ${isActive ? 'var(--bg-hover)' : 'var(--bg)'};
        cursor: pointer;
        transition: all 0.2s;
        ${isActive ? 'border-color: var(--accent); border-width: 2px;' : ''}
      ">
        <div style="display: flex; justify-content: space-between; align-items: start; gap: 0.5rem;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: ${isActive ? '600' : '500'}; font-size: 0.875rem; margin-bottom: 0.25rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(chat.title)}
            </div>
            <div style="font-size: 0.75rem; color: var(--muted);">
              ${dateStr}
            </div>
            ${chat.model ? `<div style="font-size: 0.7rem; color: var(--muted); margin-top: 0.25rem;">${escapeHtml(chat.model.replace(/-MLC$/, '').replace(/-q4f16_1$/, ''))}</div>` : ''}
          </div>
          <button class="chat-delete-btn" data-chat-id="${chat.id}" style="
            background: transparent;
            border: 1px solid var(--border);
            padding: 0.25rem;
            border-radius: 4px;
            cursor: pointer;
            color: var(--text);
            opacity: 0.6;
            transition: all 0.2s;
            flex-shrink: 0;
          " title="Delete chat">×</button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners
  chatList.querySelectorAll('.chat-item').forEach(item => {
    const chatId = item.getAttribute('data-chat-id');
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('chat-delete-btn')) {
        loadChat(chatId);
      }
    });
  });

  chatList.querySelectorAll('.chat-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const chatId = btn.getAttribute('data-chat-id');
      deleteChat(chatId);
    });
  });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
    
    // Save chat after sending message
    saveCurrentChat();
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
  if (currentChatId) {
    // Delete the current chat
    const chats = loadChats();
    delete chats[currentChatId];
    saveChats(chats);
    currentChatId = null;
  }
  messages = [];
  chatLog.innerHTML = '<p class="text-sm text-muted">Conversation cleared. Start a new chat.</p>';
  displayChatList();
}

// Event wiring
if (downloadModelBtn) on(downloadModelBtn, 'click', downloadModel);
if (checkModelBtn) on(checkModelBtn, 'click', checkModelStatus);
if (clearModelBtn) on(clearModelBtn, 'click', clearSelectedModel);
if (chatSendBtn) on(chatSendBtn, 'click', sendMessage);
if (chatClearConversationBtn) on(chatClearConversationBtn, 'click', clearConversation);
if (chatNewChatBtn) on(chatNewChatBtn, 'click', newChat);

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

// On load: check WebGPU and model status, load chat list
displayChatList();

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


