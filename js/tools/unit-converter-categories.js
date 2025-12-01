// Unit Converter Categories Page
// Displays all available unit categories

console.log('🚀 unit-converter-categories.js script loading...');

import { qs } from '/js/ui.js';

const categoryGrid = qs('#category-grid');

// Initialize
(async () => {
  console.log('Unit converter categories initializing...');
  
  // Load categories
  try {
    const { CATEGORIES } = await import('/js/utils/unit-definitions.js');
    
    if (!categoryGrid) {
      console.error('Category grid not found');
      return;
    }
    
    // Create category cards
    CATEGORIES.forEach(category => {
      const card = document.createElement('a');
      card.href = `/convert/units/${category.id}`;
      card.className = 'tool-card';
      card.setAttribute('data-category', category.id);
      card.setAttribute('data-name', category.name.toLowerCase());
      
      const h2 = document.createElement('h2');
      h2.textContent = category.name;
      
      const p = document.createElement('p');
      p.textContent = `Convert units in the ${category.name} category`;
      
      card.appendChild(h2);
      card.appendChild(p);
      categoryGrid.appendChild(card);
    });
    
    console.log(`Loaded ${CATEGORIES.length} categories`);
    
  } catch (error) {
    console.error('Failed to load categories:', error);
    if (categoryGrid) {
      categoryGrid.innerHTML = '<p>Failed to load categories. Please refresh the page.</p>';
    }
  }
})();

