// Unit Converter Tool
// Comprehensive unit conversion across all measurement categories

console.log('🚀 unit-converter.js script loading...');

import { toast, on, qs } from '/js/ui.js';
import { createSearchableSelect } from '/js/utils/searchable-select.js';

// DOM elements
const categorySelect = qs('#category-select');
const precisionSelect = qs('#precision');
const fromValue = qs('#from-value');
const fromUnit = qs('#from-unit');
const toValue = qs('#to-value');
const toUnit = qs('#to-unit');
const swapBtn = qs('#swap-units');
const fromUnitInfo = qs('#from-unit-info');
const toUnitInfo = qs('#to-unit-info');
const conversionInfo = qs('#conversion-info');
const formulaText = qs('#formula-text');

// Unit definitions will be loaded from a separate module
let unitDefinitions = {};
let categories = [];
let fromUnitSelect = null;
let toUnitSelect = null;

// Get category from URL
function getCategoryFromURL() {
  const path = window.location.pathname;
  const match = path.match(/\/convert\/units\/([^\/]+)/);
  const category = match ? match[1] : null;
  console.log(`getCategoryFromURL: path=${path}, category=${category}`);
  return category;
}

// Get units from URL (format: /convert/units/category/fromUnit-to-toUnit)
function getUnitsFromURL() {
  const path = window.location.pathname;
  // Match pattern: /convert/units/{category}/{fromUnit}-to-{toUnit}
  // Handle trailing slashes by removing them first
  const cleanPath = path.replace(/\/$/, '');
  const match = cleanPath.match(/\/convert\/units\/[^\/]+\/([^-]+)-to-(.+)$/);
  if (match) {
    let fromUnit = decodeURIComponent(match[1]);
    let toUnit = decodeURIComponent(match[2]);
    
    // Remove any trailing slashes that might have been captured
    fromUnit = fromUnit.replace(/\/$/, '');
    toUnit = toUnit.replace(/\/$/, '');
    
    console.log(`Parsed units from URL: from=${fromUnit}, to=${toUnit}`);
    return {
      from: fromUnit,
      to: toUnit
    };
  }
  return null;
}

// Update URL with selected units
function updateURLWithUnits(fromUnitId, toUnitId) {
  if (!fromUnitId || !toUnitId) return;
  
  const currentCategory = getCategoryFromURL();
  if (!currentCategory) return;
  
  const basePath = `/convert/units/${currentCategory}`;
  const newPath = `${basePath}/${encodeURIComponent(fromUnitId)}-to-${encodeURIComponent(toUnitId)}`;
  
  // Update URL without page reload
  if (window.history && window.history.pushState) {
    window.history.pushState({}, '', newPath);
  }
}

