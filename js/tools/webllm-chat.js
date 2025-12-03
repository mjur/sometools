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
const modelSelectionToggle = qs('#model-selection-toggle');
const modelSelectionPane = qs('#model-selection-pane');
const chatMicBtn = qs('#chat-mic-btn');
const chatMicStatus = qs('#chat-mic-status');

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

// Toggle model selection collapse
if (modelSelectionToggle && modelSelectionPane) {
  const toolSection = modelSelectionPane.closest('section.tool');
  
  on(modelSelectionToggle, 'click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isCollapsed = modelSelectionPane.classList.contains('collapsed');
    if (isCollapsed) {
      modelSelectionPane.classList.remove('collapsed');
      if (toolSection) {
        toolSection.classList.remove('collapsed');
      }
      modelSelectionToggle.textContent = '−';
      modelSelectionToggle.title = 'Collapse model selection';
    } else {
      modelSelectionPane.classList.add('collapsed');
      if (toolSection) {
        toolSection.classList.add('collapsed');
      }
      modelSelectionToggle.textContent = '+';
      modelSelectionToggle.title = 'Expand model selection';
    }
  });
  
  // Set initial title
  if (modelSelectionToggle) {
    modelSelectionToggle.title = 'Collapse model selection';
  }
}

// Speech recognition setup
let recognition = null;
let isListening = false;
let networkErrorCount = 0;
let voskModel = null;
let voskRecognizer = null;
let useLocalRecognition = false;
let mediaStream = null;
let audioContext = null;
let processor = null;

