/**
 * Chatbot Widget - Standalone Component
 * 
 * A floating chatbot widget that can be included on any page.
 * Provides WebLLM-powered chat functionality with model management.
 * 
 * Usage:
 * ```html
 * <!-- Load WebLLM bundle first -->
 * <script type="module">
 *   try {
 *     await import('/js/tools/bundled/webllm-bundle.js');
 *   } catch (e) {
 *     console.log('WebLLM bundle not found');
 *   }
 * </script>
 * 
 * <!-- Initialize the widget -->
 * <script type="module">
 *   import { initChatbotWidget } from '/js/utils/chatbot-widget.js';
 *   initChatbotWidget();
 * </script>
 * ```
 * 
 * Requirements:
 * - WebLLM bundle must be loaded before initialization
 * - WebGPU support in browser (Chrome 113+, Edge 113+, Safari 18+)
 * - CSS base styles (/css/base.css) should be included
 */

import { toast, on, qs } from '/js/ui.js';

let CreateMLCEngine = null;
let webllmApi = null;
let chatEngine = null;
let isModelLoading = false;
let messages = [];
let currentChatId = null;

const STORAGE_KEY = 'webllm-chat-saved-chats';

// Speech recognition variables
let voskModel = null;
let voskRecognizer = null;
let useLocalRecognition = false;
let isListening = false;
let mediaStream = null;
let audioContext = null;
let processor = null;

// Get WebLLM model list
async function getWebLLMModelList() {
  try {
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
    
    // Fallback: common WebLLM models
    return [
      'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
      'Qwen2-0.5B-Instruct-q4f16_1-MLC',
      'Llama-3.2-1B-Instruct-q4f16_1-MLC',
      'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC',
      'SmolLM2-360M-Instruct-q4f16_1-MLC',
      'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
      'Llama-3.1-8B-Instruct-q4f16_1-MLC',
      'Phi-3-mini-4k-instruct-q4f16_1-MLC'
    ];
  } catch (error) {
    console.error('Failed to get WebLLM model list:', error);
    return [];
  }
}

// Load WebLLM library
async function loadWebLLM() {
  if (CreateMLCEngine) return CreateMLCEngine;

  try {
    if (typeof window !== 'undefined' && window.CreateMLCEngine) {
      CreateMLCEngine = window.CreateMLCEngine;
      webllmApi = window.webllm || webllmApi;
      return CreateMLCEngine;
    }

    // Try bundled module
    try {
      const bundledModule = await import('/js/tools/bundled/webllm-bundle.js');
      CreateMLCEngine = bundledModule.CreateMLCEngine || window.CreateMLCEngine;
      webllmApi = window.webllm || bundledModule.webllm || webllmApi;
      if (CreateMLCEngine && typeof CreateMLCEngine === 'function') {
        return CreateMLCEngine;
      }
    } catch (e) {
      console.log('Bundled WebLLM not available:', e);
    }

    throw new Error('WebLLM library not found. Run "npm install && npm run build" to create the bundle.');
  } catch (e) {
    console.error('WebLLM load error:', e);
    throw e;
  }
}

