#!/usr/bin/env node
/**
 * Comprehensive Unit Conversion Tests
 * Tests all unit conversions to ensure accuracy
 */

import { UNIT_DEFINITIONS, CATEGORIES } from '../js/utils/unit-definitions.js';

// Extract conversion logic from unit-converter.js
function convertUnit(fromValue, fromUnitId, toUnitId, unitDefinitions) {
  const fromUnitDef = unitDefinitions[fromUnitId];
  const toUnitDef = unitDefinitions[toUnitId];
  
  if (!fromUnitDef || !toUnitDef) {
    throw new Error(`Unit not found: ${fromUnitId} or ${toUnitId}`);
  }
  
  // Check if units are compatible
  if (fromUnitDef.baseDimension !== toUnitDef.baseDimension) {
    throw new Error(`Cannot convert between incompatible units: ${fromUnitId} (${fromUnitDef.baseDimension}) and ${toUnitId} (${toUnitDef.baseDimension})`);
  }
  
  // Handle temperature conversions (have offsets)
  if (fromUnitDef.hasOffset || toUnitDef.hasOffset) {
    // Convert from source to base (Kelvin for temperature)
    const sourceOffset = fromUnitDef.offset || 0;
    const sourceMultiplier = fromUnitDef.multiplier || 1;
    let baseValue;
    
    if (sourceOffset !== 0) {
      // Has offset: base = (value + offset) * multiplier
      baseValue = (fromValue + sourceOffset) * sourceMultiplier;
    } else {
      // No offset: base = value * multiplier
      baseValue = fromValue * sourceMultiplier;
    }
    
    // Convert from base to target
    const targetOffset = toUnitDef.offset || 0;
    const targetMultiplier = toUnitDef.multiplier || 1;
    
    if (targetOffset !== 0) {
      // Has offset: value = (base / multiplier) - offset
      return (baseValue / targetMultiplier) - targetOffset;
    } else {
      // No offset: value = base / multiplier
      return baseValue / targetMultiplier;
    }
  } else {
    // Standard linear conversion
    const baseValue = fromValue * (fromUnitDef.multiplier || 1);
    return baseValue / (toUnitDef.multiplier || 1);
  }
}

