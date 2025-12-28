// WebLLM AI Conversation Tool
// Watch multiple AI models converse with each other

import { toast, on, qs } from '/js/ui.js';

let CreateMLCEngine = null;
let webllmApi = null;
let isModelLoading = false;
let isConversationRunning = false;

const temperatureInput = qs('#temperature-input');
const maxTokensInput = qs('#max-tokens-input');
const maxTurnsInput = qs('#max-turns-input');
const downloadModelsBtn = qs('#download-models-btn');
const checkModelsBtn = qs('#check-models-btn');
const modelsStatus = qs('#models-status');
const conversationTopic = qs('#conversation-topic');
const startConversationBtn = qs('#start-conversation-btn');
const pauseConversationBtn = qs('#pause-conversation-btn');
const stopConversationBtn = qs('#stop-conversation-btn');
const clearConversationBtn = qs('#clear-conversation-btn');
const conversationLog = qs('#conversation-log');
const modelSelectionToggle = qs('#model-selection-toggle');
const modelSelectionPane = qs('#model-selection-pane');
const interjectionPanel = qs('#interjection-panel');
const interjectionInput = qs('#interjection-input');
const submitInterjectionBtn = qs('#submit-interjection-btn');
const cancelInterjectionBtn = qs('#cancel-interjection-btn');
const addAiBtn = qs('#add-ai-btn');
const aiConfigsContainer = qs('#ai-configurations-container');

let conversationHistory = [];
let shouldStopConversation = false;
let isPaused = false;
let interjectionMessage = null;
let aiConfigs = []; // Array of {id, engine, modelSelect, systemPrompt, color}
let nextAiId = 1;

// Color palette for AIs
const AI_COLORS = [
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(59, 130, 246, 0.1) 100%)', border: '#3b82f6', text: '#3b82f6' }, // Blue
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(16, 185, 129, 0.1) 100%)', border: '#10b981', text: '#10b981' }, // Green
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(245, 158, 11, 0.1) 100%)', border: '#f59e0b', text: '#f59e0b' }, // Orange
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(239, 68, 68, 0.1) 100%)', border: '#ef4444', text: '#ef4444' }, // Red
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(168, 85, 247, 0.1) 100%)', border: '#a855f7', text: '#a855f7' }, // Purple
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(236, 72, 153, 0.1) 100%)', border: '#ec4899', text: '#ec4899' }, // Pink
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(20, 184, 166, 0.1) 100%)', border: '#14b8a6', text: '#14b8a6' }, // Teal
  { bg: 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(99, 102, 241, 0.1) 100%)', border: '#6366f1', text: '#6366f1' }, // Indigo
];