// Initialize local Vosk.js speech recognition
async function initLocalSpeechRecognition() {
  // Check if Vosk is available - it might be loaded differently
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

    // Use locally hosted model zip file (Vosk.js expects a zip/tar.gz URL)
    const modelUrl = '/models/vosk-model-small-en-us-0.15.zip';
    
    console.log('Attempting to load Vosk model from:', modelUrl);
    console.log('Note: Model must be hosted locally due to CORS restrictions');
    console.log('Vosk object:', VoskLib);
    console.log('Vosk keys:', Object.keys(VoskLib || {}));
    
    // Try different API patterns
    let model = null;
    let recognizer = null;
    
    // First verify the model zip file is accessible
    try {
      const testResponse = await fetch(modelUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        throw new Error(`Model file not accessible: ${testResponse.status}`);
      }
      console.log('Model zip file is accessible');
    } catch (fetchError) {
      console.error('Cannot access model file:', fetchError);
      throw new Error(`Cannot access model at ${modelUrl}. Make sure the server is running and the model zip file is in the correct location.`);
    }
    
    // Pattern 1: Vosk.createModel / Vosk.createRecognizer
    if (typeof VoskLib.createModel === 'function') {
      console.log('Using Vosk.createModel API');
      try {
        if (chatMicStatus) {
          chatMicStatus.textContent = '📥 Loading model (this may take 30-60 seconds)...';
        }
        
        console.log('Calling Vosk.createModel...');
        
        // Vosk.createModel loads and processes the model files
        // This can take time as it needs to load all model files
        const loadPromise = VoskLib.createModel(modelUrl);
        
        // Show progress updates
        const progressInterval = setInterval(() => {
          if (chatMicStatus && chatMicStatus.textContent.includes('Loading')) {
            chatMicStatus.textContent = '📥 Loading model (still processing, please wait)...';
          }
        }, 5000);
        
        // Add timeout but make it longer since model loading can be slow
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            clearInterval(progressInterval);
            reject(new Error('Model loading timed out after 2 minutes. The model might be too large or the server is slow.'));
          }, 120000) // 2 minutes
        );
        
        model = await Promise.race([loadPromise, timeoutPromise]);
        clearInterval(progressInterval);
        
        console.log('Model loaded, creating recognizer...');
        console.log('Model object:', model);
        console.log('Model type:', typeof model);
        console.log('Model constructor:', model?.constructor?.name);
        console.log('Model methods:', Object.keys(model || {}));
        console.log('Model prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model || {})));
        console.log('VoskLib methods:', Object.keys(VoskLib || {}));
        
        // Check if model has methods we can use
        if (model) {
          console.log('Checking model for recognizer methods...');
          for (const key in model) {
            if (typeof model[key] === 'function') {
              console.log(`Model.${key} is a function`);
            }
          }
          // Check prototype chain
          let proto = Object.getPrototypeOf(model);
          while (proto && proto !== Object.prototype) {
            console.log('Prototype:', proto.constructor.name);
            const protoMethods = Object.getOwnPropertyNames(proto).filter(name => typeof proto[name] === 'function');
            console.log('Prototype methods:', protoMethods);
            proto = Object.getPrototypeOf(proto);
          }
        }
        
        if (chatMicStatus) {
          chatMicStatus.textContent = '📥 Creating recognizer...';
        }
        
        // In Vosk.js, the model might need to be used with a Recognizer class
        // Or the model itself might be usable as a recognizer
        // Let's try all possible patterns
        
        // Pattern 1: Check if model has recognizer methods (might be usable directly)
        if (model && (typeof model.acceptWaveform === 'function' || typeof model.recognize === 'function' || typeof model.recognizeFinal === 'function')) {
          console.log('Model appears to be a recognizer already, using directly');
          recognizer = model;
        }
        // Pattern 2: VoskLib.Recognizer constructor
        else if (typeof VoskLib.Recognizer === 'function') {
          console.log('Using new VoskLib.Recognizer(model, 16000)');
          try {
            recognizer = new VoskLib.Recognizer(model, 16000);
          } catch (e) {
            console.log('Recognizer constructor failed, trying with object:', e);
            recognizer = new VoskLib.Recognizer({ model: model, sampleRate: 16000 });
          }
        }
        // Pattern 3: model.createRecognizer method
        else if (model && typeof model.createRecognizer === 'function') {
          console.log('Using model.createRecognizer(16000)');
          recognizer = model.createRecognizer(16000);
        }
        // Pattern 4: model.recognizer property
        else if (model && model.recognizer) {
          console.log('Using model.recognizer property');
          recognizer = typeof model.recognizer === 'function' ? model.recognizer(16000) : model.recognizer;
        }
        // Pattern 5: Use model directly (might work)
        else {
          console.log('Using model directly as recognizer (fallback)');
          recognizer = model;
        }
        
        // Verify recognizer has required methods
        if (!recognizer || (typeof recognizer.acceptWaveform !== 'function' && typeof recognizer.recognize !== 'function')) {
          console.warn('Recognizer might not have expected methods:', Object.keys(recognizer || {}));
          // Still try to use it - might work anyway
        }
        
        console.log('Recognizer created:', recognizer);
        console.log('Recognizer has acceptWaveform:', typeof recognizer?.acceptWaveform === 'function');
        console.log('Recognizer has recognize:', typeof recognizer?.recognize === 'function');
      } catch (corsError) {
        if (corsError.message && corsError.message.includes('CORS')) {
          throw new Error('Vosk model requires local hosting. The model URL has CORS restrictions. Please host the model locally at /models/vosk-model-small-en-us-0.15/ or use Web Speech API (requires internet).');
        }
        if (corsError.message && corsError.message.includes('timeout')) {
          throw new Error('Model loading timed out. The model files might be too large or the server is slow. Try using Web Speech API instead.');
        }
        throw corsError;
      }
    }
    // Pattern 2: new Vosk.Model / new Vosk.Recognizer
    else if (typeof VoskLib.Model === 'function') {
      console.log('Using Vosk.Model constructor API');
      model = new VoskLib.Model(modelUrl);
      if (model.ready) await model.ready();
      
      // Try different ways to create recognizer
      if (typeof VoskLib.Recognizer === 'function') {
        recognizer = new VoskLib.Recognizer(model, 16000);
      } else if (model && typeof model.createRecognizer === 'function') {
        recognizer = model.createRecognizer(16000);
      } else if (model && model.recognizer) {
        recognizer = model.recognizer;
      } else {
        throw new Error('Could not create recognizer from Model');
      }
    }
    // Pattern 3: Default export
    else if (VoskLib.default) {
      const VoskDefault = VoskLib.default;
      if (typeof VoskDefault.createModel === 'function') {
        console.log('Using Vosk.default.createModel API');
        model = await VoskDefault.createModel(modelUrl);
        
        if (typeof VoskDefault.createRecognizer === 'function') {
          recognizer = await VoskDefault.createRecognizer(model, 16000);
        } else if (typeof VoskDefault.Recognizer === 'function') {
          recognizer = new VoskDefault.Recognizer(model, 16000);
        } else if (model && typeof model.createRecognizer === 'function') {
          recognizer = model.createRecognizer(16000);
        } else {
          throw new Error('Could not create recognizer');
        }
      } else if (typeof VoskDefault.Model === 'function') {
        console.log('Using Vosk.default.Model API');
        model = new VoskDefault.Model(modelUrl);
        if (model.ready) await model.ready();
        
        if (typeof VoskDefault.Recognizer === 'function') {
          recognizer = new VoskDefault.Recognizer(model, 16000);
        } else if (model && typeof model.createRecognizer === 'function') {
          recognizer = model.createRecognizer(16000);
        } else {
          throw new Error('Could not create recognizer');
        }
      }
    }
    
    if (!model) {
      throw new Error('Could not load Vosk model. Available methods: ' + Object.keys(VoskLib).join(', '));
    }
    
    // Check if model has a worker (Vosk.js uses Web Workers)
    if (model.worker) {
      console.log('Model has worker, setting up worker-based recognition');
      console.log('Model methods:', Object.getOwnPropertyNames(model));
      console.log('Model prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));
      
      // Check if model has recognize methods
      if (typeof model.recognize === 'function') {
        console.log('Model has recognize method');
        voskModel = model;
        voskRecognizer = model;
      } else if (typeof model.processAudio === 'function') {
        console.log('Model has processAudio method');
        voskModel = model;
        voskRecognizer = model;
      } else {
        console.log('Model uses worker, will communicate via postMessage');
        voskModel = model;
        voskRecognizer = model; // Use model directly, but communicate via worker
      }
      
      // Vosk.js model uses a worker internally, but we shouldn't override its handler
      // Instead, we should use the model's API methods if available
      // Let's check what methods the model exposes
      
      // Check if model has KaldiRecognizer method (this is the correct API!)
      if (typeof model.KaldiRecognizer === 'function') {
        console.log('Found KaldiRecognizer method! Creating recognizer...');
        try {
          // KaldiRecognizer is a class, so we need to use 'new'
          voskRecognizer = new model.KaldiRecognizer(model, 16000);
          console.log('Created KaldiRecognizer:', voskRecognizer);
          console.log('KaldiRecognizer methods:', Object.getOwnPropertyNames(voskRecognizer));
          console.log('KaldiRecognizer prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(voskRecognizer)));
          
          // Set up event listeners for recognition results
          // KaldiRecognizer emits 'result' and 'partialresult' events
          voskRecognizer.on('result', (message) => {
            console.log('Recognition result event:', message);
            const result = message.result || message;
            if (result.text) {
              if (chatInput) {
                const currentText = chatInput.value.trim();
                chatInput.value = currentText + (currentText ? ' ' : '') + result.text + ' ';
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
              }
              if (chatMicStatus) {
                chatMicStatus.textContent = `🎤 Got: ${result.text}`;
                chatMicStatus.style.color = 'var(--ok)';
              }
            }
          });
          
          voskRecognizer.on('partialresult', (message) => {
            console.log('Partial result event:', message);
            const partial = message.result || message;
            if (partial.partial && chatMicStatus) {
              chatMicStatus.textContent = `🎤 Listening: ${partial.partial}`;
              chatMicStatus.style.color = 'var(--accent)';
            }
          });
        } catch (e) {
          console.error('Failed to create KaldiRecognizer:', e);
          // Try without 'new' in case it's a factory function
          try {
            voskRecognizer = model.KaldiRecognizer(model, 16000);
            console.log('Created KaldiRecognizer without new:', voskRecognizer);
          } catch (e2) {
            console.error('Both attempts failed:', e2);
          }
        }
      } else {
        console.log('KaldiRecognizer method not found on model');
      }
      
      // Set up worker message handler to intercept recognition results
      // But preserve the original handler so Vosk.js can still function
      // Store original handler if it exists
      const originalOnMessage = model.worker.onmessage;
      model.worker.onmessage = (e) => {
        console.log('Worker message received:', e.data);
        console.log('Message type:', typeof e.data);
        console.log('Message keys:', e.data && typeof e.data === 'object' ? Object.keys(e.data) : 'N/A');
        
        // Try to handle the message
        const message = e.data;
        
        // Check for result in various formats
        let result = null;
        let partial = null;
        
        // Vosk.js worker might send different message formats
        // Try parsing as JSON string first
        if (typeof message === 'string') {
          try {
            const parsed = JSON.parse(message);
            console.log('Parsed JSON string:', parsed);
            if (parsed.text) result = parsed;
            if (parsed.partial) partial = parsed;
            if (parsed.result) {
              const res = typeof parsed.result === 'string' ? JSON.parse(parsed.result) : parsed.result;
              if (res.text) result = res;
            }
          } catch (e) {
            console.log('Not JSON string');
          }
        }
        // Check for result property
        else if (message && typeof message === 'object') {
          if (message.result) {
            result = typeof message.result === 'string' ? JSON.parse(message.result) : message.result;
            console.log('Found result:', result);
          }
          if (message.partialResult) {
            partial = typeof message.partialResult === 'string' ? JSON.parse(message.partialResult) : message.partialResult;
            console.log('Found partialResult:', partial);
          }
          if (message.text) {
            result = message;
            console.log('Found text in message:', result);
          }
          if (message.partial) {
            partial = message;
            console.log('Found partial in message:', partial);
          }
        }
        
        console.log('Extracted result:', result);
        console.log('Extracted partial:', partial);
        
        if (result && result.text) {
          console.log('Processing result text:', result.text);
          if (chatInput) {
            const currentText = chatInput.value.trim();
            chatInput.value = currentText + (currentText ? ' ' : '') + result.text + ' ';
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
          }
          if (chatMicStatus) {
            chatMicStatus.textContent = `🎤 Got: ${result.text}`;
            chatMicStatus.style.color = 'var(--ok)';
          }
        }
        
        if (partial && partial.partial && chatMicStatus) {
          console.log('Processing partial:', partial.partial);
          chatMicStatus.textContent = `🎤 Listening: ${partial.partial}`;
          chatMicStatus.style.color = 'var(--accent)';
        }
        
        // Call original handler if it exists
        if (originalOnMessage) {
          originalOnMessage(e);
        }
      };
    } else {
      // If we couldn't create a separate recognizer, try using the model directly
      if (!recognizer) {
        console.log('No recognizer created, trying to use model directly');
        recognizer = model;
      }
      voskModel = model;
      voskRecognizer = recognizer;
    }
    
    console.log('Vosk model loaded successfully');
    useLocalRecognition = true;
    
    if (chatMicStatus) {
      chatMicStatus.style.display = 'none';
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Vosk:', error);
    console.error('Vosk error details:', {
      message: error.message,
      stack: error.stack,
      voskAvailable: typeof Vosk !== 'undefined',
      windowVosk: typeof window.Vosk !== 'undefined'
    });
    useLocalRecognition = false;
    
    // Show helpful message about CORS/local hosting requirement
    if (chatMicStatus) {
      let errorMsg = 'Local speech recognition unavailable. ';
      if (error.message && error.message.includes('CORS')) {
        errorMsg += 'Vosk models require local hosting. Using Web Speech API instead (requires internet).';
      } else {
        errorMsg += `Error: ${error.message}. Using Web Speech API instead.`;
      }
      chatMicStatus.textContent = errorMsg;
      chatMicStatus.style.color = 'var(--muted)';
      setTimeout(() => {
        if (chatMicStatus) {
          chatMicStatus.style.display = 'none';
        }
      }, 5000);
    }
    
    // Don't show error toast - just silently fall back to Web Speech API
    return false;
  }
}

// Start local speech recognition
async function startLocalRecognition() {
  if (!voskRecognizer) {
    const loaded = await initLocalSpeechRecognition();
    if (!loaded) {
      toast('Failed to load local speech recognition', 'error');
      return;
    }
  }

  try {
    // Get microphone access
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    
    const source = audioContext.createMediaStreamSource(mediaStream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (!isListening || !voskRecognizer) return;
      
      try {
        // Check if we have a KaldiRecognizer (the correct Vosk.js API!)
        // acceptWaveform expects an AudioBuffer, not Int16Array
        // Results come through events, not method calls
        if (voskRecognizer && typeof voskRecognizer.acceptWaveform === 'function') {
          // Use the KaldiRecognizer's acceptWaveform method
          // It expects an AudioBuffer, so pass e.inputBuffer directly
          // Results will come through the 'result' and 'partialresult' events we set up
          voskRecognizer.acceptWaveform(e.inputBuffer);
          return; // Success, don't try other methods
        }
        
        // Fallback: Check if model has direct methods (unlikely to be needed)
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        if (voskModel && typeof voskModel.recognize === 'function') {
          const result = voskModel.recognize(int16Data);
          if (result && result.text) {
            if (chatInput) {
              const currentText = chatInput.value.trim();
              chatInput.value = currentText + (currentText ? ' ' : '') + result.text + ' ';
              chatInput.style.height = 'auto';
              chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
            }
            if (chatMicStatus) {
              chatMicStatus.textContent = `🎤 Got: ${result.text}`;
              chatMicStatus.style.color = 'var(--ok)';
            }
          }
        }
        // Fallback: Check if model uses worker pattern (Vosk.js)
        else if (voskModel && voskModel.worker) {
          // This shouldn't be needed if KaldiRecognizer works
          console.warn('Using worker directly - KaldiRecognizer should be used instead');
          const audioCopy = new Int16Array(int16Data);
          try {
            voskModel.worker.postMessage(audioCopy.buffer, [audioCopy.buffer]);
          } catch (e) {
            console.error('Failed to send audio buffer to worker:', e);
          }
        }
        // Try acceptWaveform method (standard Vosk API - direct)
        else if (typeof voskRecognizer?.acceptWaveform === 'function') {
          if (voskRecognizer.acceptWaveform(int16Data)) {
            const result = JSON.parse(voskRecognizer.result());
            if (result.text) {
              if (chatInput) {
                const currentText = chatInput.value.trim();
                chatInput.value = currentText + (currentText ? ' ' : '') + result.text + ' ';
                
                // Auto-resize textarea
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
              }
              
              if (chatMicStatus) {
                chatMicStatus.textContent = `🎤 Got: ${result.text}`;
                chatMicStatus.style.color = 'var(--ok)';
              }
            }
          } else {
            const partial = JSON.parse(voskRecognizer.partialResult());
            if (partial.partial && chatMicStatus) {
              chatMicStatus.textContent = `🎤 Listening: ${partial.partial}`;
              chatMicStatus.style.color = 'var(--accent)';
            }
          }
        }
        // Try recognize method (alternative API)
        else if (typeof voskRecognizer.recognize === 'function') {
          const result = voskRecognizer.recognize(int16Data);
          if (result && result.text) {
            if (chatInput) {
              const currentText = chatInput.value.trim();
              chatInput.value = currentText + (currentText ? ' ' : '') + result.text + ' ';
              chatInput.style.height = 'auto';
              chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
            }
            if (chatMicStatus) {
              chatMicStatus.textContent = `🎤 Got: ${result.text}`;
              chatMicStatus.style.color = 'var(--ok)';
            }
          }
        } else {
          console.warn('Recognizer does not have acceptWaveform or recognize method, and no worker found');
        }
      } catch (error) {
        console.error('Error processing audio:', error);
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
      chatMicStatus.textContent = '🎤 Listening (local, offline)...';
      chatMicStatus.style.color = 'var(--accent)';
    }
    
    return true;
  } catch (error) {
    console.error('Failed to start local recognition:', error);
    toast(`Failed to start microphone: ${error.message}`, 'error');
    return false;
  }
}

// Stop local speech recognition
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
      if (chatMicStatus) {
        chatMicStatus.style.display = 'none';
      }
    }, 2000);
  }
}

