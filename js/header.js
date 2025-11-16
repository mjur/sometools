// Shared header functionality (theme toggle)
import { toggleTheme, qs } from '/js/ui.js';

// Initialize theme toggle on all pages
document.addEventListener('DOMContentLoaded', () => {
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
});