const MODEL_OPTIONS = `
  <optgroup label="Smallest Models (Recommended for Quick Start)">
    <option value="Qwen2.5-0.5B-Instruct-q4f16_1-MLC">Qwen2.5 0.5B Instruct (~300MB)</option>
    <option value="Qwen2-0.5B-Instruct-q4f16_1-MLC">Qwen2 0.5B Instruct (~300MB)</option>
    <option value="Llama-3.2-1B-Instruct-q4f16_1-MLC">Llama 3.2 1B Instruct (~600MB)</option>
    <option value="TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC">TinyLlama 1.1B Chat v1.0 (~600MB)</option>
    <option value="SmolLM2-360M-Instruct-q4f16_1-MLC">SmolLM2 360M Instruct (~200MB)</option>
  </optgroup>

  <optgroup label="Small Models (Good Balance)">
    <option value="Qwen2.5-1.5B-Instruct-q4f16_1-MLC">Qwen2.5 1.5B Instruct (~850MB)</option>
    <option value="Qwen2-1.5B-Instruct-q4f16_1-MLC">Qwen2 1.5B Instruct (~850MB)</option>
    <option value="Llama-3.2-3B-Instruct-q4f16_1-MLC">Llama 3.2 3B Instruct (~1.8GB)</option>
    <option value="Hermes-3-Llama-3.2-3B-q4f16_1-MLC">Hermes 3 Llama 3.2 3B (~1.8GB)</option>
    <option value="Phi-3.5-mini-instruct-q4f16_1-MLC">Phi-3.5 Mini Instruct (~2.3GB)</option>
    <option value="Phi-3-mini-4k-instruct-q4f16_1-MLC">Phi-3 Mini 4K Instruct (~2.3GB)</option>
  </optgroup>

  <optgroup label="Medium Models (Better Quality)">
    <option value="Llama-3.1-8B-Instruct-q4f16_1-MLC">Llama 3.1 8B Instruct (~4.6GB)</option>
    <option value="Llama-3-8B-Instruct-q4f16_1-MLC">Llama 3 8B Instruct (~4.6GB)</option>
    <option value="Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC">Hermes 2 Pro Llama 3 8B (~4.6GB)</option>
    <option value="Hermes-3-Llama-3.1-8B-q4f16_1-MLC">Hermes 3 Llama 3.1 8B (~4.6GB)</option>
    <option value="Qwen2.5-7B-Instruct-q4f16_1-MLC">Qwen2.5 7B Instruct (~3.8GB)</option>
    <option value="Qwen2-7B-Instruct-q4f16_1-MLC">Qwen2 7B Instruct (~3.8GB)</option>
    <option value="Mistral-7B-Instruct-v0.3-q4f16_1-MLC">Mistral 7B Instruct v0.3 (~3.8GB)</option>
    <option value="Hermes-2-Pro-Mistral-7B-q4f16_1-MLC">Hermes 2 Pro Mistral 7B (~3.8GB)</option>
  </optgroup>

  <optgroup label="Specialized Models">
    <option value="Qwen2.5-Math-1.5B-Instruct-q4f16_1-MLC">Qwen2.5 Math 1.5B Instruct (~850MB)</option>
    <option value="Qwen2-Math-7B-Instruct-q4f16_1-MLC">Qwen2 Math 7B Instruct (~3.8GB)</option>
    <option value="Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC">Qwen2.5 Coder 7B Instruct (~3.8GB)</option>
    <option value="WizardMath-7B-V1.1-q4f16_1-MLC">WizardMath 7B V1.1 (~3.8GB)</option>
    <option value="DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC">DeepSeek R1 Distill Qwen 7B (~3.8GB)</option>
    <option value="DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC">DeepSeek R1 Distill Llama 8B (~4.6GB)</option>
  </optgroup>
`;

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

    // Try bundled module
    try {
      const bundledModule = await import('/js/tools/bundled/webllm-bundle.js');
      CreateMLCEngine = bundledModule.CreateMLCEngine || window.CreateMLCEngine;
      webllmApi = window.webllm || bundledModule.webllm || webllmApi;
      if (CreateMLCEngine && typeof CreateMLCEngine === 'function') {
        toast('WebLLM library loaded', 'success');
        return CreateMLCEngine;
      }
    } catch (e) {
      console.log('Bundled WebLLM not available:', e);
    }

    throw new Error('WebLLM library not found. Run "npm install && npm run build" to create the bundle.');
  } catch (e) {
    toast(`Failed to load WebLLM: ${e.message}`, 'error');
    console.error('WebLLM load error:', e);
    throw e;
  }
}

