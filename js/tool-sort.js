// Tool card drag and drop sorting functionality
import { qs, on } from '/js/ui.js';

const STORAGE_KEY = 'toolset-tool-order';

// Get saved tool order from localStorage
function getSavedOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    console.error('Error loading saved tool order:', e);
    return null;
  }
}

// Save tool order to localStorage
function saveOrder(toolIds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toolIds));
  } catch (e) {
    console.error('Error saving tool order:', e);
  }
}

// Get the element after which to insert the dragged element
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.tool-card:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Initialize drag and drop sorting
export function initToolCardSorting() {
  const toolGrid = qs('#tool-grid');
  if (!toolGrid) return;

  // Get all tool cards
  let cards = Array.from(toolGrid.querySelectorAll('.tool-card'));
  
  // Restore saved order if available
  const savedOrder = getSavedOrder();
  if (savedOrder && savedOrder.length === cards.length) {
    // Reorder cards based on saved order
    const cardMap = new Map(cards.map(card => [card.href, card]));
    savedOrder.forEach(href => {
      const card = cardMap.get(href);
      if (card) {
        toolGrid.appendChild(card);
      }
    });
    // Refresh cards array after reordering
    cards = Array.from(toolGrid.querySelectorAll('.tool-card'));
  }

  // Make cards draggable
  cards.forEach(card => {
    card.draggable = true;
    card.setAttribute('draggable', 'true');
    
    // Add drag handle visual indicator
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
      e.dataTransfer.setData('text/plain', card.href);
      card.classList.add('dragging');
    });

    // Drag end
    on(card, 'dragend', (e) => {
      card.classList.remove('dragging');
      // Remove any leftover drag-over classes
      const allCards = toolGrid.querySelectorAll('.tool-card');
      allCards.forEach(c => c.classList.remove('drag-over'));
    });

    // Drag over
    on(card, 'dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      const dragging = toolGrid.querySelector('.dragging');
      if (!dragging || dragging === card) return;

      const afterElement = getDragAfterElement(toolGrid, e.clientY);
      
      if (afterElement == null) {
        toolGrid.appendChild(dragging);
      } else {
        toolGrid.insertBefore(dragging, afterElement);
      }
    });

    // Drag leave
    on(card, 'dragleave', (e) => {
      // Only remove if we're actually leaving the card
      if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over');
      }
    });

    // Drop
    on(card, 'drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      
      // Save new order
      const newOrder = Array.from(toolGrid.querySelectorAll('.tool-card')).map(c => c.href);
      saveOrder(newOrder);
    });
  });
}