// Initialize
(async () => {
  console.log('Unit converter initializing...');
  
  const currentCategory = getCategoryFromURL();
  
  // Load unit definitions
  try {
    const { UNIT_DEFINITIONS, CATEGORIES } = await import('/js/utils/unit-definitions.js');
    unitDefinitions = UNIT_DEFINITIONS;
    categories = CATEGORIES;
    
    console.log(`Loaded ${Object.keys(unitDefinitions).length} unit definitions`);
    console.log(`Loaded ${categories.length} categories`);
    
    // If we're on a category page, update the page title and description
    if (currentCategory) {
      const category = categories.find(c => c.id === currentCategory);
      if (category) {
        const titleEl = document.getElementById('category-title');
        const descEl = document.getElementById('category-description');
        const breadcrumbEl = document.getElementById('category-breadcrumb');
        const pageTitleEl = document.getElementById('page-title');
        
        if (titleEl) titleEl.textContent = category.name;
        if (descEl) descEl.textContent = `Convert between units in the ${category.name} category.`;
        if (breadcrumbEl) breadcrumbEl.textContent = category.name;
        if (pageTitleEl) pageTitleEl.textContent = `${category.name} Converter | BunchOfTools`;
        
        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.content = `Convert between units in the ${category.name} category.`;
      }
    } else {
      // On main page, populate category select (if it exists)
      populateCategories();
    }
    
    // Populate unit selects (filtered by category if on category page)
    populateUnitSelects('', currentCategory);
    
    // Check URL for preloaded units
    const urlUnits = getUnitsFromURL();
    
    // Also check sessionStorage for preloaded units (from unit-specific pages)
    const preloadFrom = sessionStorage.getItem('preloadFromUnit');
    const preloadTo = sessionStorage.getItem('preloadToUnit');
    
    let unitsToLoad = null;
    if (urlUnits && urlUnits.from && urlUnits.to) {
      unitsToLoad = urlUnits;
      console.log(`Found units in URL: from=${urlUnits.from}, to=${urlUnits.to}`);
    } else if (preloadFrom && preloadTo) {
      unitsToLoad = { from: preloadFrom, to: preloadTo };
      console.log(`Found units in sessionStorage: from=${preloadFrom}, to=${preloadTo}`);
      // Clear sessionStorage after reading
      sessionStorage.removeItem('preloadFromUnit');
      sessionStorage.removeItem('preloadToUnit');
    }
    
    if (unitsToLoad) {
      // Function to set units with retry logic
      const setUnitsWithRetry = (retryCount = 0) => {
        if (retryCount > 10) {
          console.warn('Failed to set units after 10 retries');
          return;
        }
        
        if (!fromUnit || !toUnit) {
          setTimeout(() => setUnitsWithRetry(retryCount + 1), 100);
          return;
        }
        
        // Check if options are populated
        if (fromUnit.options.length <= 1 || toUnit.options.length <= 1) {
          setTimeout(() => setUnitsWithRetry(retryCount + 1), 100);
          return;
        }
        
        let fromSet = false;
        let toSet = false;
        
        // Set from unit
        const fromOption = Array.from(fromUnit.options).find(opt => opt.value === unitsToLoad.from);
        if (fromOption) {
          fromUnit.value = unitsToLoad.from;
          if (fromUnitSelect) {
            fromUnitSelect.setValue(unitsToLoad.from);
          } else {
            // If searchable select not ready, try again later
            setTimeout(() => {
              if (fromUnitSelect) {
                fromUnitSelect.setValue(unitsToLoad.from);
              }
            }, 200);
          }
          updateUnitInfo('from');
          fromSet = true;
          console.log(`Set from unit: ${unitsToLoad.from}`);
        } else {
          console.warn(`From unit not found: ${unitsToLoad.from}, available options:`, Array.from(fromUnit.options).map(o => o.value));
        }
        
        // Set to unit
        const toOption = Array.from(toUnit.options).find(opt => opt.value === unitsToLoad.to);
        if (toOption) {
          toUnit.value = unitsToLoad.to;
          if (toUnitSelect) {
            toUnitSelect.setValue(unitsToLoad.to);
          } else {
            // If searchable select not ready, try again later
            setTimeout(() => {
              if (toUnitSelect) {
                toUnitSelect.setValue(unitsToLoad.to);
              }
            }, 200);
          }
          updateUnitInfo('to');
          toSet = true;
          console.log(`Set to unit: ${unitsToLoad.to}`);
        } else {
          console.warn(`To unit not found: ${unitsToLoad.to}, available options:`, Array.from(toUnit.options).map(o => o.value));
        }
        
        // If units weren't set, retry
        if (!fromSet || !toSet) {
          setTimeout(() => setUnitsWithRetry(retryCount + 1), 100);
          return;
        }
        
        // Perform conversion if from value is set
        if (fromValue && fromValue.value) {
          performConversion();
        }
      };
      
      // Start trying to set units
      setUnitsWithRetry();
    }
    
    // Initialize searchable selects after options are populated
    // Use multiple attempts to ensure options are loaded
    const initSearchableSelects = () => {
      if (fromUnit && fromUnit.options.length > 1 && !fromUnitSelect) {
        console.log(`Initializing from-unit searchable select with ${fromUnit.options.length} options`);
        fromUnitSelect = createSearchableSelect(fromUnit, {
          placeholder: 'Search units...',
          onSelect: () => {
            updateUnitInfo('from');
            if (fromUnit.value && toUnit.value) {
              updateURLWithUnits(fromUnit.value, toUnit.value);
            }
            performConversion();
          }
        });
        
        // If there's a preloaded value, set it now
        const preloadFrom = sessionStorage.getItem('preloadFromUnit');
        if (preloadFrom && fromUnit.value === preloadFrom) {
          fromUnitSelect.setValue(preloadFrom);
        }
      }
      
      if (toUnit && toUnit.options.length > 1 && !toUnitSelect) {
        console.log(`Initializing to-unit searchable select with ${toUnit.options.length} options`);
        toUnitSelect = createSearchableSelect(toUnit, {
          placeholder: 'Search units...',
          onSelect: () => {
            updateUnitInfo('to');
            if (fromUnit.value && toUnit.value) {
              updateURLWithUnits(fromUnit.value, toUnit.value);
            }
            performConversion();
          }
        });
        
        // If there's a preloaded value, set it now
        const preloadTo = sessionStorage.getItem('preloadToUnit');
        if (preloadTo && toUnit.value === preloadTo) {
          toUnitSelect.setValue(preloadTo);
        }
      }
    };
    
    // Try immediately
    requestAnimationFrame(() => {
      initSearchableSelects();
      // Try again after a short delay if still not initialized
      if ((fromUnit && !fromUnitSelect) || (toUnit && !toUnitSelect)) {
        setTimeout(() => {
          initSearchableSelects();
        }, 200);
      }
    });
    
    // Set up event listeners
    setupEventListeners();
    
  } catch (error) {
    console.error('Failed to load unit definitions:', error);
    toast('Failed to load unit definitions. Please refresh the page.', 'error');
  }
})();