function createAiConfig(index) {
  const aiId = nextAiId++;
  const color = AI_COLORS[index % AI_COLORS.length];
  
  const configDiv = document.createElement('div');
  configDiv.className = 'ai-config';
  configDiv.dataset.aiId = aiId;
  configDiv.style.marginBottom = '1.5rem';
  configDiv.style.padding = '1rem';
  configDiv.style.background = 'var(--bg)';
  configDiv.style.border = `2px solid ${color.border}`;
  configDiv.style.borderRadius = '8px';
  
  const headerDiv = document.createElement('div');
  headerDiv.style.display = 'flex';
  headerDiv.style.justifyContent = 'space-between';
  headerDiv.style.alignItems = 'center';
  headerDiv.style.marginBottom = '0.75rem';
  
  const titleDiv = document.createElement('div');
  titleDiv.style.fontWeight = '600';
  titleDiv.style.fontSize = '1rem';
  titleDiv.style.color = color.text;
  titleDiv.textContent = `AI ${index + 1}`;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'secondary';
  removeBtn.textContent = '× Remove';
  removeBtn.style.padding = '0.25rem 0.5rem';
  removeBtn.style.fontSize = '0.875rem';
  removeBtn.onclick = () => removeAiConfig(aiId);
  
  headerDiv.appendChild(titleDiv);
  if (aiConfigs.length > 1 || index > 0) {
    headerDiv.appendChild(removeBtn);
  }
  
  const modelLabel = document.createElement('label');
  modelLabel.textContent = 'Model';
  modelLabel.style.display = 'block';
  modelLabel.style.marginBottom = '0.25rem';
  
  const modelSelect = document.createElement('select');
  modelSelect.id = `ai${aiId}-model-select`;
  modelSelect.innerHTML = MODEL_OPTIONS;
  if (index === 0) {
    modelSelect.value = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
  } else if (index === 1) {
    modelSelect.value = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
  }
  modelSelect.style.width = '100%';
  modelSelect.style.marginBottom = '0.75rem';
  modelSelect.onchange = () => {
    const config = aiConfigs.find(c => c.id === aiId);
    if (config) config.engine = null;
  };
  
  const promptLabel = document.createElement('label');
  promptLabel.textContent = 'System Instructions';
  promptLabel.style.display = 'block';
  promptLabel.style.marginBottom = '0.25rem';
  
  const systemPrompt = document.createElement('textarea');
  systemPrompt.id = `ai${aiId}-system-prompt`;
  systemPrompt.rows = 3;
  systemPrompt.placeholder = 'You are a helpful AI assistant. Be concise and informative.';
  systemPrompt.value = 'You are a helpful AI assistant participating in a conversation. Be concise and informative.';
  systemPrompt.style.width = '100%';
  systemPrompt.style.resize = 'vertical';
  systemPrompt.style.fontSize = '0.875rem';
  
  const hintDiv = document.createElement('small');
  hintDiv.style.color = 'var(--muted)';
  hintDiv.style.display = 'block';
  hintDiv.style.marginTop = '0.25rem';
  hintDiv.textContent = `Define AI ${index + 1}'s personality, role, or expertise`;
  
  configDiv.appendChild(headerDiv);
  configDiv.appendChild(modelLabel);
  configDiv.appendChild(modelSelect);
  configDiv.appendChild(promptLabel);
  configDiv.appendChild(systemPrompt);
  configDiv.appendChild(hintDiv);
  
  const config = {
    id: aiId,
    index: index,
    element: configDiv,
    modelSelect: modelSelect,
    systemPrompt: systemPrompt,
    engine: null,
    color: color
  };
  
  aiConfigs.push(config);
  return configDiv;
}

function removeAiConfig(aiId) {
  if (aiConfigs.length <= 1) {
    toast('You need at least one AI for a conversation.', 'error');
    return;
  }
  
  const configIndex = aiConfigs.findIndex(c => c.id === aiId);
  if (configIndex === -1) return;
  
  const config = aiConfigs[configIndex];
  config.element.remove();
  aiConfigs.splice(configIndex, 1);
  
  // Update indices and titles
  aiConfigs.forEach((c, idx) => {
    c.index = idx;
    c.color = AI_COLORS[idx % AI_COLORS.length];
    c.element.style.borderColor = c.color.border;
    const titleDiv = c.element.querySelector('div div');
    if (titleDiv) {
      titleDiv.textContent = `AI ${idx + 1}`;
      titleDiv.style.color = c.color.text;
    }
    const hintDiv = c.element.querySelector('small');
    if (hintDiv) {
      hintDiv.textContent = `Define AI ${idx + 1}'s personality, role, or expertise`;
    }
  });
  
  toast(`AI removed. ${aiConfigs.length} AI${aiConfigs.length > 1 ? 's' : ''} remaining.`, 'success');
}