// Initialize chatbot widget on a page
export function initChatbotWidget() {
  // Check if widget already exists
  if (document.getElementById('chatbot-widget')) {
    console.log('Chatbot widget already initialized');
    return;
  }

  // Create widget HTML
  const widgetHTML = `
    <div id="chatbot-widget" class="chatbot-widget">
      <div class="chatbot-widget-toggle" id="chatbot-widget-toggle">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <div class="chatbot-widget-panel" id="chatbot-widget-panel">
        <div class="chatbot-widget-header">
          <h3>AI Chatbot</h3>
          <button class="chatbot-widget-close" id="chatbot-widget-close" aria-label="Close chatbot">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="chatbot-widget-content">
          <div class="chatbot-widget-model-section">
            <label for="chatbot-model-select" style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; display: block;">Model</label>
            <select id="chatbot-model-select" class="chatbot-widget-select">
              <option value="">Loading models...</option>
            </select>
            <div class="chatbot-widget-model-actions">
              <button id="chatbot-check-model" class="chatbot-widget-btn-small">Check Status</button>
              <button id="chatbot-download-model" class="chatbot-widget-btn-small">Download</button>
            </div>
            <div id="chatbot-model-status" class="chatbot-widget-status"></div>
          </div>
          
          <div class="chatbot-widget-chat-section">
            <div class="chatbot-widget-chat-header">
              <button id="chatbot-new-chat" class="chatbot-widget-btn-small" title="New Chat">+ New</button>
              <div id="chatbot-chat-list-container" style="display: none;">
                <select id="chatbot-chat-list" class="chatbot-widget-select" style="font-size: 0.75rem; padding: 0.3rem;">
                  <option value="">Select a saved chat...</option>
                </select>
              </div>
            </div>
            <div id="chatbot-log" class="chatbot-widget-log">
              <div class="chatbot-widget-placeholder">
                Select a model and download it to start chatting. All conversations stay in your browser.
              </div>
            </div>
            <div class="chatbot-widget-input-section">
              <div id="chatbot-mic-status" style="display: none; font-size: 0.75rem; color: var(--text-subtle); margin-bottom: 0.25rem; min-height: 1rem;"></div>
              <div class="chatbot-widget-input-row">
                <textarea id="chatbot-input" class="chatbot-widget-input" placeholder="Type your message..." rows="1"></textarea>
                <button id="chatbot-mic-btn" class="chatbot-widget-mic-btn" title="Voice input">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                </button>
              </div>
              <div class="chatbot-widget-input-actions">
                <button id="chatbot-clear" class="chatbot-widget-btn-small">Clear</button>
                <button id="chatbot-send" class="chatbot-widget-btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Add widget to body
  document.body.insertAdjacentHTML('beforeend', widgetHTML);

  // Add CSS if not already added
  if (!document.getElementById('chatbot-widget-styles')) {
    const style = document.createElement('style');
    style.id = 'chatbot-widget-styles';
    style.textContent = `
      /* Chatbot Widget Styles */
      .chatbot-widget {
        position: fixed;
        bottom: 5rem;
        right: 20px;
        z-index: 998;
      }
      
      .chatbot-widget-toggle {
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
      
      .chatbot-widget-toggle:hover {
        background: #1976d2;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
      }
      
      .chatbot-widget-toggle svg {
        width: 24px;
        height: 24px;
      }
      
      .chatbot-widget-panel {
        position: fixed;
        bottom: 5rem;
        right: 20px;
        width: 400px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 7rem);
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: slideInRight 0.3s ease;
      }
      
      .chatbot-widget-panel.expanded {
        display: flex;
      }
      
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      .chatbot-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg-elev);
      }
      
      .chatbot-widget-header h3 {
        margin: 0;
        font-size: 1.2rem;
      }
      
      .chatbot-widget-close {
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
      
      .chatbot-widget-close:hover {
        background: var(--bg-hover);
      }
      
      .chatbot-widget-content {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-height: 0;
        flex: 1;
      }
      
      .chatbot-widget-model-section {
        padding: 1rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg-elev);
      }
      
      .chatbot-widget-select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--bg);
        color: var(--text);
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
      }
      
      .chatbot-widget-model-actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      
      .chatbot-widget-btn-small {
        padding: 0.4rem 0.8rem;
        font-size: 0.75rem;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text);
      }
      
      .chatbot-widget-btn-small:hover {
        background: var(--bg-hover);
      }
      
      .chatbot-widget-btn-small:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .chatbot-widget-status {
        font-size: 0.75rem;
        color: var(--text-subtle);
        min-height: 1.5rem;
        padding: 0.25rem 0;
      }
      
      .chatbot-widget-chat-section {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }
      
      .chatbot-widget-log {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        min-height: 200px;
        max-height: 400px;
        background: var(--bg);
      }
      
      .chatbot-widget-placeholder {
        text-align: center;
        color: var(--text-subtle);
        font-size: 0.875rem;
        padding: 2rem 1rem;
      }
      
      .chatbot-message {
        margin-bottom: 1rem;
      }
      
      .chatbot-message-role {
        font-weight: 600;
        font-size: 0.75rem;
        color: var(--text-subtle);
        margin-bottom: 0.25rem;
      }
      
      .chatbot-message-content {
        white-space: pre-wrap;
        word-wrap: break-word;
        font-size: 0.875rem;
        line-height: 1.5;
      }
      
      .chatbot-widget-input-section {
        padding: 1rem;
        border-top: 1px solid var(--border);
        background: var(--bg-elev);
      }
      
      .chatbot-widget-chat-header {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid var(--border);
        background: var(--bg-elev);
        align-items: center;
      }
      
      .chatbot-widget-input-row {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        margin-bottom: 0.5rem;
      }
      
      .chatbot-widget-input {
        flex: 1;
        padding: 0.5rem;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: var(--bg);
        color: var(--text);
        font-family: inherit;
        font-size: 0.875rem;
        resize: none;
        min-height: 2.5rem;
        max-height: 6rem;
        line-height: 1.4;
      }
      
      .chatbot-widget-mic-btn {
        padding: 0.5rem;
        min-width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text);
        flex-shrink: 0;
      }
      
      .chatbot-widget-mic-btn:hover {
        background: var(--bg-hover);
      }
      
      .chatbot-widget-mic-btn svg {
        width: 18px;
        height: 18px;
      }
      
      .chatbot-widget-input:focus {
        outline: none;
        border-color: var(--accent);
      }
      
      .chatbot-widget-input-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      
      .chatbot-widget-btn-primary {
        padding: 0.5rem 1rem;
        background: var(--accent);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      
      .chatbot-widget-btn-primary:hover {
        background: #1976d2;
      }
      
      .chatbot-widget-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @media (max-width: 768px) {
        .chatbot-widget {
          bottom: 1rem;
          right: 1rem;
        }
        
        .chatbot-widget-panel {
          width: calc(100vw - 2rem);
          right: 1rem;
          bottom: 1rem;
          max-height: calc(100vh - 2rem);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize widget functionality
  initWidgetFunctionality();
}

// Chat saving functions
function loadChats() {
  try {
    const chatsJson = localStorage.getItem(STORAGE_KEY);
    return chatsJson ? JSON.parse(chatsJson) : {};
  } catch (e) {
    console.error('Error loading chats:', e);
    return {};
  }
}

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

function generateChatId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

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

function saveCurrentChat() {
  if (messages.length === 0) {
    return; // Don't save empty chats
  }

  const chats = loadChats();
  const now = Date.now();
  const title = generateChatTitle(messages);
  const modelSelect = qs('#chatbot-model-select');

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

function displayChatList() {
  const chatList = qs('#chatbot-chat-list');
  const chatListContainer = qs('#chatbot-chat-list-container');
  if (!chatList || !chatListContainer) return;

  const chats = loadChats();
  const chatEntries = Object.values(chats).sort((a, b) => (b.updated || 0) - (a.updated || 0));

  if (chatEntries.length === 0) {
    chatListContainer.style.display = 'none';
    return;
  }

  chatListContainer.style.display = 'block';
  chatList.innerHTML = '<option value="">Select a saved chat...</option>';
  
  chatEntries.forEach(chat => {
    const option = document.createElement('option');
    option.value = chat.id;
    option.textContent = chat.title || 'Untitled Chat';
    chatList.appendChild(option);
  });
}

// Escape HTML (needs to be accessible to appendMessage)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Append message to chat log (needs to be accessible to loadChat)
function appendMessage(role, content) {
  const chatLog = qs('#chatbot-log');
  if (!chatLog) return;
  
  // Remove placeholder if exists
  const placeholder = chatLog.querySelector('.chatbot-widget-placeholder');
  if (placeholder) {
    placeholder.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chatbot-message';
  messageDiv.innerHTML = `
    <div class="chatbot-message-role">${role === 'user' ? 'You' : 'Assistant'}</div>
    <div class="chatbot-message-content">${escapeHtml(content)}</div>
  `;
  chatLog.appendChild(messageDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function loadChat(chatId) {
  const chats = loadChats();
  const chat = chats[chatId];
  if (!chat) return false;

  currentChatId = chatId;
  messages = chat.messages || [];
  
  const chatLog = qs('#chatbot-log');
  if (chatLog) {
    chatLog.innerHTML = '';
    messages.forEach(msg => {
      appendMessage(msg.role, msg.content);
    });
  }

  const modelSelect = qs('#chatbot-model-select');
  if (modelSelect && chat.model) {
    modelSelect.value = chat.model;
  }

  return true;
}

function newChat() {
  currentChatId = null;
  messages = [];
  const chatLog = qs('#chatbot-log');
  if (chatLog) {
    chatLog.innerHTML = '<div class="chatbot-widget-placeholder">Select a model and download it to start chatting. All conversations stay in your browser.</div>';
  }
}

// Initialize widget functionality
function initWidgetFunctionality() {
  const toggle = qs('#chatbot-widget-toggle');
  const panel = qs('#chatbot-widget-panel');
  const close = qs('#chatbot-widget-close');
  const modelSelect = qs('#chatbot-model-select');
  const checkModelBtn = qs('#chatbot-check-model');
  const downloadModelBtn = qs('#chatbot-download-model');
  const modelStatus = qs('#chatbot-model-status');
  const chatLog = qs('#chatbot-log');
  const chatInput = qs('#chatbot-input');
  const chatSendBtn = qs('#chatbot-send');
  const chatClearBtn = qs('#chatbot-clear');
  const chatNewChatBtn = qs('#chatbot-new-chat');
  const chatList = qs('#chatbot-chat-list');
  const chatMicBtn = qs('#chatbot-mic-btn');
  const chatMicStatus = qs('#chatbot-mic-status');

  if (!toggle || !panel || !close) return;

  // Load model list
  async function loadModelList() {
    if (!modelSelect) return;
    
    try {
      const modelList = await getWebLLMModelList();
      modelSelect.innerHTML = '<option value="">Select a model...</option>';
      
      // Check which models are cached
      let cachedModels = [];
      try {
        await loadWebLLM();
        if (webllmApi && typeof webllmApi.hasModelInCache === 'function') {
          // Check each model to see if it's cached
          for (const model of modelList) {
            try {
              const isCached = await webllmApi.hasModelInCache(model);
              if (isCached) {
                cachedModels.push(model);
              }
            } catch (e) {
              // Ignore individual errors
            }
          }
        }
      } catch (e) {
        console.log('Could not check cached models:', e);
      }
      
      // Separate cached and uncached models
      const uncachedModels = modelList.filter(m => !cachedModels.includes(m));
      
      // Add cached models section at the top if any exist
      if (cachedModels.length > 0) {
        const cachedOptgroup = document.createElement('optgroup');
        cachedOptgroup.label = '✓ Cached Models';
        cachedModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.replace(/-MLC$/, '').replace(/-q4f16_1$/, '');
          cachedOptgroup.appendChild(option);
        });
        modelSelect.appendChild(cachedOptgroup);
      }
      
      // Group uncached models by size
      const smallest = uncachedModels.filter(m => m.includes('0.5B') || m.includes('360M') || m.includes('1.1B'));
      const small = uncachedModels.filter(m => m.includes('1.5B') || m.includes('3B') || m.includes('mini'));
      const medium = uncachedModels.filter(m => m.includes('8B') || m.includes('7B'));
      const large = uncachedModels.filter(m => m.includes('70B'));
      
      if (smallest.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Smallest';
        smallest.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.replace(/-MLC$/, '').replace(/-q4f16_1$/, '');
          optgroup.appendChild(option);
        });
        modelSelect.appendChild(optgroup);
      }
      
      if (small.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Small';
        small.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.replace(/-MLC$/, '').replace(/-q4f16_1$/, '');
          optgroup.appendChild(option);
        });
        modelSelect.appendChild(optgroup);
      }
      
      if (medium.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Medium';
        medium.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.replace(/-MLC$/, '').replace(/-q4f16_1$/, '');
          optgroup.appendChild(option);
        });
        modelSelect.appendChild(optgroup);
      }
      
      if (large.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Large';
        large.forEach(model => {
          const option = document.createElement('option');
          option.value = model;
          option.textContent = model.replace(/-MLC$/, '').replace(/-q4f16_1$/, '');
          optgroup.appendChild(option);
        });
        modelSelect.appendChild(optgroup);
      }
      
      // Set default to first cached model if available, otherwise smallest
      if (cachedModels.length > 0) {
        modelSelect.value = cachedModels[0];
      } else if (smallest.length > 0) {
        modelSelect.value = smallest[0];
      }
    } catch (error) {
      console.error('Failed to load model list:', error);
      if (modelSelect) {
        modelSelect.innerHTML = '<option value="">Failed to load models</option>';
      }
    }
  }

  // Get latest chat ID
  function getLatestChatId() {
    const chats = loadChats();
    const chatEntries = Object.values(chats).sort((a, b) => (b.updated || b.created || 0) - (a.updated || a.created || 0));
    return chatEntries.length > 0 ? chatEntries[0].id : null;
  }

  // Toggle panel
  on(toggle, 'click', () => {
    const isExpanded = panel.classList.contains('expanded');
    if (isExpanded) {
      panel.classList.remove('expanded');
    } else {
      panel.classList.add('expanded');
      if (modelSelect && modelSelect.options.length <= 1) {
        loadModelList();
      }
      // Load the latest chat when opening
      const latestChatId = getLatestChatId();
      if (latestChatId) {
        loadChat(latestChatId);
      }
      displayChatList();
    }
  });

  // Close panel
  on(close, 'click', () => {
    panel.classList.remove('expanded');
  });

  // Close when clicking outside the widget
  document.addEventListener('click', (e) => {
    if (!panel.classList.contains('expanded')) {
      return;
    }
    
    if (toggle.contains(e.target) || toggle === e.target) {
      return;
    }
    
    if (panel.contains(e.target) || panel === e.target) {
      return;
    }
    
    panel.classList.remove('expanded');
  });

  // appendMessage and escapeHtml are now defined outside this function scope so they can be used by loadChat

  // Check model status
  async function checkModelStatus() {
    if (!modelSelect || !modelStatus) return;
    
    const modelName = modelSelect.value;
    if (!modelName) {
      modelStatus.textContent = 'Please select a model';
      modelStatus.style.color = 'var(--text-subtle)';
      return;
    }

    try {
      modelStatus.textContent = 'Checking...';
      modelStatus.style.color = 'var(--text-subtle)';

      // Load WebLLM API
      await loadWebLLM();
      
      if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
        modelStatus.textContent = 'WebLLM API not available';
        modelStatus.style.color = 'var(--error)';
        return;
      }

      const cached = await webllmApi.hasModelInCache(modelName);
      if (cached) {
        modelStatus.textContent = '✓ Model is cached and ready';
        modelStatus.style.color = 'var(--ok)';
      } else {
        modelStatus.textContent = '✗ Model not cached. Click Download to download it.';
        modelStatus.style.color = 'var(--error)';
      }
    } catch (error) {
      modelStatus.textContent = `Error: ${error.message}`;
      modelStatus.style.color = 'var(--error)';
    }
  }

  // Download model
  async function downloadModel() {
    if (!modelSelect || !downloadModelBtn) return;
    
    const modelName = modelSelect.value;
    if (!modelName) {
      toast('Please select a model', 'error');
      return;
    }

    if (isModelLoading) {
      toast('Model is already loading', 'info');
      return;
    }

    try {
      isModelLoading = true;
      downloadModelBtn.disabled = true;
      downloadModelBtn.textContent = 'Downloading...';
      modelStatus.textContent = 'Downloading model...';
      modelStatus.style.color = 'var(--text-subtle)';

      const createEngine = await loadWebLLM();
      if (!createEngine || typeof createEngine !== 'function') {
        throw new Error('WebLLM CreateMLCEngine not available');
      }

      // Download model
      const engine = await createEngine(modelName, {
        initProgressCallback: (report) => {
          const progress = report.progress || 0;
          const text = report.text || '';
          if (progress < 1) {
            const percentage = (progress * 100).toFixed(1);
            modelStatus.textContent = `Downloading: ${percentage}% - ${text}`;
          }
        },
        gpuDevice: null,
      });

      chatEngine = engine;
      toast('Model downloaded successfully!', 'success');
      modelStatus.textContent = '✓ Model ready';
      modelStatus.style.color = 'var(--ok)';
    } catch (error) {
      console.error('Model download error:', error);
      toast(`Failed to download model: ${error.message}`, 'error');
      modelStatus.textContent = `✗ Error: ${error.message}`;
      modelStatus.style.color = 'var(--error)';
    } finally {
      isModelLoading = false;
      if (downloadModelBtn) {
        downloadModelBtn.disabled = false;
        downloadModelBtn.textContent = 'Download';
      }
    }
  }

  // Initialize chat engine
  async function initializeChatEngine() {
    if (chatEngine) return chatEngine;

    if (!modelSelect) {
      throw new Error('No model selected');
    }

    const modelName = modelSelect.value;
    if (!modelName) {
      throw new Error('Please select a model');
    }

    try {
      modelStatus.textContent = 'Loading model...';
      modelStatus.style.color = 'var(--text-subtle)';

      const createEngine = await loadWebLLM();
      if (!createEngine || typeof createEngine !== 'function') {
        throw new Error('WebLLM CreateMLCEngine not available');
      }

      const engine = await createEngine(modelName, {
        initProgressCallback: (report) => {
          const progress = report.progress || 0;
          const text = report.text || '';
          if (progress < 1) {
            const percentage = (progress * 100).toFixed(1);
            modelStatus.textContent = `Loading: ${percentage}% - ${text}`;
          }
        },
        gpuDevice: null,
      });

      chatEngine = engine;
      modelStatus.textContent = '✓ Model ready';
      modelStatus.style.color = 'var(--ok)';
      return engine;
    } catch (error) {
      modelStatus.textContent = `✗ Error: ${error.message}`;
      modelStatus.style.color = 'var(--error)';
      throw error;
    }
  }

  // Send message
  async function sendMessage() {
    if (!chatInput || !chatSendBtn) return;
    
    const content = chatInput.value.trim();
    if (!content) {
      toast('Please enter a message', 'error');
      return;
    }

    chatInput.value = '';
    chatInput.style.height = 'auto';
    appendMessage('user', content);
    messages.push({ role: 'user', content });
    saveCurrentChat();

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
      saveCurrentChat();
    } catch (e) {
      const errorMsg = e.message || 'Unknown error';
      toast(`Chat failed: ${errorMsg}`, 'error');
      appendMessage('assistant', `Error: ${errorMsg}`);
    } finally {
      if (chatSendBtn) {
        chatSendBtn.disabled = false;
        chatSendBtn.textContent = 'Send';
      }
    }
  }

  // Clear conversation
  function clearConversation() {
    saveCurrentChat();
    messages = [];
    currentChatId = null;
    if (chatLog) {
      chatLog.innerHTML = '<div class="chatbot-widget-placeholder">Select a model and download it to start chatting. All conversations stay in your browser.</div>';
    }
    displayChatList();
  }

  // Event listeners
  if (checkModelBtn) {
    on(checkModelBtn, 'click', checkModelStatus);
  }

  if (downloadModelBtn) {
    on(downloadModelBtn, 'click', downloadModel);
  }

  if (chatSendBtn) {
    on(chatSendBtn, 'click', sendMessage);
  }

  if (chatClearBtn) {
    on(chatClearBtn, 'click', clearConversation);
  }

  if (chatInput) {
    on(chatInput, 'keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
      // Shift+Enter allows new lines
    });
  }

  // Speech recognition functions
  async function initLocalSpeechRecognition() {
    // Load Vosk.js if not available
    if (typeof window.Vosk === 'undefined' && typeof Vosk === 'undefined') {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.3/dist/vosk.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch (e) {
        console.error('Failed to load Vosk.js:', e);
        return false;
      }
    }
    
    const VoskLib = window.Vosk || (typeof Vosk !== 'undefined' ? Vosk : null);
    
    if (!VoskLib) {
      console.log('Vosk.js not available');
      return false;
    }

    try {
      if (chatMicStatus) {
        chatMicStatus.style.display = 'block';
        chatMicStatus.textContent = '📥 Loading local speech recognition model (first time only, ~40MB)...';
        chatMicStatus.style.color = 'var(--muted)';
      }

      const modelUrl = '/models/vosk-model-small-en-us-0.15.zip';
      
      // Verify model is accessible
      try {
        const testResponse = await fetch(modelUrl, { method: 'HEAD' });
        if (!testResponse.ok) {
          throw new Error(`Model file not accessible: ${testResponse.status}`);
        }
      } catch (fetchError) {
        throw new Error(`Cannot access model at ${modelUrl}. Make sure the server is running and the model zip file is in the correct location.`);
      }
      
      let model = null;
      
      // Use Vosk.createModel API
      if (typeof VoskLib.createModel === 'function') {
        const loadPromise = VoskLib.createModel(modelUrl);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Model loading timed out')), 120000)
        );
        model = await Promise.race([loadPromise, timeoutPromise]);
      } else if (typeof VoskLib.Model === 'function') {
        model = new VoskLib.Model(modelUrl);
        if (model.ready) await model.ready();
      } else {
        throw new Error('Vosk API not available');
      }
      
      if (!model) {
        throw new Error('Could not load Vosk model');
      }
      
      // Create KaldiRecognizer
      if (model.worker && typeof model.KaldiRecognizer === 'function') {
        voskRecognizer = new model.KaldiRecognizer(model, 16000);
        
        // Set up event listeners
        voskRecognizer.on('result', (message) => {
          const result = message.result || message;
          if (result.text && chatInput) {
            const currentText = chatInput.value.trim();
            chatInput.value = currentText + (currentText ? ' ' : '') + result.text + ' ';
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
          }
          if (chatMicStatus) {
            chatMicStatus.textContent = `🎤 Got: ${result.text || ''}`;
            chatMicStatus.style.color = 'var(--ok)';
          }
        });
        
        voskRecognizer.on('partialresult', (message) => {
          const partial = message.result || message;
          if (partial.partial && chatMicStatus) {
            chatMicStatus.textContent = `🎤 Listening: ${partial.partial}`;
            chatMicStatus.style.color = 'var(--accent)';
          }
        });
        
        voskModel = model;
        useLocalRecognition = true;
        
        if (chatMicStatus) {
          chatMicStatus.style.display = 'none';
        }
        
        return true;
      } else {
        throw new Error('KaldiRecognizer not available');
      }
    } catch (error) {
      console.error('Failed to initialize Vosk:', error);
      useLocalRecognition = false;
      if (chatMicStatus) {
        chatMicStatus.textContent = `Local speech recognition unavailable: ${error.message}`;
        chatMicStatus.style.color = 'var(--muted)';
        setTimeout(() => {
          if (chatMicStatus) chatMicStatus.style.display = 'none';
        }, 5000);
      }
      return false;
    }
  }

  async function startLocalRecognition() {
    if (!voskRecognizer) {
      const loaded = await initLocalSpeechRecognition();
      if (!loaded) {
        toast('Failed to load local speech recognition', 'error');
        return;
      }
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!isListening || !voskRecognizer) return;
        
        if (voskRecognizer && typeof voskRecognizer.acceptWaveform === 'function') {
          voskRecognizer.acceptWaveform(e.inputBuffer);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      isListening = true;
      
      if (chatMicBtn) {
        chatMicBtn.style.background = 'var(--error)';
        chatMicBtn.style.color = 'white';
        chatMicBtn.title = 'Stop listening';
      }
      
      if (chatMicStatus) {
        chatMicStatus.style.display = 'block';
        chatMicStatus.textContent = '🎤 Listening...';
        chatMicStatus.style.color = 'var(--accent)';
      }
    } catch (error) {
      console.error('Failed to start local recognition:', error);
      toast(`Failed to start microphone: ${error.message}`, 'error');
      return false;
    }
  }

  function stopLocalRecognition() {
    isListening = false;
    
    if (processor) {
      processor.disconnect();
      processor = null;
    }
    
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    
    if (chatMicBtn) {
      chatMicBtn.style.background = '';
      chatMicBtn.style.color = '';
      chatMicBtn.title = 'Start voice input';
    }
    
    if (chatMicStatus) {
      chatMicStatus.textContent = '✅ Done listening';
      chatMicStatus.style.color = 'var(--ok)';
      setTimeout(() => {
        if (chatMicStatus) chatMicStatus.style.display = 'none';
      }, 2000);
    }
  }

  async function toggleSpeechRecognition() {
    if (isListening) {
      stopLocalRecognition();
    } else {
      await startLocalRecognition();
    }
  }

  // Event listeners for new features
  if (chatNewChatBtn) {
    on(chatNewChatBtn, 'click', () => {
      saveCurrentChat();
      newChat();
    });
  }

  if (chatList) {
    on(chatList, 'change', (e) => {
      const chatId = e.target.value;
      if (chatId) {
        saveCurrentChat();
        loadChat(chatId);
      }
    });
  }

  if (chatMicBtn) {
    on(chatMicBtn, 'click', toggleSpeechRecognition);
  }

  // Load model list on init
  loadModelList();
  displayChatList();
}

