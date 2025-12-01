// Unit Converter Tool
// Comprehensive unit conversion across all measurement categories

console.log('🚀 unit-converter.js script loading...');

import { toast, on, qs } from '/js/ui.js';

// DOM elements
const categorySelect = qs('#category-select');
const unitSearch = qs('#unit-search');
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

// Initialize
(async () => {
  console.log('Unit converter initializing...');
  
  // Load unit definitions
  try {
    const { UNIT_DEFINITIONS, CATEGORIES } = await import('/js/utils/unit-definitions.js');
    unitDefinitions = UNIT_DEFINITIONS;
    categories = CATEGORIES;
    
    console.log(`Loaded ${Object.keys(unitDefinitions).length} unit definitions`);
    console.log(`Loaded ${categories.length} categories`);
    
    // Populate category select
    populateCategories();
    
    // Populate unit selects
    populateUnitSelects();
    
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

function populateUnitSelects(filter = '') {
  const units = getFilteredUnits(filter);
  
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
  }
}

function getFilteredUnits(searchFilter = '') {
  const categoryFilter = categorySelect?.value || '';
  const searchLower = searchFilter.toLowerCase();
  
  return Object.values(unitDefinitions).filter(unit => {
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
}

function setupEventListeners() {
  // Category change
  if (categorySelect) {
    on(categorySelect, 'change', () => {
      populateUnitSelects(unitSearch?.value || '');
      performConversion();
    });
  }
  
  // Unit search
  if (unitSearch) {
    on(unitSearch, 'input', (e) => {
      populateUnitSelects(e.target.value);
      performConversion();
    });
  }
  
  // From value change
  if (fromValue) {
    on(fromValue, 'input', () => {
      performConversion();
    });
  }
  
  // From unit change
  if (fromUnit) {
    on(fromUnit, 'change', () => {
      updateUnitInfo('from');
      performConversion();
    });
  }
  
  // To unit change
  if (toUnit) {
    on(toUnit, 'change', () => {
      updateUnitInfo('to');
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
      if (fromUnit) fromUnit.value = toUnitVal || '';
      if (toUnit) toUnit.value = fromUnitVal || '';
      
      updateUnitInfo('from');
      updateUnitInfo('to');
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

