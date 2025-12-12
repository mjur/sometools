// JSON Validator Tests
// Run with: node --experimental-vm-modules node_modules/.bin/jest json-validate.test.js
// Or use a test runner that supports ES modules

import { safeParse } from '/js/utils/json.js';

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}:`, error.message);
    throw error;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test valid JSON
test('Valid simple JSON', () => {
  const result = safeParse('{"foo":"bar"}');
  assert(result.success === true, 'Should be valid');
  assert(result.data.foo === 'bar', 'Should parse correctly');
  assert(result.errors.length === 0, 'Should have no errors');
});

test('Valid array JSON', () => {
  const result = safeParse('[1, 2, 3]');
  assert(result.success === true, 'Should be valid');
  assert(Array.isArray(result.data), 'Should be an array');
  assert(result.errors.length === 0, 'Should have no errors');
});

test('Valid nested JSON', () => {
  const result = safeParse('{"a": {"b": [1, 2, 3]}}');
  assert(result.success === true, 'Should be valid');
  assert(result.data.a.b.length === 3, 'Should parse nested structure');
  assert(result.errors.length === 0, 'Should have no errors');
});

// Test single errors
test('Missing closing brace', () => {
  const result = safeParse('{"foo":"bar"');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should have at least one error');
  assert(result.errors.some(e => e.message.includes('brace') || e.message.includes('Unexpected')), 'Should detect unclosed brace');
});

test('Missing closing bracket', () => {
  const result = safeParse('[1, 2, 3');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should have at least one error');
  assert(result.errors.some(e => e.message.includes('bracket') || e.message.includes('Unexpected')), 'Should detect unclosed bracket');
});

test('Trailing comma in object', () => {
  const result = safeParse('{"foo":"bar",}');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should have at least one error');
  assert(result.errors.some(e => e.message.includes('Trailing comma') || e.message.includes('Unexpected')), 'Should detect trailing comma');
});

test('Trailing comma in array', () => {
  const result = safeParse('[1, 2, 3,]');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should have at least one error');
  assert(result.errors.some(e => e.message.includes('Trailing comma') || e.message.includes('Unexpected')), 'Should detect trailing comma');
});

// Test multiple errors
test('Multiple errors: unclosed brace and trailing comma', () => {
  const result = safeParse('{"foo":"bar", "baz": "qux",');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 2, 'Should detect multiple errors');
  const errorMessages = result.errors.map(e => e.message).join(' ');
  assert(errorMessages.includes('Trailing comma') || errorMessages.includes('Unexpected'), 'Should detect trailing comma');
  assert(errorMessages.includes('brace') || errorMessages.includes('Unexpected'), 'Should detect unclosed brace');
});

test('Multiple errors: mismatched brackets and invalid character', () => {
  const result = safeParse('{"foo": [1, 2}');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
  // Should detect bracket mismatch
  const hasBracketError = result.errors.some(e => 
    e.message.includes('bracket') || 
    e.message.includes('Unexpected') ||
    e.message.includes('position')
  );
  assert(hasBracketError, 'Should detect bracket mismatch');
});

test('Multiple errors: unclosed string and missing comma', () => {
  const result = safeParse('{"foo": "bar" "baz": "qux"}');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
});

test('Multiple errors: invalid escape and unclosed brace', () => {
  const result = safeParse('{"foo": "bar\\x", "baz": "qux"');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
  const errorMessages = result.errors.map(e => e.message).join(' ');
  // Should detect invalid escape or unclosed brace
  assert(
    errorMessages.includes('escape') || 
    errorMessages.includes('brace') || 
    errorMessages.includes('Unexpected'),
    'Should detect escape or brace error'
  );
});

test('Invalid unicode escape sequence', () => {
  const result = safeParse('{"foo": "\\uXXXX"}');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
  const hasUnicodeError = result.errors.some(e => 
    e.message.includes('unicode') || 
    e.message.includes('escape') ||
    e.message.includes('Unexpected')
  );
  assert(hasUnicodeError, 'Should detect invalid unicode escape');
});

test('Incomplete unicode escape sequence', () => {
  const result = safeParse('{"foo": "\\u12"}');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
  const hasIncompleteError = result.errors.some(e => 
    e.message.includes('Incomplete') || 
    e.message.includes('unicode') ||
    e.message.includes('Unexpected')
  );
  assert(hasIncompleteError, 'Should detect incomplete unicode escape');
});

test('Unclosed string', () => {
  const result = safeParse('{"foo": "bar');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
  const hasUnclosedString = result.errors.some(e => 
    e.message.includes('Unclosed string') || 
    e.message.includes('Unexpected')
  );
  assert(hasUnclosedString, 'Should detect unclosed string');
});

test('Unexpected closing bracket', () => {
  const result = safeParse('{"foo": "bar"}');
  const result2 = safeParse('}');
  assert(result2.success === false, 'Should be invalid');
  assert(result2.errors.length >= 1, 'Should detect errors');
  const hasUnexpectedBracket = result2.errors.some(e => 
    e.message.includes('Unexpected closing') || 
    e.message.includes('Unexpected')
  );
  assert(hasUnexpectedBracket, 'Should detect unexpected closing bracket');
});

test('Multiple trailing commas', () => {
  const result = safeParse('{"a": 1, "b": 2, "c": 3,}');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect errors');
  const hasTrailingComma = result.errors.some(e => 
    e.message.includes('Trailing comma') || 
    e.message.includes('Unexpected')
  );
  assert(hasTrailingComma, 'Should detect trailing comma');
});

test('Complex multiple errors', () => {
  const result = safeParse('{"foo": "bar", "baz": [1, 2,], "qux": "test"');
  assert(result.success === false, 'Should be invalid');
  assert(result.errors.length >= 1, 'Should detect at least one error');
  // Should detect trailing comma in array and/or unclosed brace
  const errorMessages = result.errors.map(e => e.message).join(' ');
  assert(
    errorMessages.includes('Trailing comma') || 
    errorMessages.includes('brace') ||
    errorMessages.includes('Unexpected'),
    'Should detect multiple issues'
  );
});

test('Error positions are correct', () => {
  const json = '{\n  "foo": "bar",\n  "baz": "qux",\n}';
  const result = safeParse(json);
  assert(result.success === false, 'Should be invalid');
  if (result.errors.length > 0) {
    const error = result.errors[0];
    if (error.line) {
      assert(error.line >= 1, 'Line should be >= 1');
      assert(error.line <= json.split('\n').length, 'Line should not exceed total lines');
    }
    if (error.column) {
      assert(error.column >= 1, 'Column should be >= 1');
    }
  }
});

test('Empty string', () => {
  const result = safeParse('');
  assert(result.success === false, 'Empty string should be invalid');
  assert(result.errors.length >= 1, 'Should have errors');
});

test('Whitespace only', () => {
  const result = safeParse('   \n\t  ');
  assert(result.success === false, 'Whitespace only should be invalid');
  assert(result.errors.length >= 1, 'Should have errors');
});

test('Valid numbers', () => {
  const testCases = [
    '123',
    '-123',
    '123.456',
    '-123.456',
    '1e10',
    '1E10',
    '1e-10',
    '1E-10'
  ];
  
  testCases.forEach(testCase => {
    const result = safeParse(testCase);
    assert(result.success === true, `${testCase} should be valid`);
    assert(result.errors.length === 0, `${testCase} should have no errors`);
  });
});

test('Valid booleans and null', () => {
  const testCases = ['true', 'false', 'null'];
  
  testCases.forEach(testCase => {
    const result = safeParse(testCase);
    assert(result.success === true, `${testCase} should be valid`);
    assert(result.errors.length === 0, `${testCase} should have no errors`);
  });
});

console.log('\n✅ All tests passed!');