function addAiConfig() {
  if (aiConfigs.length >= AI_COLORS.length) {
    toast(`Maximum ${AI_COLORS.length} AIs supported.`, 'error');
    return;
  }
  
  const newConfig = createAiConfig(aiConfigs.length);
  aiConfigsContainer.appendChild(newConfig);
  toast(`AI ${aiConfigs.length} added!`, 'success');
}

function initializeAiConfigs() {
  // Start with 2 AIs
  aiConfigsContainer.innerHTML = '';
  aiConfigs = [];
  nextAiId = 1;
  
  aiConfigsContainer.appendChild(createAiConfig(0));
  aiConfigsContainer.appendChild(createAiConfig(1));
}

async function checkModelsStatus() {
  try {
    modelsStatus.textContent = 'Checking models status...';
    modelsStatus.style.color = 'var(--muted)';

    if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
      await loadWebLLM();
      if (!webllmApi || typeof webllmApi.hasModelInCache !== 'function') {
        modelsStatus.textContent = 'WebLLM cache API not available yet. Make sure the WebLLM bundle is loaded.';
        modelsStatus.style.color = 'var(--error)';
        return false;
      }
    }

    let statusText = '';
    let allCached = true;
    
    for (const config of aiConfigs) {
      const modelValue = config.modelSelect.value;
      if (!modelValue) {
        statusText += `AI ${config.index + 1}: No model selected\n`;
        allCached = false;
        continue;
      }
      
      const isCached = await webllmApi.hasModelInCache(modelValue);
      statusText += `AI ${config.index + 1} (${modelValue}): ${isCached ? '✓ Cached' : '✗ Not cached'}\n`;
      if (!isCached) allCached = false;
    }

    if (allCached) {
      modelsStatus.textContent = statusText + '\n✓ All models are ready!';
      modelsStatus.style.color = 'var(--ok)';
      return true;
    } else {
      modelsStatus.textContent = statusText + '\n✗ Click "Download & Cache Models" to download missing models.';
      modelsStatus.style.color = 'var(--error)';
      return false;
    }
  } catch (e) {
    modelsStatus.textContent = `Error checking models status: ${e.message}`;
    modelsStatus.style.color = 'var(--error)';
    return false;
  }
}

