// BMI Calculator Tool
// Calculates BMI with basic and advanced measurements

let currentUnit = 'metric';
let currentMode = 'advanced';

// BMI Categories
const BMI_CATEGORIES = {
  underweight: { min: 0, max: 18.5, label: 'Underweight', color: '#4caf50', description: 'You may need to gain weight. Consult with a healthcare provider.' },
  normal: { min: 18.5, max: 25, label: 'Normal Weight', color: '#8bc34a', description: 'Maintain your current weight with a balanced diet and regular exercise.' },
  overweight: { min: 25, max: 30, label: 'Overweight', color: '#ff9800', description: 'Consider losing weight through diet and exercise. Consult with a healthcare provider.' },
  obese1: { min: 30, max: 35, label: 'Obese (Class I)', color: '#f44336', description: 'Weight loss is recommended. Consult with a healthcare provider for a personalized plan.' },
  obese2: { min: 35, max: 40, label: 'Obese (Class II)', color: '#d32f2f', description: 'Significant weight loss is recommended. Consult with a healthcare provider immediately.' },
  obese3: { min: 40, max: 100, label: 'Obese (Class III)', color: '#b71c1c', description: 'Immediate medical consultation is recommended for weight management.' }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateUnits();
});

// Setup event listeners
function setupEventListeners() {
  // Mode switching
  document.getElementById('basic-mode-btn').addEventListener('click', () => switchMode('basic'));
  document.getElementById('advanced-mode-btn').addEventListener('click', () => switchMode('advanced'));
  
  // Unit switching
  document.getElementById('metric-btn').addEventListener('click', () => switchUnit('metric'));
  document.getElementById('imperial-btn').addEventListener('click', () => switchUnit('imperial'));
  
  // Calculate button
  document.getElementById('calculate-btn').addEventListener('click', calculateBMI);
  
  // Auto-calculate on input change
  const inputs = ['weight-basic', 'height-basic', 'weight-advanced', 'height-advanced', 
                  'age', 'sex', 'waist', 'hip', 'neck'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) {
      input.addEventListener('input', () => {
        if (document.getElementById('results-section').style.display !== 'none') {
          calculateBMI();
        }
      });
    }
  });
}

// Switch between basic and advanced mode
function switchMode(mode) {
  currentMode = mode;
  
  // Update button states
  document.getElementById('basic-mode-btn').classList.toggle('active', mode === 'basic');
  document.getElementById('advanced-mode-btn').classList.toggle('active', mode === 'advanced');
  
  // Show/hide input sections
  document.getElementById('basic-inputs').classList.toggle('hidden', mode !== 'basic');
  document.getElementById('advanced-inputs').classList.toggle('hidden', mode !== 'advanced');
  
  // Clear results
  document.getElementById('results-section').style.display = 'none';
}

// Switch between metric and imperial units
function switchUnit(unit) {
  currentUnit = unit;
  
  // Update button states
  document.getElementById('metric-btn').classList.toggle('active', unit === 'metric');
  document.getElementById('imperial-btn').classList.toggle('active', unit === 'imperial');
  
  updateUnits();
  
  // Recalculate if results are shown
  if (document.getElementById('results-section').style.display !== 'none') {
    calculateBMI();
  }
}