function populateCategories() {
  if (!categorySelect) return;
  
  categorySelect.innerHTML = '<option value="">All Categories</option>';
  
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    categorySelect.appendChild(option);
  });
}

function populateUnitSelects(filter = '', categoryId = null) {
  const units = getFilteredUnits(filter, categoryId);
  
  console.log(`populateUnitSelects: categoryId=${categoryId}, filter="${filter}", found ${units.length} units`);
  
  // Populate from unit select
  if (fromUnit) {
    const currentFromValue = fromUnit.value;
    fromUnit.innerHTML = '<option value="">Select unit...</option>';
    
    units.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.id;
      option.textContent = `${unit.name} (${unit.symbol})`;
      option.dataset.unit = JSON.stringify(unit);
      if (option.value === currentFromValue) {
        option.selected = true;
      }
      fromUnit.appendChild(option);
    });
    
    console.log(`Populated from-unit with ${fromUnit.options.length} options`);
    
    // Update searchable select if it exists
    if (fromUnitSelect) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        fromUnitSelect.updateOptions();
        if (currentFromValue) {
          fromUnitSelect.setValue(currentFromValue);
        }
      }, 0);
    } else if (fromUnit.options.length > 1) {
      // Initialize if not already initialized and we have options
      setTimeout(() => {
        if (!fromUnitSelect && fromUnit.options.length > 1) {
          console.log('Initializing from-unit searchable select');
          fromUnitSelect = createSearchableSelect(fromUnit, {
            placeholder: 'Search units...',
            onSelect: () => {
              updateUnitInfo('from');
              if (fromUnit.value && toUnit.value) {
                updateURLWithUnits(fromUnit.value, toUnit.value);
              }
              performConversion();
            }
          });
        }
      }, 100);
    }
  }
  
  // Populate to unit select
  if (toUnit) {
    const currentToValue = toUnit.value;
    toUnit.innerHTML = '<option value="">Select unit...</option>';
    
    units.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.id;
      option.textContent = `${unit.name} (${unit.symbol})`;
      option.dataset.unit = JSON.stringify(unit);
      if (option.value === currentToValue) {
        option.selected = true;
      }
      toUnit.appendChild(option);
    });
    
    console.log(`Populated to-unit with ${toUnit.options.length} options`);
    
    // Update searchable select if it exists
    if (toUnitSelect) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        toUnitSelect.updateOptions();
        if (currentToValue) {
          toUnitSelect.setValue(currentToValue);
        }
      }, 0);
    } else if (toUnit.options.length > 1) {
      // Initialize if not already initialized and we have options
      setTimeout(() => {
        if (!toUnitSelect && toUnit.options.length > 1) {
          console.log('Initializing to-unit searchable select');
          toUnitSelect = createSearchableSelect(toUnit, {
            placeholder: 'Search units...',
            onSelect: () => {
              updateUnitInfo('to');
              if (fromUnit.value && toUnit.value) {
                updateURLWithUnits(fromUnit.value, toUnit.value);
              }
              performConversion();
            }
          });
        }
      }, 100);
    }
  }
}