async function downloadModels() {
  if (isModelLoading) {
    toast('Models are already loading. Please wait...', 'info');
    return;
  }

  let hasError = false;
  let errorMessage = null;
  const setError = (msg) => {
    hasError = true;
    errorMessage = msg;
  };

  try {
    isModelLoading = true;
    downloadModelsBtn.disabled = true;
    downloadModelsBtn.textContent = 'Downloading...';

    const createEngine = await loadWebLLM();
    if (!createEngine || typeof createEngine !== 'function') {
      throw new Error('WebLLM CreateMLCEngine is not available. Please refresh the page.');
    }

    // Track unique models to avoid loading the same model twice
    const uniqueModels = new Map();
    for (const config of aiConfigs) {
      const modelValue = config.modelSelect.value;
      if (modelValue && !uniqueModels.has(modelValue)) {
        uniqueModels.set(modelValue, []);
      }
      if (modelValue) {
        uniqueModels.get(modelValue).push(config);
      }
    }

    // Load each unique model
    for (const [modelName, configs] of uniqueModels.entries()) {
      modelsStatus.textContent = `Downloading model "${modelName}"... This may take several minutes.`;
      modelsStatus.style.color = 'var(--muted)';
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
              modelsStatus.textContent = `${modelName}: ${percentage}% - ${text}`;
            },
            gpuDevice: null,
          }
        );
      } catch (engineError) {
        setError(engineError.message);
        throw engineError;
      }

      // Assign the engine to all configs using this model
      for (const config of configs) {
        config.engine = engine;
      }
      
      toast(`${modelName} loaded!`, 'success');
    }

    modelsStatus.textContent = `✓ All ${uniqueModels.size} unique model(s) loaded!`;
    modelsStatus.style.color = 'var(--ok)';
    toast('All models loaded!', 'success');

    isModelLoading = false;
    downloadModelsBtn.disabled = false;
    downloadModelsBtn.textContent = 'Download & Cache Models';
  } catch (e) {
    setError(e.message || 'Unknown error');
    isModelLoading = false;
    downloadModelsBtn.disabled = false;
    downloadModelsBtn.textContent = 'Download & Cache Models';

    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to download models: ${errorMsg}`, 'error');

    let errorText = `✗ Error: ${errorMsg}`;
    if (errorMsg.includes('GPU') || errorMsg.includes('WebGPU')) {
      errorText += '\n\n⚠️ WebGPU is required but not available or not fully supported.';
    } else if (errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('storage')) {
      errorText += '\n\n⚠️ Your browser cache may be full. Try clearing some models or increasing storage.';
    }

    modelsStatus.textContent = errorText;
    modelsStatus.style.color = 'var(--error)';
    modelsStatus.style.whiteSpace = 'pre-wrap';
    console.error('Model download error:', e);
  }
}

async function initializeEngines() {
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

    // Track unique models
    const uniqueModels = new Map();
    for (const config of aiConfigs) {
      const modelValue = config.modelSelect.value;
      if (modelValue && !uniqueModels.has(modelValue)) {
        uniqueModels.set(modelValue, []);
      }
      if (modelValue) {
        uniqueModels.get(modelValue).push(config);
      }
    }

    // Load engines for each unique model
    for (const [modelName, configs] of uniqueModels.entries()) {
      // Check if any config already has this engine loaded
      const existingEngine = configs.find(c => c.engine)?.engine;
      
      if (existingEngine) {
        // Reuse existing engine
        for (const config of configs) {
          config.engine = existingEngine;
        }
        continue;
      }

      toast(`Loading ${modelName} from cache...`, 'info');
      modelsStatus.textContent = `Loading ${modelName}...`;

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
                modelsStatus.textContent = `${modelName}: Loading ${percentage}% - ${text}`;
              }
            },
            gpuDevice: null,
          }
        );
      } catch (engineError) {
        setError(engineError.message);
        throw engineError;
      }

      for (const config of configs) {
        config.engine = engine;
      }
      toast(`${modelName} loaded!`, 'success');
    }

    modelsStatus.textContent = `✓ All models ready!`;
    modelsStatus.style.color = 'var(--ok)';
    toast('All models ready!', 'success');
  } catch (e) {
    setError(e.message || 'Unknown error');
    const errorMsg = errorMessage || e.message || 'Unknown error';
    toast(`Failed to load models: ${errorMsg}`, 'error');
    
    let errorText = `✗ Error loading models: ${errorMsg}`;
    modelsStatus.textContent = errorText;
    modelsStatus.style.color = 'var(--error)';
    modelsStatus.style.whiteSpace = 'pre-wrap';
    throw e;
  }
}

function appendMessage(speaker, content, aiIndex = -1) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message`;
  
  // Determine styling based on speaker
  let speakerName;
  let color;
  
  if (speaker === 'user') {
    speakerName = 'You';
    messageDiv.style.background = 'linear-gradient(135deg, var(--bg-elev) 0%, rgba(168, 85, 247, 0.1) 100%)';
    messageDiv.style.borderLeft = '3px solid #a855f7';
    color = { text: '#a855f7' };
  } else {
    const config = aiConfigs[aiIndex];
    speakerName = `AI ${aiIndex + 1}`;
    color = config.color;
    messageDiv.style.background = color.bg;
    messageDiv.style.borderLeft = `3px solid ${color.border}`;
  }
  
  messageDiv.style.marginBottom = '1rem';
  messageDiv.style.padding = '0.75rem';
  messageDiv.style.borderRadius = '6px';
  messageDiv.style.border = '1px solid var(--border)';
  
  const speakerDiv = document.createElement('div');
  speakerDiv.className = 'speaker';
  speakerDiv.textContent = speakerName;
  speakerDiv.style.fontWeight = '600';
  speakerDiv.style.marginBottom = '0.25rem';
  speakerDiv.style.fontSize = '0.875rem';
  speakerDiv.style.color = color.text;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  contentDiv.textContent = content;
  contentDiv.style.whiteSpace = 'pre-wrap';
  contentDiv.style.lineHeight = '1.5';
  
  messageDiv.appendChild(speakerDiv);
  messageDiv.appendChild(contentDiv);
  
  conversationLog.appendChild(messageDiv);
  conversationLog.scrollTop = conversationLog.scrollHeight;
  
  return messageDiv;
}