// Update unit labels
function updateUnits() {
  if (currentUnit === 'metric') {
    // Update basic mode elements (if visible)
    const weightUnitBasic = document.getElementById('weight-unit-basic');
    const heightUnitBasic = document.getElementById('height-unit-basic');
    const weightBasic = document.getElementById('weight-basic');
    
    if (weightUnitBasic) weightUnitBasic.textContent = 'kg';
    if (heightUnitBasic) heightUnitBasic.textContent = 'cm';
    if (weightBasic) weightBasic.placeholder = '70';
    
    // Update advanced mode elements (if visible)
    const weightUnitAdvanced = document.getElementById('weight-unit-advanced');
    const heightUnitAdvanced = document.getElementById('height-unit-advanced');
    const weightAdvanced = document.getElementById('weight-advanced');
    const waistUnit = document.getElementById('waist-unit');
    const hipUnit = document.getElementById('hip-unit');
    const neckUnit = document.getElementById('neck-unit');
    const waist = document.getElementById('waist');
    const hip = document.getElementById('hip');
    const neck = document.getElementById('neck');
    
    if (weightUnitAdvanced) weightUnitAdvanced.textContent = 'kg';
    if (heightUnitAdvanced) heightUnitAdvanced.textContent = 'cm';
    if (weightAdvanced) weightAdvanced.placeholder = '70';
    if (waistUnit) waistUnit.textContent = 'cm';
    if (hipUnit) hipUnit.textContent = 'cm';
    if (neckUnit) neckUnit.textContent = 'cm';
    if (waist) waist.placeholder = '80';
    if (hip) hip.placeholder = '95';
    if (neck) neck.placeholder = '38';
    
    // Update height input for metric (restore single input field)
    // Only update if the corresponding mode is active
    if (currentMode === 'basic') {
      updateHeightInput('height-basic');
    } else {
      updateHeightInput('height-advanced');
    }
  } else {
    // Update basic mode elements (if visible)
    const weightUnitBasic = document.getElementById('weight-unit-basic');
    const heightUnitBasic = document.getElementById('height-unit-basic');
    const weightBasic = document.getElementById('weight-basic');
    
    if (weightUnitBasic) weightUnitBasic.textContent = 'lbs';
    if (heightUnitBasic) heightUnitBasic.textContent = 'ft/in';
    if (weightBasic) weightBasic.placeholder = '154';
    
    // Update advanced mode elements (if visible)
    const weightUnitAdvanced = document.getElementById('weight-unit-advanced');
    const heightUnitAdvanced = document.getElementById('height-unit-advanced');
    const weightAdvanced = document.getElementById('weight-advanced');
    const waistUnit = document.getElementById('waist-unit');
    const hipUnit = document.getElementById('hip-unit');
    const neckUnit = document.getElementById('neck-unit');
    const waist = document.getElementById('waist');
    const hip = document.getElementById('hip');
    const neck = document.getElementById('neck');
    
    if (weightUnitAdvanced) weightUnitAdvanced.textContent = 'lbs';
    if (heightUnitAdvanced) heightUnitAdvanced.textContent = 'ft/in';
    if (weightAdvanced) weightAdvanced.placeholder = '154';
    if (waistUnit) waistUnit.textContent = 'in';
    if (hipUnit) hipUnit.textContent = 'in';
    if (neckUnit) neckUnit.textContent = 'in';
    if (waist) waist.placeholder = '32';
    if (hip) hip.placeholder = '37';
    if (neck) neck.placeholder = '15';
    
    // Update height input for imperial (feet and inches)
    // Only update if the corresponding mode is active
    if (currentMode === 'basic') {
      updateHeightInput('height-basic');
    } else {
      updateHeightInput('height-advanced');
    }
  }
}

// Update height input for imperial (feet and inches) or metric (cm)
function updateHeightInput(inputId) {
  // The container ID pattern: height-basic -> height-input-basic
  const containerId = inputId.replace('height-', 'height-input-');
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.warn(`Container not found: ${containerId} for inputId: ${inputId}`);
    return;
  }
  
  if (currentUnit === 'imperial') {
    // Save current values if they exist (from metric input or previous imperial)
    let savedFeet = '';
    let savedInches = '';
    
    const existingInput = document.getElementById(inputId);
    if (existingInput && existingInput.value) {
      // Convert from metric cm to feet/inches if we have a metric value
      const cmValue = parseFloat(existingInput.value);
      if (cmValue > 0) {
        const totalInches = cmValue / 2.54;
        savedFeet = Math.floor(totalInches / 12);
        savedInches = Math.round(totalInches % 12);
      }
    } else {
      // Get existing imperial values
      const feetInput = document.getElementById(`${inputId}-feet`);
      const inchesInput = document.getElementById(`${inputId}-inches`);
      savedFeet = feetInput && feetInput.value ? feetInput.value : '';
      savedInches = inchesInput && inchesInput.value ? inchesInput.value : '';
    }
    
    // Clear and rebuild the container
    container.innerHTML = '';
    container.innerHTML = `
      <input type="number" id="${inputId}-feet" min="0" max="8" step="1" placeholder="5" value="${savedFeet}" style="width: 30%;">
      <span style="line-height: 2.5rem; padding: 0 0.5rem;">ft</span>
      <input type="number" id="${inputId}-inches" min="0" max="11" step="1" placeholder="9" value="${savedInches}" style="width: 30%;">
      <span style="line-height: 2.5rem; padding: 0 0.5rem;">in</span>
    `;
    
    // Add event listeners
    setTimeout(() => {
      const feetEl = document.getElementById(`${inputId}-feet`);
      const inchesEl = document.getElementById(`${inputId}-inches`);
      if (feetEl) {
        feetEl.addEventListener('input', () => {
          if (document.getElementById('results-section').style.display !== 'none') {
            calculateBMI();
          }
        });
      }
      if (inchesEl) {
        inchesEl.addEventListener('input', () => {
          if (document.getElementById('results-section').style.display !== 'none') {
            calculateBMI();
          }
        });
      }
    }, 0);
  } else {
    // Metric mode - restore single input field
    let savedValue = '';
    
    // Convert from imperial feet/inches to cm if we have imperial values
    const feetInput = document.getElementById(`${inputId}-feet`);
    const inchesInput = document.getElementById(`${inputId}-inches`);
    if (feetInput && inchesInput) {
      const feet = parseFloat(feetInput.value) || 0;
      const inches = parseFloat(inchesInput.value) || 0;
      if (feet > 0 || inches > 0) {
        const totalInches = feet * 12 + inches;
        savedValue = Math.round(totalInches * 2.54);
      }
    } else {
      // Try to get value from existing metric input
      const existingInput = document.getElementById(inputId);
      if (existingInput) {
        savedValue = existingInput.value || '';
      }
    }
    
    // Clear and rebuild the container
    container.innerHTML = '';
    container.innerHTML = `
      <input type="number" id="${inputId}" min="0" step="0.1" placeholder="175" value="${savedValue}">
      <span id="${inputId.replace('height-', 'height-unit-')}" style="line-height: 2.5rem;">cm</span>
    `;
    
    // Add event listener
    setTimeout(() => {
      const inputEl = document.getElementById(inputId);
      if (inputEl) {
        inputEl.addEventListener('input', () => {
          if (document.getElementById('results-section').style.display !== 'none') {
            calculateBMI();
          }
        });
      }
    }, 0);
  }
}

