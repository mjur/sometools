// Unit Converter Categories Page
// Displays all available unit categories

console.log('🚀 unit-converter-categories.js script loading...');

import { qs, on } from '/js/ui.js';

const categoryGrid = qs('#category-grid');
const categorySearch = qs('#category-search');

let allCategories = [];
let categoryCards = [];

// Initialize
(async () => {
  console.log('Unit converter categories initializing...');
  
  // Load categories
  try {
    const { CATEGORIES } = await import('/js/utils/unit-definitions.js');
    allCategories = CATEGORIES;
    
    if (!categoryGrid) {
      console.error('Category grid not found');
      return;
    }
    
    // Create category cards
    createCategoryCards(allCategories);
    
    // Set up search functionality
    if (categorySearch) {
      on(categorySearch, 'input', (e) => {
        filterCategories(e.target.value);
      });
    }
    
    console.log(`Loaded ${allCategories.length} categories`);
    
  } catch (error) {
    console.error('Failed to load categories:', error);
    if (categoryGrid) {
      categoryGrid.innerHTML = '<p>Failed to load categories. Please refresh the page.</p>';
    }
  }
})();

function createCategoryCards(categories) {
  // Clear existing cards
  categoryGrid.innerHTML = '';
  categoryCards = [];
  
  categories.forEach(category => {
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
    categoryCards.push(card);
  });
}

function filterCategories(query) {
  const queryLower = query.toLowerCase().trim();
  
  if (!queryLower) {
    // Show all categories
    categoryCards.forEach(card => {
      card.style.display = '';
    });
    return;
  }
  
  // Filter categories
  categoryCards.forEach(card => {
    const categoryName = card.getAttribute('data-name') || '';
    const categoryId = card.getAttribute('data-category') || '';
    const cardText = (card.querySelector('h2')?.textContent || '').toLowerCase();
    const cardDesc = (card.querySelector('p')?.textContent || '').toLowerCase();
    
    const matches = 
      categoryName.includes(queryLower) ||
      categoryId.includes(queryLower) ||
      cardText.includes(queryLower) ||
      cardDesc.includes(queryLower);
    
    card.style.display = matches ? '' : 'none';
  });
}