async function generateResponse(engine, messages, aiIndex, systemPrompt) {
  try {
    const temperature = parseFloat(temperatureInput.value) || 0.7;
    const maxTokens = parseInt(maxTokensInput.value) || 256;
    
    // Get system prompt, use default if empty
    const defaultSystemPrompt = 'You are a helpful AI assistant participating in a conversation. Be concise and informative.';
    const finalSystemPrompt = systemPrompt?.trim() || defaultSystemPrompt;
    
    // Prepend system message to the conversation
    const messagesWithSystem = [
      { role: 'system', content: finalSystemPrompt },
      ...messages
    ];
    
    let reply = '';
    
    if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
      const response = await engine.chat.completions.create({
        messages: messagesWithSystem,
        temperature: temperature,
        max_tokens: maxTokens,
      });
      if (response && response.choices && response.choices[0]?.message?.content) {
        reply = response.choices[0].message.content.trim();
      }
    } else if (engine.chat) {
      const response = await engine.chat({
        messages: messagesWithSystem,
        temperature: temperature,
        max_tokens: maxTokens,
      });
      if (typeof response === 'string') {
        reply = response.trim();
      } else if (response && response.content) {
        reply = response.content;
      }
    } else if (engine.generate) {
      // For generate method, include system prompt in the full prompt
      const fullPrompt = `${finalSystemPrompt}\n\n` + messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\nAssistant:';
      reply = await engine.generate(fullPrompt, { temperature: temperature, max_tokens: maxTokens });
    } else {
      throw new Error('WebLLM engine does not support chat or generate methods');
    }
    
    return reply.trim();
  } catch (error) {
    console.error(`Error generating response for AI ${aiIndex + 1}:`, error);
    throw error;
  }
}

