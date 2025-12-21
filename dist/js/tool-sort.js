// Tool card drag and drop sorting functionality
import { qs, on } from '/js/ui.js';

const STORAGE_KEY_PREFIX = 'toolset-order-';

// Get saved tool order from localStorage
function getSavedOrder(category) {
  try {
    const key = STORAGE_KEY_PREFIX + category;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Error loading saved tool order:', e);
    return null;
  }
}

// Save tool order to localStorage
function saveOrder(category, toolIds) {
  try {
    const key = STORAGE_KEY_PREFIX + category;
    localStorage.setItem(key, JSON.stringify(toolIds));
  } catch (e) {
    console.error('Error saving tool order:', e);
  }
}

// Get the element after which to insert the dragged element
function getDragAfterElement(container, x, y) {
  const draggableElements = [...container.querySelectorAll('.tool-card:not(.dragging)')];
  
  if (draggableElements.length === 0) return null;
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    // Calculate distance to center of box
    const offsetX = x - (box.left + box.width / 2);
    const offsetY = y - (box.top + box.height / 2);
    
    // Simple distance check might be better for grid
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    
    if (distance < closest.distance) {
      return { distance: distance, element: child };
    } else {
      return closest;
    }
  }, { distance: Number.POSITIVE_INFINITY }).element;
}

// Initialize drag and drop sorting
export function initToolCardSorting() {
  const toolGrids = document.querySelectorAll('.tool-grid[data-sortable="true"]');
  
  toolGrids.forEach(toolGrid => {
    // Get category from parent section
    const section = toolGrid.closest('.category-section');
    const category = section ? section.getAttribute('data-category') : 'default';
    
    // Get all tool cards in this grid
    let cards = Array.from(toolGrid.querySelectorAll('.tool-card'));
    
    // Restore saved order if available
    const savedOrder = getSavedOrder(category);
    if (savedOrder && savedOrder.length === cards.length) {
      // Reorder cards based on saved order
      const cardMap = new Map(cards.map(card => [card.getAttribute('href'), card]));
      
      // Clear grid
      cards.forEach(card => card.remove());
      
      // Append in saved order
      savedOrder.forEach(href => {
        const card = cardMap.get(href);
        if (card) {
          toolGrid.appendChild(card);
        }
      });
      
      // Append any new cards that weren't in saved order
      cards.forEach(card => {
        if (!savedOrder.includes(card.getAttribute('href'))) {
          toolGrid.appendChild(card);
        }
      });
      
      // Refresh cards array
      cards = Array.from(toolGrid.querySelectorAll('.tool-card'));
    }

    // Make cards draggable
    cards.forEach(card => {
      card.draggable = true;
      card.setAttribute('draggable', 'true');
      
      // Add drag handle visual indicator if not present
      if (!card.querySelector('.drag-handle')) {
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮';
        dragHandle.setAttribute('aria-label', 'Drag to reorder');
        card.insertBefore(dragHandle, card.firstChild);
      }

      // Drag start
      on(card, 'dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.getAttribute('href'));
        card.classList.add('dragging');
        // Set a small delay to allow the drag to start
        setTimeout(() => {
          card.style.opacity = '0.5';
        }, 0);
      });

      // Drag end
      on(card, 'dragend', (e) => {
        card.classList.remove('dragging');
        card.style.opacity = '';
        const allCards = toolGrid.querySelectorAll('.tool-card');
        allCards.forEach(c => c.classList.remove('drag-over'));
        
        // Save new order
        const newOrder = Array.from(toolGrid.querySelectorAll('.tool-card')).map(c => c.getAttribute('href'));
        saveOrder(category, newOrder);
      });
      
      // Drag over - allow dropping on cards
      on(card, 'dragover', (e) => {
        e.preventDefault();
        const dragging = toolGrid.querySelector('.dragging');
        if (!dragging || dragging === card) return;
        
        // Find insert position
        const box = card.getBoundingClientRect();
        const next = (e.clientX - box.left) > (box.width / 2);
        
        if (next) {
          card.after(dragging);
        } else {
          card.before(dragging);
        }
      });
    });
    
    // Drag over container
    on(toolGrid, 'dragover', (e) => {
      e.preventDefault();
      const dragging = toolGrid.querySelector('.dragging');
      if (!dragging) return;
      
      // If dropping into empty space or end of list
      if (e.target === toolGrid) {
        toolGrid.appendChild(dragging);
      }
    });
  });
}
