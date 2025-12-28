// WebLLM AI Conversation Tool
// Watch two AI models converse with each other

import { toast, on, qs } from '/js/ui.js';

let CreateMLCEngine = null;
let webllmApi = null;
let ai1Engine = null;
let ai2Engine = null;
let isModelLoading = false;
let isConversationRunning = false;

const ai1ModelSelect = qs('#ai1-model-select');
const ai2ModelSelect = qs('#ai2-model-select');
const temperatureInput = qs('#temperature-input');
const maxTokensInput = qs('#max-tokens-input');
const maxTurnsInput = qs('#max-turns-input');
const downloadModelsBtn = qs('#download-models-btn');
const checkModelsBtn = qs('#check-models-btn');
const modelsStatus = qs('#models-status');
const conversationTopic = qs('#conversation-topic');
const startConversationBtn = qs('#start-conversation-btn');
const stopConversationBtn = qs('#stop-conversation-btn');
const clearConversationBtn = qs('#clear-conversation-btn');
const conversationLog = qs('#conversation-log');
const modelSelectionToggle = qs('#model-selection-toggle');
const modelSelectionPane = qs('#model-selection-pane');

let conversationHistory = [];
let shouldStopConversation = false;

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

    const ai1Model = ai1ModelSelect.value;
    const ai2Model = ai2ModelSelect.value;

    if (!ai1Model || !ai2Model) {
      modelsStatus.textContent = 'Please select models for both AIs.';
      modelsStatus.style.color = 'var(--error)';
      return false;
    }

    const ai1Cached = await webllmApi.hasModelInCache(ai1Model);
    const ai2Cached = await webllmApi.hasModelInCache(ai2Model);

    let statusText = '';
    statusText += `AI 1 (${ai1Model}): ${ai1Cached ? '✓ Cached' : '✗ Not cached'}\n`;
    statusText += `AI 2 (${ai2Model}): ${ai2Cached ? '✓ Cached' : '✗ Not cached'}`;

    if (ai1Cached && ai2Cached) {
      modelsStatus.textContent = statusText + '\n\n✓ Both models are ready!';
      modelsStatus.style.color = 'var(--ok)';
      return true;
    } else {
      modelsStatus.textContent = statusText + '\n\n✗ Click "Download & Cache Models" to download missing models.';
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

  const ai1Model = ai1ModelSelect.value;
  const ai2Model = ai2ModelSelect.value;

  if (!ai1Model || !ai2Model) {
    toast('Please select models for both AIs.', 'error');
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

    // Download AI 1 model
    modelsStatus.textContent = `Downloading AI 1 model "${ai1Model}"... This may take several minutes.`;
    modelsStatus.style.color = 'var(--muted)';
    toast(`Starting download of ${ai1Model}...`, 'info');

    let engine1;
    try {
      engine1 = await createEngine(
        ai1Model,
        {
          initProgressCallback: (report) => {
            if (hasError) return;
            const progress = report.progress || 0;
            const text = report.text || '';
            const percentage = (progress * 100).toFixed(1);
            modelsStatus.textContent = `AI 1 Model: ${percentage}% - ${text}`;
          },
          gpuDevice: null,
        }
      );
    } catch (engineError) {
      setError(engineError.message);
      throw engineError;
    }

    ai1Engine = engine1;
    toast('AI 1 model loaded!', 'success');

    // Check if AI 2 uses the same model
    if (ai1Model === ai2Model) {
      ai2Engine = engine1; // Reuse the same engine
      modelsStatus.textContent = `✓ Both models loaded (using same model: "${ai1Model}")`;
      modelsStatus.style.color = 'var(--ok)';
      toast('Both models ready (shared model)!', 'success');
    } else {
      // Download AI 2 model
      modelsStatus.textContent = `Downloading AI 2 model "${ai2Model}"... This may take several minutes.`;
      modelsStatus.style.color = 'var(--muted)';
      toast(`Starting download of ${ai2Model}...`, 'info');

      let engine2;
      try {
        engine2 = await createEngine(
          ai2Model,
          {
            initProgressCallback: (report) => {
              if (hasError) return;
              const progress = report.progress || 0;
              const text = report.text || '';
              const percentage = (progress * 100).toFixed(1);
              modelsStatus.textContent = `AI 2 Model: ${percentage}% - ${text}`;
            },
            gpuDevice: null,
          }
        );
      } catch (engineError) {
        setError(engineError.message);
        throw engineError;
      }

      ai2Engine = engine2;
      modelsStatus.textContent = `✓ Both models loaded!\nAI 1: ${ai1Model}\nAI 2: ${ai2Model}`;
      modelsStatus.style.color = 'var(--ok)';
      toast('Both models loaded!', 'success');
    }

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
  const ai1Model = ai1ModelSelect.value;
  const ai2Model = ai2ModelSelect.value;

  if (!ai1Model || !ai2Model) {
    throw new Error('Please select models for both AIs.');
  }

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

    // Initialize AI 1 engine if not already loaded
    if (!ai1Engine) {
      toast('Loading AI 1 model from cache...', 'info');
      modelsStatus.textContent = 'Loading AI 1 model...';

      let engine1;
      try {
        engine1 = await createEngine(
          ai1Model,
          {
            initProgressCallback: (report) => {
              if (hasError) return;
              const progress = report.progress || 0;
              const text = report.text || '';
              if (progress < 1) {
                const percentage = (progress * 100).toFixed(1);
                modelsStatus.textContent = `AI 1: Loading ${percentage}% - ${text}`;
              }
            },
            gpuDevice: null,
          }
        );
      } catch (engineError) {
        setError(engineError.message);
        throw engineError;
      }

      ai1Engine = engine1;
      toast('AI 1 model loaded!', 'success');
    }

    // Initialize AI 2 engine if not already loaded
    if (!ai2Engine) {
      if (ai1Model === ai2Model) {
        ai2Engine = ai1Engine; // Reuse the same engine
        modelsStatus.textContent = `✓ Both models ready (shared: ${ai1Model})`;
        toast('Both models ready!', 'success');
      } else {
        toast('Loading AI 2 model from cache...', 'info');
        modelsStatus.textContent = 'Loading AI 2 model...';

        let engine2;
        try {
          engine2 = await createEngine(
            ai2Model,
            {
              initProgressCallback: (report) => {
                if (hasError) return;
                const progress = report.progress || 0;
                const text = report.text || '';
                if (progress < 1) {
                  const percentage = (progress * 100).toFixed(1);
                  modelsStatus.textContent = `AI 2: Loading ${percentage}% - ${text}`;
                }
              },
              gpuDevice: null,
            }
          );
        } catch (engineError) {
          setError(engineError.message);
          throw engineError;
        }

        ai2Engine = engine2;
        modelsStatus.textContent = `✓ Both models ready!\nAI 1: ${ai1Model}\nAI 2: ${ai2Model}`;
        toast('Both models ready!', 'success');
      }
    }

    modelsStatus.style.color = 'var(--ok)';
    return { ai1Engine, ai2Engine };
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

function appendMessage(speaker, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `ai-message ${speaker}`;
  
  const speakerDiv = document.createElement('div');
  speakerDiv.className = 'speaker';
  speakerDiv.textContent = speaker === 'ai1' ? 'AI 1' : 'AI 2';
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  contentDiv.textContent = content;
  
  messageDiv.appendChild(speakerDiv);
  messageDiv.appendChild(contentDiv);
  
  conversationLog.appendChild(messageDiv);
  conversationLog.scrollTop = conversationLog.scrollHeight;
  
  return messageDiv;
}

async function generateResponse(engine, messages, speaker) {
  try {
    const temperature = parseFloat(temperatureInput.value) || 0.7;
    const maxTokens = parseInt(maxTokensInput.value) || 256;
    
    let reply = '';
    
    if (engine.chat && engine.chat.completions && engine.chat.completions.create) {
      const response = await engine.chat.completions.create({
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      });
      if (response && response.choices && response.choices[0]?.message?.content) {
        reply = response.choices[0].message.content.trim();
      }
    } else if (engine.chat) {
      const response = await engine.chat({
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens,
      });
      if (typeof response === 'string') {
        reply = response.trim();
      } else if (response && response.content) {
        reply = response.content;
      }
    } else if (engine.generate) {
      const fullPrompt = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') + '\nAssistant:';
      reply = await engine.generate(fullPrompt, { temperature: temperature, max_tokens: maxTokens });
    } else {
      throw new Error('WebLLM engine does not support chat or generate methods');
    }
    
    return reply.trim();
  } catch (error) {
    console.error(`Error generating response for ${speaker}:`, error);
    throw error;
  }
}

async function startConversation() {
  const topic = conversationTopic.value.trim();
  if (!topic) {
    toast('Please enter a conversation topic.', 'error');
    return;
  }

  try {
    // Disable controls
    startConversationBtn.disabled = true;
    stopConversationBtn.disabled = false;
    conversationTopic.disabled = true;
    ai1ModelSelect.disabled = true;
    ai2ModelSelect.disabled = true;
    temperatureInput.disabled = true;
    maxTokensInput.disabled = true;
    maxTurnsInput.disabled = true;
    downloadModelsBtn.disabled = true;
    
    isConversationRunning = true;
    shouldStopConversation = false;
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
    
    // Conversation loop
    for (let turn = 0; turn < maxTurns && !shouldStopConversation; turn++) {
      // AI 1's turn
      if (shouldStopConversation) break;
      
      modelsStatus.textContent = `Turn ${turn + 1}/${maxTurns} - AI 1 is thinking...`;
      modelsStatus.style.color = 'var(--accent)';
      
      try {
        // For AI 1, the conversation history should end with a 'user' message
        const ai1Response = await generateResponse(
          ai1Engine,
          conversationHistory,
          'ai1'
        );
        
        // Add AI 1's response to history as 'assistant'
        conversationHistory.push({
          role: 'assistant',
          content: ai1Response
        });
        
        appendMessage('ai1', ai1Response);
      } catch (error) {
        toast(`AI 1 error: ${error.message}`, 'error');
        appendMessage('ai1', `[Error: ${error.message}]`);
        break;
      }
      
      if (shouldStopConversation) break;
      
      // AI 2's turn
      modelsStatus.textContent = `Turn ${turn + 1}/${maxTurns} - AI 2 is thinking...`;
      
      try {
        // For AI 2, we need to transform the history so AI 1's response becomes a 'user' message
        // Create a copy of history where the last 'assistant' message is converted to 'user'
        const ai2History = conversationHistory.map((msg, idx) => {
          // Convert all 'assistant' messages to 'user' for AI 2's perspective
          // This makes it seem like AI 1's messages are coming from the user
          if (msg.role === 'assistant') {
            return { role: 'user', content: msg.content };
          }
          return msg;
        });
        
        const ai2Response = await generateResponse(
          ai2Engine,
          ai2History,
          'ai2'
        );
        
        // Add AI 2's response to history as 'user' (so it becomes input for AI 1 next turn)
        conversationHistory.push({
          role: 'user',
          content: ai2Response
        });
        
        appendMessage('ai2', ai2Response);
      } catch (error) {
        toast(`AI 2 error: ${error.message}`, 'error');
        appendMessage('ai2', `[Error: ${error.message}]`);
        break;
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
    stopConversationBtn.disabled = true;
    conversationTopic.disabled = false;
    ai1ModelSelect.disabled = false;
    ai2ModelSelect.disabled = false;
    temperatureInput.disabled = false;
    maxTokensInput.disabled = false;
    maxTurnsInput.disabled = false;
    downloadModelsBtn.disabled = false;
    
    isConversationRunning = false;
  }
}

function stopConversation() {
  if (isConversationRunning) {
    shouldStopConversation = true;
    toast('Stopping conversation...', 'info');
  }
}

function clearConversation() {
  conversationLog.innerHTML = '<p class="text-sm text-muted">Select models, enter a conversation topic, then click "Start Conversation" to watch two AIs discuss the topic.</p>';
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
      modelSelectionToggle.title = 'Collapse model configuration';
    } else {
      modelSelectionPane.classList.add('collapsed');
      modelSelectionToggle.textContent = '+';
      modelSelectionToggle.title = 'Expand model configuration';
    }
  });
  
  if (modelSelectionToggle) {
    modelSelectionToggle.title = 'Collapse model configuration';
  }
}

// Event listeners
if (downloadModelsBtn) on(downloadModelsBtn, 'click', downloadModels);
if (checkModelsBtn) on(checkModelsBtn, 'click', checkModelsStatus);
if (startConversationBtn) on(startConversationBtn, 'click', startConversation);
if (stopConversationBtn) on(stopConversationBtn, 'click', stopConversation);
if (clearConversationBtn) on(clearConversationBtn, 'click', clearConversation);

// Model change handlers
if (ai1ModelSelect) {
  on(ai1ModelSelect, 'change', () => {
    ai1Engine = null;
    modelsStatus.textContent = 'AI 1 model changed. Click "Check Models Status" or "Download & Cache Models".';
    modelsStatus.style.color = 'var(--muted)';
  });
}

if (ai2ModelSelect) {
  on(ai2ModelSelect, 'change', () => {
    ai2Engine = null;
    modelsStatus.textContent = 'AI 2 model changed. Click "Check Models Status" or "Download & Cache Models".';
    modelsStatus.style.color = 'var(--muted)';
  });
}

// On load: check WebGPU and models status
if (!checkWebGPUSupport()) {
  const warningMsg = '⚠️ WebGPU is not available in your browser. WebLLM requires WebGPU to run models. Use Chrome 113+, Edge 113+, or Safari 18+ with WebGPU enabled.';
  modelsStatus.textContent = warningMsg;
  modelsStatus.style.color = 'var(--error)';
  console.warn(warningMsg);
} else {
  checkModelsStatus().catch(console.error);
}