async function startConversation() {
  const topic = conversationTopic.value.trim();
  if (!topic) {
    toast('Please enter a conversation topic.', 'error');
    return;
  }

  if (aiConfigs.length === 0) {
    toast('Please add at least one AI.', 'error');
    return;
  }

  try {
    // Disable controls
    startConversationBtn.disabled = true;
    pauseConversationBtn.disabled = false;
    stopConversationBtn.disabled = false;
    conversationTopic.disabled = true;
    temperatureInput.disabled = true;
    maxTokensInput.disabled = true;
    maxTurnsInput.disabled = true;
    downloadModelsBtn.disabled = true;
    addAiBtn.disabled = true;
    
    // Disable all AI configs
    aiConfigs.forEach(config => {
      config.modelSelect.disabled = true;
      config.systemPrompt.disabled = true;
    });
    
    isConversationRunning = true;
    shouldStopConversation = false;
    isPaused = false;
    interjectionMessage = null;
    conversationHistory = [];
    
    // Clear previous conversation
    conversationLog.innerHTML = '';
    
    // Initialize engines
    await initializeEngines();
    
    const maxTurns = parseInt(maxTurnsInput.value) || 10;
    
    // Start conversation with the initial prompt
    conversationHistory.push({
      role: 'user',
      content: topic
    });
    
    // Display the initial topic
    const topicDiv = document.createElement('div');
    topicDiv.style.padding = '0.75rem';
    topicDiv.style.marginBottom = '1rem';
    topicDiv.style.background = 'var(--bg-hover)';
    topicDiv.style.borderRadius = '6px';
    topicDiv.style.borderLeft = '3px solid var(--accent)';
    topicDiv.innerHTML = `<strong>Topic:</strong> ${topic}`;
    conversationLog.appendChild(topicDiv);
    
    // Conversation loop - cycle through all AIs
    for (let turn = 0; turn < maxTurns && !shouldStopConversation; turn++) {
      for (let aiIndex = 0; aiIndex < aiConfigs.length && !shouldStopConversation; aiIndex++) {
        const config = aiConfigs[aiIndex];
        
        // Check for user interjection
        if (isPaused) {
          await waitForInterjection();
          
          if (interjectionMessage) {
            conversationHistory.push({
              role: 'user',
              content: interjectionMessage
            });
            appendMessage('user', interjectionMessage);
            interjectionMessage = null;
          }
          
          isPaused = false;
          if (shouldStopConversation) break;
        }
        
        if (shouldStopConversation) break;
        
        modelsStatus.textContent = `Turn ${turn + 1}/${maxTurns} - AI ${aiIndex + 1} is thinking...`;
        modelsStatus.style.color = 'var(--accent)';
        
        try {
          // Transform history so all 'assistant' messages become 'user' for this AI
          const aiHistory = conversationHistory.map((msg) => {
            if (msg.role === 'assistant') {
              return { role: 'user', content: msg.content };
            }
            return msg;
          });
          
          const systemInstructions = config.systemPrompt.value || '';
          const aiResponse = await generateResponse(
            config.engine,
            aiHistory,
            aiIndex,
            systemInstructions
          );
          
          // Add response to history
          // Use 'assistant' for first AI, 'user' for others so they alternate properly
          conversationHistory.push({
            role: aiIndex === 0 ? 'assistant' : 'user',
            content: aiResponse
          });
          
          appendMessage('ai', aiResponse, aiIndex);
        } catch (error) {
          toast(`AI ${aiIndex + 1} error: ${error.message}`, 'error');
          appendMessage('ai', `[Error: ${error.message}]`, aiIndex);
          shouldStopConversation = true;
          break;
        }
      }
    }
    
    // Conversation ended
    if (shouldStopConversation) {
      modelsStatus.textContent = '⏸️ Conversation stopped by user';
      modelsStatus.style.color = 'var(--muted)';
      toast('Conversation stopped', 'info');
    } else {
      modelsStatus.textContent = `✓ Conversation completed (${maxTurns} turns)`;
      modelsStatus.style.color = 'var(--ok)';
      toast('Conversation completed!', 'success');
    }
  } catch (error) {
    toast(`Error: ${error.message}`, 'error');
    modelsStatus.textContent = `✗ Error: ${error.message}`;
    modelsStatus.style.color = 'var(--error)';
  } finally {
    // Re-enable controls
    startConversationBtn.disabled = false;
    pauseConversationBtn.disabled = true;
    stopConversationBtn.disabled = true;
    conversationTopic.disabled = false;
    temperatureInput.disabled = false;
    maxTokensInput.disabled = false;
    maxTurnsInput.disabled = false;
    downloadModelsBtn.disabled = false;
    addAiBtn.disabled = false;
    
    // Re-enable all AI configs
    aiConfigs.forEach(config => {
      config.modelSelect.disabled = false;
      config.systemPrompt.disabled = false;
    });
    
    // Hide interjection panel if shown
    if (interjectionPanel) {
      interjectionPanel.style.display = 'none';
    }
    
    isConversationRunning = false;
    isPaused = false;
  }
}

function pauseConversation() {
  if (isConversationRunning && !isPaused) {
    isPaused = true;
    pauseConversationBtn.disabled = true;
    modelsStatus.textContent = '⏸️ Conversation paused - Enter your message below';
    modelsStatus.style.color = 'var(--accent)';
    
    // Show interjection panel
    if (interjectionPanel) {
      interjectionPanel.style.display = 'block';
      if (interjectionInput) {
        interjectionInput.value = '';
        interjectionInput.focus();
      }
    }
    
    toast('Conversation paused. Enter your message to interject.', 'info');
  }
}