function initSpeechRecognition() {
  // Try to use local Vosk recognition first
  if (typeof Vosk !== 'undefined') {
    // Vosk is available, we'll use it
    return 'local';
  }

  // Fallback to Web Speech API
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    if (chatMicBtn) {
      chatMicBtn.style.display = 'none';
      toast('Speech recognition not supported in this browser. Use Chrome, Edge, or Safari.', 'error');
    }
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  // Set up event handlers
  recognition.onstart = () => {
    isListening = true;
    // Only reset error count if we successfully started (not during retry)
    // Don't reset if we're in the middle of retrying network errors
    if (networkErrorCount === 0) {
      // Fresh start, reset is fine
    } else {
      // We're retrying, keep the count but this is a successful restart
      console.log('Successfully restarted after network error');
    }
    if (chatInput) {
      // Store the current text as base text
      chatInput.dataset.baseText = chatInput.value;
    }
    if (chatMicBtn) {
      chatMicBtn.style.background = 'var(--error)';
      chatMicBtn.style.color = 'white';
      chatMicBtn.title = 'Stop listening';
    }
    if (chatMicStatus) {
      chatMicStatus.style.display = 'block';
      chatMicStatus.textContent = '🎤 Listening... Speak now';
      chatMicStatus.style.color = 'var(--accent)';
    }
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    if (chatInput) {
      // Get the base text (before this recognition session)
      const baseText = chatInput.dataset.baseText || '';
      
      // Update with new transcriptions
      const newText = baseText + finalTranscript + interimTranscript;
      chatInput.value = newText;
      
      // Auto-resize textarea
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
    }

    if (chatMicStatus) {
      if (interimTranscript) {
        chatMicStatus.textContent = `🎤 Listening: ${interimTranscript}`;
      } else if (finalTranscript) {
        chatMicStatus.textContent = `🎤 Got: ${finalTranscript.trim()}`;
      }
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    
    // Handle network errors with retry limit
    if (event.error === 'network' && isListening) {
      networkErrorCount++;
      console.log(`Network error count: ${networkErrorCount}`);
      
      // Stop retrying after 3 attempts
      if (networkErrorCount >= 3) {
        console.log('Max network errors reached, stopping recognition');
        isListening = false;
        networkErrorCount = 0;
        
        // Make sure recognition is stopped
        try {
          recognition.stop();
        } catch (e) {
          // Ignore if already stopped
        }
        
        if (chatMicBtn) {
          chatMicBtn.style.background = '';
          chatMicBtn.style.color = '';
          chatMicBtn.title = 'Start voice input';
        }
        
        if (chatMicStatus) {
          chatMicStatus.textContent = '❌ Network error: Speech recognition requires internet. Check your connection.';
          chatMicStatus.style.color = 'var(--error)';
          setTimeout(() => {
            if (chatMicStatus) {
              chatMicStatus.style.display = 'none';
            }
          }, 5000);
        }
        return;
      }
      
      // Try to restart - stop first, then start
      console.log(`Network error (attempt ${networkErrorCount}/3), attempting to restart...`);
      setTimeout(() => {
        if (isListening && recognition) {
          try {
            // Stop first if running
            try {
              recognition.stop();
            } catch (e) {
              // Ignore if not running
            }
            
            // Wait a bit before restarting
            setTimeout(() => {
              if (isListening && recognition) {
                try {
                  recognition.start();
                  if (chatMicStatus) {
                    chatMicStatus.textContent = `🎤 Reconnecting... (${networkErrorCount}/3)`;
                    chatMicStatus.style.color = 'var(--muted)';
                  }
                } catch (e) {
                  console.error('Failed to restart after network error:', e);
                  networkErrorCount = 3; // Force stop
                  isListening = false;
                }
              }
            }, 500);
          } catch (e) {
            console.error('Failed to stop/restart after network error:', e);
            networkErrorCount = 3; // Force stop
            isListening = false;
          }
        }
      }, 1000);
      return;
    }
    
    // Reset network error count for non-network errors
    if (event.error !== 'network') {
      networkErrorCount = 0;
    }
    
    isListening = false;
    
    if (chatMicBtn) {
      chatMicBtn.style.background = '';
      chatMicBtn.style.color = '';
      chatMicBtn.title = 'Start voice input';
    }
    
    if (chatMicStatus) {
      let errorMsg = 'Error: ';
      switch (event.error) {
        case 'no-speech':
          errorMsg = 'No speech detected. Try again.';
          break;
        case 'audio-capture':
          errorMsg = 'No microphone found.';
          break;
        case 'not-allowed':
          errorMsg = 'Microphone permission denied.';
          break;
        case 'network':
          errorMsg = 'Network error. Speech recognition requires internet connection.';
          break;
        case 'aborted':
          // User stopped it, don't show error
          chatMicStatus.style.display = 'none';
          return;
        default:
          errorMsg = `Error: ${event.error}`;
      }
      chatMicStatus.textContent = errorMsg;
      chatMicStatus.style.color = 'var(--error)';
      setTimeout(() => {
        if (chatMicStatus) {
          chatMicStatus.style.display = 'none';
        }
      }, 4000);
    }
  };

  recognition.onend = () => {
    // Don't auto-restart if we have network errors
    if (networkErrorCount >= 3) {
      isListening = false;
      return;
    }
    
    // If we're still supposed to be listening, restart (some browsers auto-stop)
    if (isListening) {
      try {
        recognition.start();
        return;
      } catch (e) {
        // If restart fails, we're done
        console.log('Recognition ended, restart failed:', e);
      }
    }
    
    isListening = false;
    if (chatMicBtn) {
      chatMicBtn.style.background = '';
      chatMicBtn.style.color = '';
      chatMicBtn.title = 'Start voice input';
    }
    // Only show "Done" if we were actually listening (not if user stopped it)
    if (chatMicStatus && chatMicStatus.textContent.includes('Listening')) {
      chatMicStatus.textContent = '✅ Done listening';
      chatMicStatus.style.color = 'var(--ok)';
      setTimeout(() => {
        if (chatMicStatus) {
          chatMicStatus.style.display = 'none';
        }
      }, 2000);
    }
  };

  return 'webapi';
}

async function toggleSpeechRecognition() {
  // Check what type of recognition to use
  let recognitionType = useLocalRecognition ? 'local' : null;
  
  if (!recognitionType) {
    const initResult = initSpeechRecognition();
    if (!initResult) {
      toast('Speech recognition is not supported in your browser', 'error');
      return;
    }
    recognitionType = initResult;
  }

  if (isListening) {
    if (recognitionType === 'local') {
      stopLocalRecognition();
    } else {
      isListening = false;
      recognition.stop();
    }
  } else {
    if (recognitionType === 'local') {
      await startLocalRecognition();
    } else {
      try {
        isListening = true;
        recognition.start();
      } catch (error) {
        isListening = false;
        console.error('Failed to start recognition:', error);
        toast('Failed to start voice input. Make sure microphone permission is granted.', 'error');
      }
    }
  }
}

// Event wiring
if (downloadModelBtn) on(downloadModelBtn, 'click', downloadModel);
if (checkModelBtn) on(checkModelBtn, 'click', checkModelStatus);
if (clearModelBtn) on(clearModelBtn, 'click', clearSelectedModel);
if (chatSendBtn) on(chatSendBtn, 'click', sendMessage);
if (chatClearConversationBtn) on(chatClearConversationBtn, 'click', clearConversation);
if (chatNewChatBtn) on(chatNewChatBtn, 'click', newChat);
if (chatMicBtn) on(chatMicBtn, 'click', toggleSpeechRecognition);

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


