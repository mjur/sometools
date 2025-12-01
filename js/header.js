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
}

// Initialize immediately if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM is already loaded
  init();
}