function waitForInterjection() {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (!isPaused || shouldStopConversation) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

function submitInterjection() {
  const message = interjectionInput?.value?.trim();
  
  if (!message) {
    toast('Please enter a message to interject.', 'error');
    return;
  }
  
  interjectionMessage = message;
  isPaused = false;
  
  // Hide interjection panel
  if (interjectionPanel) {
    interjectionPanel.style.display = 'none';
  }
  
  // Re-enable pause button
  if (pauseConversationBtn) {
    pauseConversationBtn.disabled = false;
  }
  
  modelsStatus.textContent = '▶️ Resuming conversation...';
  modelsStatus.style.color = 'var(--accent)';
  toast('Message added. Resuming conversation...', 'success');
}

function cancelInterjection() {
  isPaused = false;
  interjectionMessage = null;
  
  // Hide interjection panel
  if (interjectionPanel) {
    interjectionPanel.style.display = 'none';
  }
  
  // Re-enable pause button
  if (pauseConversationBtn) {
    pauseConversationBtn.disabled = false;
  }
  
  if (interjectionInput) {
    interjectionInput.value = '';
  }
  
  modelsStatus.textContent = '▶️ Resuming conversation...';
  modelsStatus.style.color = 'var(--accent)';
  toast('Interjection cancelled. Resuming conversation...', 'info');
}

function stopConversation() {
  if (isConversationRunning) {
    shouldStopConversation = true;
    toast('Stopping conversation...', 'info');
  }
}

function clearConversation() {
  conversationLog.innerHTML = '<p class="text-sm text-muted">Select models, enter a conversation topic, then click "Start Conversation" to watch the AIs discuss the topic.</p>';
  conversationHistory = [];
}

// Toggle model selection collapse
if (modelSelectionToggle && modelSelectionPane) {
  on(modelSelectionToggle, 'click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isCollapsed = modelSelectionPane.classList.contains('collapsed');
    if (isCollapsed) {
      modelSelectionPane.classList.remove('collapsed');
      modelSelectionToggle.textContent = '−';
      modelSelectionToggle.title = 'Collapse AI configuration';
    } else {
      modelSelectionPane.classList.add('collapsed');
      modelSelectionToggle.textContent = '+';
      modelSelectionToggle.title = 'Expand AI configuration';
    }
  });
  
  if (modelSelectionToggle) {
    modelSelectionToggle.title = 'Collapse AI configuration';
  }
}

// Event listeners
if (downloadModelsBtn) on(downloadModelsBtn, 'click', downloadModels);
if (checkModelsBtn) on(checkModelsBtn, 'click', checkModelsStatus);
if (startConversationBtn) on(startConversationBtn, 'click', startConversation);
if (pauseConversationBtn) on(pauseConversationBtn, 'click', pauseConversation);
if (stopConversationBtn) on(stopConversationBtn, 'click', stopConversation);
if (clearConversationBtn) on(clearConversationBtn, 'click', clearConversation);
if (submitInterjectionBtn) on(submitInterjectionBtn, 'click', submitInterjection);
if (cancelInterjectionBtn) on(cancelInterjectionBtn, 'click', cancelInterjection);
if (addAiBtn) on(addAiBtn, 'click', addAiConfig);

// Allow Enter to submit interjection (Shift+Enter for new line)
if (interjectionInput) {
  on(interjectionInput, 'keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitInterjection();
    }
  });
}

// Initialize with 2 AIs
initializeAiConfigs();

// On load: check WebGPU and models status
if (!checkWebGPUSupport()) {
  const warningMsg = '⚠️ WebGPU is not available in your browser. WebLLM requires WebGPU to run models. Use Chrome 113+, Edge 113+, or Safari 18+ with WebGPU enabled.';
  modelsStatus.textContent = warningMsg;
  modelsStatus.style.color = 'var(--error)';
  console.warn(warningMsg);
} else {
  checkModelsStatus().catch(console.error);
}