// Test helper
function testConversion(name, fromValue, fromUnitId, toUnitId, expected, tolerance = 1e-10) {
  try {
    const result = convertUnit(fromValue, fromUnitId, toUnitId, UNIT_DEFINITIONS);
    const diff = Math.abs(result - expected);
    const passed = diff <= tolerance;
    
    if (!passed) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   ${fromValue} ${fromUnitId} → ${result} ${toUnitId} (expected ${expected}, diff: ${diff})`);
      return false;
    } else {
      console.log(`✓ PASS: ${name}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ERROR: ${name}`);
    console.error(`   ${error.message}`);
    return false;
  }
}

// Round-trip test: convert A→B→A should equal original
function testRoundTrip(name, value, unitId1, unitId2, tolerance = 1e-10) {
  try {
    const converted = convertUnit(value, unitId1, unitId2, UNIT_DEFINITIONS);
    const backConverted = convertUnit(converted, unitId2, unitId1, UNIT_DEFINITIONS);
    const diff = Math.abs(backConverted - value);
    const passed = diff <= tolerance;
    
    if (!passed) {
      console.error(`❌ FAIL (Round-trip): ${name}`);
      console.error(`   ${value} ${unitId1} → ${converted} ${unitId2} → ${backConverted} ${unitId1} (diff: ${diff})`);
      return false;
    } else {
      console.log(`✓ PASS (Round-trip): ${name}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ ERROR (Round-trip): ${name}`);
    console.error(`   ${error.message}`);
    return false;
  }
}

// Get all units grouped by category
function getUnitsByCategory() {
  const unitsByCategory = {};
  for (const [id, unit] of Object.entries(UNIT_DEFINITIONS)) {
    if (!unitsByCategory[unit.category]) {
      unitsByCategory[unit.category] = [];
    }
    unitsByCategory[unit.category].push(id);
  }
  return unitsByCategory;
}

// Run all tests
console.log('🧪 Unit Conversion Tests\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// ============================================================================
// LENGTH TESTS
// ============================================================================
console.log('\n📏 LENGTH CONVERSIONS');
console.log('-'.repeat(60));

// Meter to other units
totalTests++; if (testConversion('1 m → 100 cm', 1, 'meter', 'centimeter', 100)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 m → 1000 mm', 1, 'meter', 'millimeter', 1000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 m → 0.001 km', 1, 'meter', 'kilometer', 0.001)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 m → 39.3701 in', 1, 'meter', 'inch', 39.37007874015748, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 m → 3.28084 ft', 1, 'meter', 'foot', 3.280839895013123, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 m → 1.09361 yd', 1, 'meter', 'yard', 1.0936132983377078, 1e-6)) passedTests++; else failedTests++;

// Reverse conversions
totalTests++; if (testConversion('100 cm → 1 m', 100, 'centimeter', 'meter', 1)) passedTests++; else failedTests++;
totalTests++; if (testConversion('12 in → 0.3048 m', 12, 'inch', 'meter', 0.3048, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('3 ft → 0.9144 m', 3, 'foot', 'meter', 0.9144, 1e-6)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 m ↔ km', 1, 'meter', 'kilometer')) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('100 cm ↔ m', 100, 'centimeter', 'meter')) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('1 mile ↔ km', 1, 'mile', 'kilometer', 1e-6)) passedTests++; else failedTests++;

// ============================================================================
// MASS TESTS
// ============================================================================
console.log('\n⚖️ MASS CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 kg → 1000 g', 1, 'kilogram', 'gram', 1000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 kg → 0.001 t', 1, 'kilogram', 'metric_tonne', 0.001)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 kg → 2.20462 lb', 1, 'kilogram', 'pound', 2.2046226218487757, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 lb → 0.453592 kg', 1, 'pound', 'kilogram', 0.45359237, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('16 oz → 0.453592 kg', 16, 'ounce', 'kilogram', 0.45359237, 1e-6)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 kg ↔ g', 1, 'kilogram', 'gram')) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('1 lb ↔ kg', 1, 'pound', 'kilogram', 1e-6)) passedTests++; else failedTests++;

// ============================================================================
// TEMPERATURE TESTS
// ============================================================================
console.log('\n🌡️ TEMPERATURE CONVERSIONS');
console.log('-'.repeat(60));

// Celsius to Fahrenheit
totalTests++; if (testConversion('0 °C → 32 °F', 0, 'celsius', 'fahrenheit', 32)) passedTests++; else failedTests++;
totalTests++; if (testConversion('100 °C → 212 °F', 100, 'celsius', 'fahrenheit', 212)) passedTests++; else failedTests++;
totalTests++; if (testConversion('37 °C → 98.6 °F', 37, 'celsius', 'fahrenheit', 98.6, 1e-6)) passedTests++; else failedTests++;

// Fahrenheit to Celsius
totalTests++; if (testConversion('32 °F → 0 °C', 32, 'fahrenheit', 'celsius', 0, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('212 °F → 100 °C', 212, 'fahrenheit', 'celsius', 100, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('98.6 °F → 37 °C', 98.6, 'fahrenheit', 'celsius', 37, 1e-6)) passedTests++; else failedTests++;

// Celsius to Kelvin
totalTests++; if (testConversion('0 °C → 273.15 K', 0, 'celsius', 'kelvin', 273.15)) passedTests++; else failedTests++;
totalTests++; if (testConversion('25 °C → 298.15 K', 25, 'celsius', 'kelvin', 298.15)) passedTests++; else failedTests++;

// Kelvin to Celsius
totalTests++; if (testConversion('273.15 K → 0 °C', 273.15, 'kelvin', 'celsius', 0)) passedTests++; else failedTests++;
totalTests++; if (testConversion('0 K → -273.15 °C', 0, 'kelvin', 'celsius', -273.15)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('0 °C ↔ °F', 0, 'celsius', 'fahrenheit', 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('100 °C ↔ K', 100, 'celsius', 'kelvin')) passedTests++; else failedTests++;

// ============================================================================
// TIME TESTS
// ============================================================================
console.log('\n⏰ TIME CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 s → 1000 ms', 1, 'second', 'millisecond', 1000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('60 s → 1 min', 60, 'second', 'minute', 1)) passedTests++; else failedTests++;
totalTests++; if (testConversion('3600 s → 1 h', 3600, 'second', 'hour', 1)) passedTests++; else failedTests++;
totalTests++; if (testConversion('86400 s → 1 d', 86400, 'second', 'day', 1)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 week → 604800 s', 1, 'week', 'second', 604800)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 Julian year → 0.100002 decades', 1, 'julian_year', 'decade', 0.10000205343025524, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('10 decades → 99.998 Julian years', 10, 'decade', 'julian_year', 99.998, 1e-3)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 h ↔ s', 1, 'hour', 'second')) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('1 day ↔ s', 1, 'day', 'second')) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('1 Julian year ↔ decade', 1, 'julian_year', 'decade', 1e-6)) passedTests++; else failedTests++;

// ============================================================================
// VOLUME TESTS
// ============================================================================
console.log('\n📦 VOLUME CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 L → 1000 mL', 1, 'liter', 'milliliter', 1000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 m³ → 1000 L', 1, 'cubic_meter', 'liter', 1000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 US gallon → 3.78541 L', 1, 'us_gallon', 'liter', 3.785411784, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 US quart → 0.946353 L', 1, 'us_quart', 'liter', 0.946352946, 1e-6)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 L ↔ mL', 1, 'liter', 'milliliter')) passedTests++; else failedTests++;
totalTests++; if (testRoundTrip('1 US gallon ↔ L', 1, 'us_gallon', 'liter', 1e-6)) passedTests++; else failedTests++;

// ============================================================================
// AREA TESTS
// ============================================================================
console.log('\n📐 AREA CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 m² → 10000 cm²', 1, 'square_meter', 'square_centimeter', 10000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 hectare → 10000 m²', 1, 'hectare', 'square_meter', 10000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 acre → 4046.86 m²', 1, 'acre', 'square_meter', 4046.86, 1e-2)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 m² ↔ cm²', 1, 'square_meter', 'square_centimeter')) passedTests++; else failedTests++;

// ============================================================================
// SPEED TESTS
// ============================================================================
console.log('\n🚗 SPEED CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 m/s → 3.6 km/h', 1, 'meter_per_second', 'kilometer_per_hour', 3.6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 mph → 1.60934 km/h', 1, 'mile_per_hour', 'kilometer_per_hour', 1.609344, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('60 mph → 26.8224 m/s', 60, 'mile_per_hour', 'meter_per_second', 26.8224, 1e-6)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 m/s ↔ km/h', 1, 'meter_per_second', 'kilometer_per_hour')) passedTests++; else failedTests++;

// ============================================================================
// ENERGY TESTS
// ============================================================================
console.log('\n⚡ ENERGY CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 J → 0.239006 cal', 1, 'joule', 'calorie', 0.2390057361376673, 1e-6)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 kWh → 3600000 J', 1, 'kilowatt_hour', 'joule', 3600000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 BTU → 1055.06 J', 1, 'btu', 'joule', 1055.05585262, 1e-6)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 J ↔ cal', 1, 'joule', 'calorie', 1e-6)) passedTests++; else failedTests++;

// ============================================================================
// POWER TESTS
// ============================================================================
console.log('\n💡 POWER CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 kW → 1000 W', 1, 'kilowatt', 'watt', 1000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 hp → 745.7 W', 1, 'horsepower_mechanical', 'watt', 745.6998715822702, 1e-6)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 kW ↔ W', 1, 'kilowatt', 'watt')) passedTests++; else failedTests++;

// ============================================================================
// PRESSURE TESTS
// ============================================================================
console.log('\n🔧 PRESSURE CONVERSIONS');
console.log('-'.repeat(60));

totalTests++; if (testConversion('1 Pa → 0.000145038 psi', 1, 'pascal', 'psi', 0.00014503773773020923, 1e-9)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 bar → 100000 Pa', 1, 'bar', 'pascal', 100000)) passedTests++; else failedTests++;
totalTests++; if (testConversion('1 atm → 101325 Pa', 1, 'atmosphere', 'pascal', 101325)) passedTests++; else failedTests++;

// Round-trip tests
totalTests++; if (testRoundTrip('1 bar ↔ Pa', 1, 'bar', 'pascal')) passedTests++; else failedTests++;

// ============================================================================
// COMPREHENSIVE TESTS: Test all units in each category
// ============================================================================
console.log('\n🔍 COMPREHENSIVE CATEGORY TESTS');
console.log('-'.repeat(60));

const unitsByCategory = getUnitsByCategory();

// Test all categories
for (const category of CATEGORIES) {
  const categoryId = category.id;
  const units = unitsByCategory[categoryId];
  if (!units || units.length < 2) continue;
  
  console.log(`\nTesting ${category.name} (${categoryId}) - ${units.length} units...`);
  
  // Test every unit to every other unit in the category
  // Use a test value of 1 for most units, but use 100 for very small units to avoid precision issues
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      const unit1 = units[i];
      const unit2 = units[j];
      const unit1Def = UNIT_DEFINITIONS[unit1];
      const unit2Def = UNIT_DEFINITIONS[unit2];
      
      // Skip if units have different base dimensions (shouldn't happen in same category, but check anyway)
      if (unit1Def.baseDimension !== unit2Def.baseDimension) {
        continue;
      }
      
      // Choose test value based on unit size
      // For very small multipliers, use a larger test value
      let testValue = 1;
      if (unit1Def.multiplier < 1e-6 || unit2Def.multiplier < 1e-6) {
        testValue = 1000;
      } else if (unit1Def.multiplier < 1e-3 || unit2Def.multiplier < 1e-3) {
        testValue = 100;
      } else if (unit1Def.multiplier > 1e6 || unit2Def.multiplier > 1e6) {
        testValue = 0.001;
      }
      
      // Adjust tolerance based on unit types
      let tolerance = 1e-10;
      if (unit1Def.hasOffset || unit2Def.hasOffset) {
        tolerance = 1e-6; // Temperature conversions need more tolerance
      } else if (unit1Def.multiplier < 1e-6 || unit2Def.multiplier < 1e-6) {
        tolerance = 1e-6; // Very small units
      } else if (unit1Def.multiplier > 1e6 || unit2Def.multiplier > 1e6) {
        tolerance = 1e-6; // Very large units
      }
      
      totalTests++;
      const testName = `${testValue} ${unit1} ↔ ${unit2}`;
      if (testRoundTrip(testName, testValue, unit1, unit2, tolerance)) {
        passedTests++;
      } else {
        failedTests++;
      }
    }
  }
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('\n📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

if (failedTests === 0) {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.');
  process.exit(1);
}