// Get weight in kg
function getWeightInKg() {
  const weightId = currentMode === 'basic' ? 'weight-basic' : 'weight-advanced';
  const weight = parseFloat(document.getElementById(weightId).value) || 0;
  
  if (currentUnit === 'metric') {
    return weight;
  } else {
    return weight * 0.453592; // lbs to kg
  }
}

// Get height in meters
function getHeightInMeters() {
  const heightId = currentMode === 'basic' ? 'height-basic' : 'height-advanced';
  
  if (currentUnit === 'metric') {
    const height = parseFloat(document.getElementById(heightId).value) || 0;
    return height / 100; // cm to m
  } else {
    const feet = parseFloat(document.getElementById(`${heightId}-feet`).value) || 0;
    const inches = parseFloat(document.getElementById(`${heightId}-inches`).value) || 0;
    const totalInches = feet * 12 + inches;
    return totalInches * 0.0254; // inches to m
  }
}

// Get circumference in cm
function getCircumferenceInCm(inputId) {
  const value = parseFloat(document.getElementById(inputId).value) || 0;
  
  if (currentUnit === 'metric') {
    return value;
  } else {
    return value * 2.54; // inches to cm
  }
}

// Calculate BMI
function calculateBMI() {
  const weight = getWeightInKg();
  const height = getHeightInMeters();
  
  if (weight <= 0 || height <= 0) {
    alert('Please enter valid weight and height values.');
    return;
  }
  
  // Calculate BMI
  const bmi = weight / (height * height);
  
  // Determine category
  let category = null;
  for (const [key, cat] of Object.entries(BMI_CATEGORIES)) {
    if (bmi >= cat.min && bmi < cat.max) {
      category = cat;
      break;
    }
  }
  
  if (!category) {
    category = BMI_CATEGORIES.obese3;
  }
  
  // Display results
  displayResults(bmi, category);
  
  // Calculate advanced metrics if in advanced mode
  if (currentMode === 'advanced') {
    calculateAdvancedMetrics(weight, height, bmi);
  } else {
    displayBasicMetrics(bmi, category);
  }
  
  document.getElementById('results-section').style.display = 'block';
}

// Display basic results
function displayBasicMetrics(bmi, category) {
  const metricsGrid = document.getElementById('metrics-grid');
  metricsGrid.innerHTML = `
    <div class="metric-card">
      <div class="metric-label">BMI</div>
      <div class="metric-value">${bmi.toFixed(1)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Category</div>
      <div class="metric-value">${category.label}</div>
    </div>
  `;
}

