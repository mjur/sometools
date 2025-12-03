// Searchable Select Component
// Creates a searchable dropdown that replaces a regular select element

export function createSearchableSelect(selectElement, options = {}) {
  if (!selectElement) return null;
  
  // Check if already initialized
  if (selectElement.dataset.searchableSelect === 'true') {
    console.warn('Searchable select already initialized for this element');
    return null;
  }
  
  selectElement.dataset.searchableSelect = 'true';
  
  const {
    placeholder = 'Search...',
    noResultsText = 'No results found',
    onSelect = null
  } = options;
  
  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'searchable-select-wrapper';
  wrapper.style.cssText = `
    position: relative;
    width: 100%;
    display: inline-block;
  `;
  
  // Create button/display
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'searchable-select-button';
  button.style.cssText = `
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    text-align: left;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--text);
  `;
  
  const buttonText = document.createElement('span');
  buttonText.textContent = selectElement.options[0]?.textContent || 'Select unit...';
  buttonText.style.flex = '1';
  
  const buttonIcon = document.createElement('span');
  buttonIcon.textContent = '▼';
  buttonIcon.style.fontSize = '0.75rem';
  buttonIcon.style.marginLeft = '0.5rem';
  
  button.appendChild(buttonText);
  button.appendChild(buttonIcon);
  
  // Create dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'searchable-select-dropdown';
  
  // Function to position dropdown relative to input field (which is above the select)
  function positionDropdown() {
    // Find the input field that's in the same container
    const wrapper = button.closest('[style*="flex-direction: column"]') || button.parentElement;
    const inputField = wrapper ? wrapper.querySelector('input[type="number"]') : null;
    
    // Use input field if found, otherwise use button
    const referenceElement = inputField || button;
    const rect = referenceElement.getBoundingClientRect();
    
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.style.width = `${rect.width}px`;
  }
  
  // Set initial styles - using fixed positioning to avoid overflow issues
  dropdown.style.cssText = `
    position: fixed;
    background-color: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    max-height: 300px;
    overflow: hidden;
    display: none;
    min-width: 250px;
    box-sizing: border-box;
  `;
  
  // Create search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = placeholder;
  searchInput.className = 'searchable-select-search';
  searchInput.style.cssText = `
    width: 100%;
    padding: 0.5rem;
    font-size: 0.875rem;
    border: none;
    border-bottom: 1px solid var(--border);
    background-color: var(--bg);
    color: var(--text);
    box-sizing: border-box;
  `;
  
  // Create options container
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'searchable-select-options';
  optionsContainer.style.cssText = `
    max-height: 250px;
    overflow-y: auto;
  `;
  
  dropdown.appendChild(searchInput);
  dropdown.appendChild(optionsContainer);
  
  wrapper.appendChild(button);
  // Append dropdown to body instead of wrapper to avoid overflow issues
  document.body.appendChild(dropdown);
  
  // Replace select with wrapper
  selectElement.style.display = 'none';
  
  // Get the parent and insert wrapper
  const parent = selectElement.parentNode;
  if (parent) {
    parent.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);
    
    // Ensure wrapper has proper positioning
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
  } else {
    console.error('Select element has no parent node');
    return null;
  }
  
  let isOpen = false;
  let filteredOptions = [];
  
  // Populate options
  function populateOptions() {
    optionsContainer.innerHTML = '';
    filteredOptions = [];
    
    // Get all options including placeholder
    const allOptions = Array.from(selectElement.options);
    
    console.log(`populateOptions: Found ${allOptions.length} options in select element`);
    
    if (allOptions.length === 0 || (allOptions.length === 1 && allOptions[0].value === '')) {
      // No options available yet
      console.log('No options available, skipping population');
      return;
    }
    
    allOptions.forEach((option, index) => {
      // Skip placeholder in dropdown (but keep it in select)
      if (option.value === '') {
        return;
      }
      
      // Create option div
      const optionDiv = document.createElement('div');
      optionDiv.className = 'searchable-select-option';
      optionDiv.dataset.value = option.value;
      optionDiv.dataset.index = index;
      optionDiv.textContent = option.textContent;
      optionDiv.style.cssText = `
        padding: 0.5rem;
        cursor: pointer;
        color: var(--text);
        border-bottom: 1px solid var(--border);
        display: block;
      `;
      
      optionDiv.addEventListener('mouseenter', () => {
        optionDiv.style.backgroundColor = 'var(--bg-elev)';
      });
      
      optionDiv.addEventListener('mouseleave', () => {
        optionDiv.style.backgroundColor = 'transparent';
      });
      
      optionDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        selectOption(option.value, option.textContent);
      });
      
      optionsContainer.appendChild(optionDiv);
      filteredOptions.push({ element: optionDiv, option });
    });
    
    console.log(`populateOptions: Created ${filteredOptions.length} option divs`);
  }
  
  // Filter options
  function filterOptions(query) {
    const queryLower = query.toLowerCase();
    let hasVisible = false;
    
    filteredOptions.forEach(({ element, option }) => {
      // Always hide placeholder when searching
      if (option.value === '') {
        element.style.display = query ? 'none' : 'block';
        return;
      }
      
      const text = option.textContent.toLowerCase();
      const matches = text.includes(queryLower);
      element.style.display = matches ? 'block' : 'none';
      if (matches) hasVisible = true;
    });
    
    // Show no results message
    let noResults = optionsContainer.querySelector('.no-results');
    
    if (!hasVisible && query) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.textContent = noResultsText;
        noResults.style.cssText = `
          padding: 1rem;
          text-align: center;
          color: var(--text-subtle);
        `;
        optionsContainer.appendChild(noResults);
      }
    } else if (noResults) {
      noResults.remove();
    }
  }
  
  // Select option
  function selectOption(value, text) {
    selectElement.value = value;
    buttonText.textContent = text || 'Select unit...';
    
    // Update selected state
    filteredOptions.forEach(({ element, option }) => {
      if (option.value === value) {
        element.style.backgroundColor = 'var(--bg-elev)';
        element.style.fontWeight = 'bold';
      } else {
        element.style.backgroundColor = 'transparent';
        element.style.fontWeight = 'normal';
      }
    });
    
    closeDropdown();
    
    // Trigger change event
    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    
    if (onSelect) {
      onSelect(value, text);
    }
  }
  
  // Open dropdown
  function openDropdown() {
    console.log('openDropdown called, filteredOptions.length:', filteredOptions.length);
    // Make sure options are populated
    if (filteredOptions.length === 0) {
      populateOptions();
    }
    
    // Ensure dropdown is in the DOM
    if (!document.body.contains(dropdown)) {
      document.body.appendChild(dropdown);
    }
    
    // Position dropdown before showing
    positionDropdown();
    
    isOpen = true;
    button.setAttribute('aria-expanded', 'true');
    
    // Show dropdown - use !important to override any conflicting styles
    dropdown.style.setProperty('display', 'block', 'important');
    dropdown.style.setProperty('visibility', 'visible', 'important');
    dropdown.style.setProperty('opacity', '1', 'important');
    
    // Double-check positioning after showing
    setTimeout(() => {
      positionDropdown();
    }, 0);
    
    searchInput.value = '';
    searchInput.focus();
    filterOptions('');
    
    // Reposition on scroll/resize
    const reposition = () => {
      if (isOpen) {
        positionDropdown();
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    
    // Store cleanup function
    dropdown._cleanup = () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
    
    console.log('Dropdown opened, display:', dropdown.style.display, 'in DOM:', document.body.contains(dropdown), 'top:', dropdown.style.top, 'left:', dropdown.style.left, 'optionsContainer children:', optionsContainer.children.length, 'filteredOptions:', filteredOptions.length);
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick, true);
    }, 0);
  }
  
  // Close dropdown
  function closeDropdown() {
    isOpen = false;
    button.setAttribute('aria-expanded', 'false');
    dropdown.style.display = 'none';
    dropdown.style.visibility = 'hidden';
    document.removeEventListener('click', closeOnOutsideClick, true);
    
    // Cleanup event listeners
    if (dropdown._cleanup) {
      dropdown._cleanup();
      dropdown._cleanup = null;
    }
    
    console.log('Dropdown closed');
  }
  
  // Close on outside click
  function closeOnOutsideClick(e) {
    if (!wrapper.contains(e.target)) {
      closeDropdown();
    }
  }
  
  // Toggle dropdown
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('Button clicked, isOpen:', isOpen, 'options count:', filteredOptions.length);
    if (isOpen) {
      closeDropdown();
    } else {
      // Make sure options are populated before opening
      if (filteredOptions.length === 0) {
        populateOptions();
      }
      openDropdown();
    }
  });
  
  // Search input
  searchInput.addEventListener('input', (e) => {
    filterOptions(e.target.value);
  });
  
  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'Enter') {
      const firstVisible = Array.from(optionsContainer.children).find(
        el => el.style.display !== 'none' && el.dataset.value
      );
      if (firstVisible) {
        const option = selectElement.options[firstVisible.dataset.index];
        selectOption(option.value, option.textContent);
      }
    }
  });
  
  // Initial population - wait a bit to ensure options are loaded
  const doInitialPopulate = () => {
    populateOptions();
    // Update button text
    if (selectElement.value) {
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      if (selectedOption) {
        buttonText.textContent = selectedOption.textContent;
      }
    } else {
      const firstOption = selectElement.options[0];
      buttonText.textContent = firstOption ? firstOption.textContent : 'Select unit...';
    }
  };
  
  // Try immediately
  doInitialPopulate();
  
  // Also try after a short delay in case options are added asynchronously
  setTimeout(doInitialPopulate, 100);
  setTimeout(doInitialPopulate, 500);
  
  // Watch for changes to select element
  const observer = new MutationObserver(() => {
    console.log('MutationObserver: select element changed, repopulating options');
    populateOptions();
    // Update button text if value is selected
    if (selectElement.value) {
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      if (selectedOption) {
        buttonText.textContent = selectedOption.textContent;
      }
    } else {
      const firstOption = selectElement.options[0];
      buttonText.textContent = firstOption ? firstOption.textContent : 'Select unit...';
    }
  });
  
  observer.observe(selectElement, { childList: true, attributes: true, subtree: true });
  
  // Public API
  return {
    updateOptions: () => {
      populateOptions();
      // Update button text
      if (selectElement.value) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        if (selectedOption) {
          buttonText.textContent = selectedOption.textContent;
        }
      } else {
        const firstOption = selectElement.options[0];
        buttonText.textContent = firstOption ? firstOption.textContent : 'Select unit...';
      }
    },
    setValue: (value) => {
      const option = Array.from(selectElement.options).find(opt => opt.value === value);
      if (option) {
        selectOption(value, option.textContent);
      }
    },
    getValue: () => selectElement.value,
    destroy: () => {
      observer.disconnect();
      if (dropdown._cleanup) {
        dropdown._cleanup();
      }
      dropdown.remove();
      wrapper.remove();
      selectElement.style.display = '';
    }
  };
}