function getFilteredUnits(searchFilter = '', categoryId = null) {
  // Use provided categoryId or get from select
  const categoryFilter = categoryId || categorySelect?.value || '';
  const searchLower = searchFilter.toLowerCase();
  
  console.log(`getFilteredUnits: categoryFilter="${categoryFilter}", searchFilter="${searchFilter}", totalUnits=${Object.keys(unitDefinitions).length}`);
  
  const filtered = Object.values(unitDefinitions).filter(unit => {
    // Category filter
    if (categoryFilter && unit.category !== categoryFilter) {
      return false;
    }
    
    // Search filter
    if (searchLower) {
      const matchesName = unit.name.toLowerCase().includes(searchLower);
      const matchesSymbol = unit.symbol.toLowerCase().includes(searchLower);
      const matchesPlural = (unit.plural || '').toLowerCase().includes(searchLower);
      const matchesCategory = (unit.categoryName || '').toLowerCase().includes(searchLower);
      
      if (!matchesName && !matchesSymbol && !matchesPlural && !matchesCategory) {
        return false;
      }
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by category, then by name
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });
  
  console.log(`getFilteredUnits: returning ${filtered.length} units`);
  if (filtered.length > 0) {
    console.log(`First few units:`, filtered.slice(0, 3).map(u => `${u.name} (${u.category})`));
  }
  
  return filtered;
}

function setupEventListeners() {
  // Category change (only if category select exists)
  if (categorySelect) {
    on(categorySelect, 'change', () => {
      const currentCategory = getCategoryFromURL();
      populateUnitSelects('', currentCategory);
      performConversion();
    });
  }
  
  // From value change
  if (fromValue) {
    on(fromValue, 'input', () => {
      performConversion();
    });
  }
  
  // From unit change (handled by searchable select, but keep for compatibility)
  if (fromUnit) {
    on(fromUnit, 'change', () => {
      updateUnitInfo('from');
      if (fromUnit.value && toUnit.value) {
        updateURLWithUnits(fromUnit.value, toUnit.value);
      }
      performConversion();
    });
  }
  
  // To unit change (handled by searchable select, but keep for compatibility)
  if (toUnit) {
    on(toUnit, 'change', () => {
      updateUnitInfo('to');
      if (fromUnit.value && toUnit.value) {
        updateURLWithUnits(fromUnit.value, toUnit.value);
      }
      performConversion();
    });
  }
  
  // Swap units
  if (swapBtn) {
    on(swapBtn, 'click', () => {
      const fromVal = fromValue?.value;
      const fromUnitVal = fromUnit?.value;
      const toVal = toValue?.value;
      const toUnitVal = toUnit?.value;
      
      if (fromValue) fromValue.value = toVal || '';
      if (toValue) toValue.value = fromVal || '';
      
      // Swap using searchable selects
      if (fromUnitVal && toUnitSelect) {
        toUnitSelect.setValue(fromUnitVal);
      }
      if (toUnitVal && fromUnitSelect) {
        fromUnitSelect.setValue(toUnitVal);
      }
      
      // Fallback to direct select if searchable selects not available
      if (fromUnit) fromUnit.value = toUnitVal || '';
      if (toUnit) toUnit.value = fromUnitVal || '';
      
      updateUnitInfo('from');
      updateUnitInfo('to');
      if (fromUnit.value && toUnit.value) {
        updateURLWithUnits(fromUnit.value, toUnit.value);
      }
      performConversion();
    });
  }
  
  // Precision change
  if (precisionSelect) {
    on(precisionSelect, 'change', () => {
      performConversion();
    });
  }
}

function updateUnitInfo(side) {
  const unitSelect = side === 'from' ? fromUnit : toUnit;
  const infoDiv = side === 'from' ? fromUnitInfo : toUnitInfo;
  
  if (!unitSelect || !infoDiv) return;
  
  const selectedOption = unitSelect.options[unitSelect.selectedIndex];
  if (!selectedOption || !selectedOption.value) {
    infoDiv.textContent = '';
    return;
  }
  
  try {
    const unit = JSON.parse(selectedOption.dataset.unit || '{}');
    const parts = [];
    
    if (unit.categoryName) {
      parts.push(unit.categoryName);
    }
    
    if (unit.system) {
      parts.push(unit.system);
    }
    
    if (unit.notes) {
      parts.push(unit.notes);
    }
    
    infoDiv.textContent = parts.length > 0 ? parts.join(' • ') : '';
  } catch (e) {
    infoDiv.textContent = '';
  }
}

function performConversion() {
  if (!fromValue || !toValue || !fromUnit || !toUnit) return;
  
  const fromValueNum = parseFloat(fromValue.value);
  const fromUnitId = fromUnit.value;
  const toUnitId = toUnit.value;
  
  // Clear result if inputs are invalid
  if (isNaN(fromValueNum) || !fromUnitId || !toUnitId) {
    toValue.value = '';
    conversionInfo.style.display = 'none';
    return;
  }
  
  // Get unit definitions
  const fromUnitDef = unitDefinitions[fromUnitId];
  const toUnitDef = unitDefinitions[toUnitId];
  
  if (!fromUnitDef || !toUnitDef) {
    toValue.value = '';
    conversionInfo.style.display = 'none';
    return;
  }
  
  // Check if units are compatible (same base dimension)
  if (fromUnitDef.baseDimension !== toUnitDef.baseDimension) {
    toast('Cannot convert between incompatible units', 'error');
    toValue.value = '';
    conversionInfo.style.display = 'none';
    return;
  }
  
  // Perform conversion
  let result;
  
  // Handle temperature conversions (have offsets)
  if (fromUnitDef.hasOffset || toUnitDef.hasOffset) {
    // Convert to base (usually Kelvin for temperature)
    // For temperature: value_in_base = (value + offset) * multiplier
    // But we need to handle the case where multiplier is not 1
    // Actually, for temperature, the formula is more complex:
    // For Celsius: K = C + 273.15 (multiplier is 1, offset is 273.15)
    // For Fahrenheit: K = (F + 459.67) * 5/9 (multiplier is 5/9, offset is 459.67)
    // For Rankine: K = R * 5/9 (multiplier is 5/9, offset is 0)
    
    // Convert from source to base (Kelvin)
    const sourceOffset = fromUnitDef.offset || 0;
    const sourceMultiplier = fromUnitDef.multiplier || 1;
    let baseValue;
    
    if (sourceOffset !== 0) {
      // Has offset: base = (value + offset) * multiplier
      baseValue = (fromValueNum + sourceOffset) * sourceMultiplier;
    } else {
      // No offset: base = value * multiplier
      baseValue = fromValueNum * sourceMultiplier;
    }
    
    // Convert from base to target
    const targetOffset = toUnitDef.offset || 0;
    const targetMultiplier = toUnitDef.multiplier || 1;
    
    if (targetOffset !== 0) {
      // Has offset: value = (base / multiplier) - offset
      result = (baseValue / targetMultiplier) - targetOffset;
    } else {
      // No offset: value = base / multiplier
      result = baseValue / targetMultiplier;
    }
  } else {
    // Standard linear conversion
    const baseValue = fromValueNum * (fromUnitDef.multiplier || 1);
    result = baseValue / (toUnitDef.multiplier || 1);
  }
  
  // Format result based on precision
  const precision = precisionSelect?.value || 'auto';
  if (precision === 'auto') {
    // Auto precision: use reasonable number of decimals
    const absResult = Math.abs(result);
    if (absResult === 0) {
      result = 0;
    } else if (absResult >= 1000) {
      result = Math.round(result * 100) / 100;
    } else if (absResult >= 1) {
      result = Math.round(result * 10000) / 10000;
    } else {
      // For very small numbers, show more precision
      result = parseFloat(result.toPrecision(10));
    }
  } else {
    const decimals = parseInt(precision);
    result = Math.round(result * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
  
  toValue.value = result;
  
  // Update conversion formula
  updateConversionFormula(fromValueNum, fromUnitDef, result, toUnitDef);
}

function updateConversionFormula(fromVal, fromUnit, toVal, toUnit) {
  if (!conversionInfo || !formulaText) return;
  
  let formula = '';
  
  if (fromUnit.hasOffset || toUnit.hasOffset) {
    // Temperature or other offset-based conversion
    // Show simplified formula
    const ratio = (toUnit.multiplier || 1) / (fromUnit.multiplier || 1);
    if (fromUnit.offset !== undefined && toUnit.offset !== undefined && (fromUnit.offset !== 0 || toUnit.offset !== 0)) {
      // Complex formula with offsets
      if (fromUnit.category === 'temperature' && toUnit.category === 'temperature') {
        // Temperature-specific formulas
        if (fromUnit.id === 'fahrenheit' && toUnit.id === 'celsius') {
          formula = `°C = (°F - 32) × 5/9`;
        } else if (fromUnit.id === 'celsius' && toUnit.id === 'fahrenheit') {
          formula = `°F = (°C × 9/5) + 32`;
        } else {
          // Generic temperature formula
          formula = `Convert via Kelvin: K = (${fromUnit.symbol} ${fromUnit.offset >= 0 ? '+' : ''}${fromUnit.offset}) × ${fromUnit.multiplier}; ${toUnit.symbol} = (K / ${toUnit.multiplier}) ${toUnit.offset >= 0 ? '-' : '+'} ${Math.abs(toUnit.offset)}`;
        }
      } else {
        formula = `${toVal} ${toUnit.symbol} = (${fromVal} ${fromUnit.symbol} ${fromUnit.offset >= 0 ? '+' : ''}${fromUnit.offset}) × ${fromUnit.multiplier} / ${toUnit.multiplier} ${toUnit.offset >= 0 ? '-' : '+'} ${Math.abs(toUnit.offset)}`;
      }
    } else {
      formula = `${toVal} ${toUnit.symbol} = ${fromVal} ${fromUnit.symbol} × ${ratio}`;
    }
  } else {
    // Linear conversion
    const ratio = (toUnit.multiplier || 1) / (fromUnit.multiplier || 1);
    // Format ratio nicely
    let ratioStr = ratio.toString();
    if (ratioStr.length > 10) {
      ratioStr = ratio.toExponential(4);
    }
    formula = `${toVal} ${toUnit.symbol} = ${fromVal} ${fromUnit.symbol} × ${ratioStr}`;
  }
  
  formulaText.textContent = formula;
  conversionInfo.style.display = 'block';
}