// Calculate and display advanced metrics
function calculateAdvancedMetrics(weight, height, bmi) {
  const age = parseInt(document.getElementById('age').value) || 0;
  const sex = document.getElementById('sex').value;
  const waist = getCircumferenceInCm('waist');
  const hip = getCircumferenceInCm('hip');
  const neck = getCircumferenceInCm('neck');
  
  const metrics = [];
  
  // BMI
  metrics.push({
    label: 'BMI',
    value: bmi.toFixed(1),
    description: 'Body Mass Index'
  });
  
  // Body Fat Percentage (using US Navy method if measurements available)
  if (waist > 0 && neck > 0 && height > 0) {
    let bodyFat = 0;
    if (sex === 'male') {
      bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height * 100)) - 450;
    } else {
      // For females, we'd need hip measurement too, but using simplified formula
      if (hip > 0) {
        bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height * 100)) - 450;
      } else {
        bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height * 100)) - 450;
      }
    }
    
    if (bodyFat > 0 && bodyFat < 100) {
      metrics.push({
        label: 'Body Fat %',
        value: bodyFat.toFixed(1) + '%',
        description: getBodyFatCategory(bodyFat, sex)
      });
    }
  }
  
  // Waist-to-Hip Ratio
  if (waist > 0 && hip > 0) {
    const whr = waist / hip;
    metrics.push({
      label: 'Waist-to-Hip Ratio',
      value: whr.toFixed(2),
      description: getWHRCategory(whr, sex)
    });
  }
  
  // Waist-to-Height Ratio
  if (waist > 0 && height > 0) {
    const whtr = waist / (height * 100);
    metrics.push({
      label: 'Waist-to-Height Ratio',
      value: whtr.toFixed(2),
      description: getWHTRCategory(whtr)
    });
  }
  
  // Ideal Weight Range
  const idealWeightMin = 18.5 * height * height;
  const idealWeightMax = 25 * height * height;
  metrics.push({
    label: 'Ideal Weight Range',
    value: `${idealWeightMin.toFixed(1)} - ${idealWeightMax.toFixed(1)} kg`,
    description: 'Based on BMI 18.5-25'
  });
  
  // Display metrics
  const metricsGrid = document.getElementById('metrics-grid');
  metricsGrid.innerHTML = metrics.map(metric => `
    <div class="metric-card">
      <div class="metric-label">${metric.label}</div>
      <div class="metric-value">${metric.value}</div>
      <div class="metric-description">${metric.description}</div>
    </div>
  `).join('');
}

// Get body fat category
function getBodyFatCategory(percentage, sex) {
  if (sex === 'male') {
    if (percentage < 6) return 'Essential fat';
    if (percentage < 14) return 'Athletes';
    if (percentage < 18) return 'Fitness';
    if (percentage < 25) return 'Average';
    return 'Obese';
  } else {
    if (percentage < 16) return 'Essential fat';
    if (percentage < 20) return 'Athletes';
    if (percentage < 25) return 'Fitness';
    if (percentage < 32) return 'Average';
    return 'Obese';
  }
}

// Get Waist-to-Hip Ratio category
function getWHRCategory(whr, sex) {
  if (sex === 'male') {
    if (whr < 0.85) return 'Low risk';
    if (whr < 0.95) return 'Moderate risk';
    return 'High risk';
  } else {
    if (whr < 0.75) return 'Low risk';
    if (whr < 0.85) return 'Moderate risk';
    return 'High risk';
  }
}

// Get Waist-to-Height Ratio category
function getWHTRCategory(whtr) {
  if (whtr < 0.4) return 'Low risk';
  if (whtr < 0.5) return 'Moderate risk';
  if (whtr < 0.6) return 'High risk';
  return 'Very high risk';
}

// Display results
function displayResults(bmi, category) {
  // Update BMI value
  document.getElementById('bmi-value').textContent = bmi.toFixed(1);
  document.getElementById('bmi-value').style.color = category.color;
  
  // Update category
  document.getElementById('bmi-category').textContent = category.label;
  document.getElementById('bmi-category').style.color = category.color;
  
  // Update indicator position on bar
  const indicator = document.getElementById('bmi-indicator');
  const position = Math.min(100, Math.max(0, ((bmi - 15) / 30) * 100));
  indicator.style.left = `${position}%`;
  
  // Update category info
  const categoryInfo = document.getElementById('category-info');
  categoryInfo.innerHTML = `
    <h3>${category.label}</h3>
    <p><strong>BMI Range:</strong> ${category.min.toFixed(1)} - ${category.max.toFixed(1)}</p>
    <p>${category.description}</p>
  `;
  categoryInfo.style.borderLeftColor = category.color;
}

