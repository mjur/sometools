// Shared header functionality (theme toggle and side menu)
import { toggleTheme, qs } from '/js/ui.js';
import { initSideMenu } from '/js/side-menu.js';

// Initialize function
function init() {
  const themeToggle = qs('#theme-toggle');
  const themeIcon = qs('#theme-icon');
  
  if (themeToggle && themeIcon) {
    themeToggle.addEventListener('click', () => {
      const newTheme = toggleTheme();
      themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
    
    // Update icon on load
    const currentTheme = document.documentElement.getAttribute('data-theme');
    themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }
  
  // Initialize side menu (only on non-front pages)
  initSideMenu();
  
  // Initialize chatbot widget on all pages except the chat tool page
  const pathname = window.location.pathname;
  if (!pathname.includes('/ai/chat')) {
    // Initialize widget - don't wait for it
    initChatbotWidget().catch(err => {
      console.error('Error initializing chatbot widget:', err);
    });
    
    // Check after a delay if widget was created
    setTimeout(() => {
      const widget = document.getElementById('chatbot-widget');
      if (!widget) {
        console.warn('Chatbot widget was not created after initialization attempt');
      }
    }, 2000);
  }
}

// Initialize chatbot widget (async, doesn't block page load)
async function initChatbotWidget() {
  console.log('[Header] initChatbotWidget called');
  
  // Check if widget already exists
  if (document.getElementById('chatbot-widget')) {
    console.log('[Header] Widget already exists');
    return;
  }
  
  try {
    console.log('[Header] Attempting to load WebLLM bundle...');
    // Try to load WebLLM bundle, but continue even if it fails
    try {
      await import('/js/tools/bundled/webllm-bundle.js');
      console.log('[Header] WebLLM bundle loaded');
    } catch (e) {
      console.log('[Header] WebLLM bundle not available (continuing anyway):', e.message);
    }
    
    console.log('[Header] Attempting to import chatbot widget module...');
    // Initialize the widget - use dynamic import to avoid blocking
    const chatbotModule = await import('/js/utils/chatbot-widget.js');
    console.log('[Header] Chatbot module imported:', chatbotModule);
    
    if (chatbotModule && chatbotModule.initChatbotWidget) {
      console.log('[Header] Calling initChatbotWidget...');
      chatbotModule.initChatbotWidget();
      console.log('[Header] initChatbotWidget called, checking if widget exists...');
      
      // Check if widget was created
      setTimeout(() => {
        const widget = document.getElementById('chatbot-widget');
        if (widget) {
          console.log('[Header] Widget successfully created!');
        } else {
          console.error('[Header] Widget was not created after initChatbotWidget call');
        }
      }, 100);
    } else {
      console.error('[Header] Chatbot widget module did not export initChatbotWidget. Module keys:', Object.keys(chatbotModule || {}));
    }
  } catch (e) {
    console.error('[Header] Failed to initialize chatbot widget:', e);
    console.error('[Header] Error stack:', e.stack);
  }
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already loaded
  init();
}

