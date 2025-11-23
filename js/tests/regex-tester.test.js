// Comprehensive test suite for regex tester tool

import { testRegex, parseFlags, highlightMatches } from '/js/utils/regex.js';

// Test runner
function runTests() {
  const tests = [];
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      const result = fn();
      if (result === true || (result && result.passed)) {
        passed++;
        console.log(`✓ ${name}`);
        return true;
      } else {
        failed++;
        console.error(`✗ ${name}: ${result.message || 'Test failed'}`);
        return false;
      }
    } catch (e) {
      failed++;
      console.error(`✗ ${name}: ${e.message}`);
      return false;
    }
  }

  // Test: Basic pattern matching
  test('Basic pattern matching - digits', () => {
    const result = testRegex('\\d+', 'g', 'abc123def456');
    return result.valid && result.matches.length === 2 && 
           result.matches[0].match === '123' && 
           result.matches[1].match === '456';
  });

  // Test: Case-insensitive flag
  test('Case-insensitive flag (i)', () => {
    const result = testRegex('hello', 'i', 'Hello WORLD');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].match === 'Hello';
  });

  // Test: Global flag
  test('Global flag (g) - multiple matches', () => {
    const result = testRegex('test', 'g', 'test test test');
    return result.valid && result.matches.length === 3;
  });

  test('Global flag (g) - single match without flag', () => {
    const result = testRegex('test', '', 'test test test');
    return result.valid && result.matches.length === 1;
  });

  // Test: Multiline flag
  test('Multiline flag (m)', () => {
    const result = testRegex('^test', 'gm', 'test\nnotest\ntest');
    return result.valid && result.matches.length === 2;
  });

  // Test: DotAll flag
  test('DotAll flag (s)', () => {
    const result = testRegex('test.test', 's', 'test\ntest');
    return result.valid && result.matches.length === 1;
  });

  test('DotAll flag (s) - without flag should not match', () => {
    const result = testRegex('test.test', '', 'test\ntest');
    return result.valid && result.matches.length === 0;
  });

  // Test: Unicode flag
  test('Unicode flag (u)', () => {
    const result = testRegex('\\p{L}+', 'u', 'Hello 世界');
    return result.valid && result.matches.length >= 1;
  });

  // Test: Capture groups
  test('Capture groups - single group', () => {
    const result = testRegex('(\\d+)', 'g', 'abc123def456');
    return result.valid && result.matches.length === 2 && 
           result.matches[0].groups.length === 1 &&
           result.matches[0].groups[0].value === '123';
  });

  test('Capture groups - multiple groups', () => {
    const result = testRegex('(\\d+)-(\\w+)', 'g', '123-abc 456-def');
    return result.valid && result.matches.length === 2 && 
           result.matches[0].groups.length === 2 &&
           result.matches[0].groups[0].value === '123' &&
           result.matches[0].groups[1].value === 'abc';
  });

  // Test: Named capture groups
  test('Named capture groups', () => {
    const result = testRegex('(?<year>\\d{4})-(?<month>\\d{2})', 'g', '2024-01 2024-02');
    return result.valid && result.matches.length === 2 && 
           result.matches[0].groups.length === 2;
  });

  // Test: Empty matches
  test('Empty matches handling', () => {
    const result = testRegex('', 'g', 'test');
    return result.valid; // Empty pattern should be valid but might match everything
  });

  // Test: No matches
  test('No matches found', () => {
    const result = testRegex('xyz', 'g', 'abc def');
    return result.valid && result.matches.length === 0;
  });

  // Test: Invalid regex
  test('Invalid regex pattern', () => {
    const result = testRegex('[', '', 'test');
    return !result.valid && !!result.error && result.matches.length === 0;
  });

  test('Invalid regex - unmatched parenthesis', () => {
    const result = testRegex('(test', '', 'test');
    return !result.valid && !!result.error && result.matches.length === 0;
  });

  // Test: Special characters
  test('Special characters - escaped', () => {
    const result = testRegex('\\.', 'g', 'test.test');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].match === '.';
  });

  test('Special characters - unescaped dot', () => {
    const result = testRegex('.', 'g', 'test');
    return result.valid && result.matches.length === 4; // Matches each character
  });

  // Test: Quantifiers
  test('Quantifier - * (zero or more)', () => {
    const result = testRegex('a*', 'g', 'bb');
    return result.valid && result.matches.length > 0;
  });

  test('Quantifier - + (one or more)', () => {
    const result = testRegex('a+', 'g', 'aaabbb');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].match === 'aaa';
  });

  test('Quantifier - ? (zero or one)', () => {
    const result = testRegex('colou?r', 'g', 'color colour');
    return result.valid && result.matches.length === 2;
  });

  test('Quantifier - {n}', () => {
    const result = testRegex('\\d{3}', 'g', '123456');
    return result.valid && result.matches.length === 2;
  });

  test('Quantifier - {n,m}', () => {
    const result = testRegex('\\d{2,4}', 'g', '12 123 1234 12345');
    return result.valid && result.matches.length === 4;
  });

  // Test: Character classes
  test('Character class - \\d (digits)', () => {
    const result = testRegex('\\d', 'g', 'abc123');
    return result.valid && result.matches.length === 3;
  });

  test('Character class - \\w (word characters)', () => {
    const result = testRegex('\\w+', 'g', 'hello world');
    return result.valid && result.matches.length === 2;
  });

  test('Character class - \\s (whitespace)', () => {
    const result = testRegex('\\s', 'g', 'hello world');
    return result.valid && result.matches.length === 1;
  });

  test('Character class - [abc]', () => {
    const result = testRegex('[abc]', 'g', 'defabc');
    return result.valid && result.matches.length === 3;
  });

  test('Character class - [^abc] (negation)', () => {
    const result = testRegex('[^abc]', 'g', 'abc123');
    return result.valid && result.matches.length === 3; // Matches 1, 2, 3
  });

  // Test: Anchors
  test('Anchor - ^ (start)', () => {
    const result = testRegex('^test', 'm', 'test\nnotest');
    return result.valid && result.matches.length === 1;
  });

  test('Anchor - $ (end)', () => {
    const result = testRegex('test$', 'm', 'test\nnotest');
    return result.valid && result.matches.length === 1;
  });

  // Test: Alternation
  test('Alternation - |', () => {
    const result = testRegex('cat|dog', 'g', 'I have a cat and a dog');
    return result.valid && result.matches.length === 2;
  });

  // Test: Zero-length matches prevention
  test('Zero-length matches - prevent infinite loop', () => {
    const result = testRegex('.*', 'g', 'test');
    return result.valid && result.matches.length <= 2; // Should not loop infinitely
  });

  test('Zero-length matches - empty pattern', () => {
    const result = testRegex('', 'g', 'test');
    return result.valid && result.matches.length <= 10; // Should be limited
  });

  // Test: Sticky flag
  test('Sticky flag (y)', () => {
    const result = testRegex('\\d+', 'y', '123abc');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].match === '123';
  });

  test('Sticky flag (y) - no match at start', () => {
    const result = testRegex('\\d+', 'y', 'abc123');
    return result.valid && result.matches.length === 0;
  });

  // Test: Match indices
  test('Match indices are correct', () => {
    const result = testRegex('test', 'g', 'abc test def');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].index === 4;
  });

  // Test: Multiple matches with indices
  test('Multiple matches - indices are correct', () => {
    const result = testRegex('test', 'g', 'test abc test');
    return result.valid && result.matches.length === 2 && 
           result.matches[0].index === 0 && 
           result.matches[1].index === 9;
  });

  // Test: parseFlags function
  test('parseFlags - single flag', () => {
    const flags = parseFlags('g');
    return flags === 'g';
  });

  test('parseFlags - multiple flags', () => {
    const flags = parseFlags('gi');
    return flags === 'gi' || flags === 'ig'; // Order might vary
  });

  test('parseFlags - all flags', () => {
    const flags = parseFlags('gimsuy');
    return flags.length === 6 && 
           flags.includes('g') && flags.includes('i') && 
           flags.includes('m') && flags.includes('s') &&
           flags.includes('u') && flags.includes('y');
  });

  // Test: highlightMatches function
  test('highlightMatches - basic highlighting', () => {
    const parts = highlightMatches('hello world', 'world', '');
    return parts.length === 2 && 
           parts[0].type === 'text' && 
           parts[1].type === 'match' && 
           parts[1].content === 'world';
  });

  test('highlightMatches - multiple matches', () => {
    const parts = highlightMatches('test test', 'test', 'g');
    return parts.length === 3 && 
           parts.filter(p => p.type === 'match').length === 2;
  });

  test('highlightMatches - invalid pattern', () => {
    const parts = highlightMatches('test', '[', '');
    return parts.length === 1 && parts[0].type === 'error';
  });

  // Test: Edge cases
  test('Edge case - very long text', () => {
    const longText = 'a'.repeat(10000) + 'test' + 'a'.repeat(10000);
    const result = testRegex('test', 'g', longText);
    return result.valid && result.matches.length === 1;
  });

  test('Edge case - special regex characters in text', () => {
    const result = testRegex('test', 'g', 'test ( ) [ ] { } * + ? . ^ $ | \\');
    return result.valid && result.matches.length === 1;
  });

  test('Edge case - newlines', () => {
    const result = testRegex('test', 'g', 'test\ntest\rtest');
    return result.valid && result.matches.length === 3;
  });

  test('Edge case - empty text', () => {
    const result = testRegex('test', 'g', '');
    return result.valid && result.matches.length === 0;
  });

  test('Edge case - unicode characters', () => {
    const result = testRegex('世界', 'g', 'Hello 世界 World');
    return result.valid && result.matches.length === 1;
  });

  // Test: Complex patterns
  test('Complex pattern - email-like', () => {
    const result = testRegex('[\\w.]+@[\\w.]+', 'g', 'test@example.com user@domain.org');
    return result.valid && result.matches.length === 2;
  });

  test('Complex pattern - phone number', () => {
    const result = testRegex('\\d{3}-\\d{3}-\\d{4}', 'g', '123-456-7890 555-123-4567');
    return result.valid && result.matches.length === 2;
  });

  // Test: Groups with empty matches
  test('Capture groups - empty group', () => {
    const result = testRegex('(\\d*)(\\w*)', 'g', '123abc');
    return result.valid && result.matches.length >= 1;
  });

  // Test: Non-capturing groups (should not appear in groups)
  test('Non-capturing groups', () => {
    const result = testRegex('(?:test)(\\d+)', 'g', 'test123');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].groups.length === 1; // Only capturing group
  });

  // Test: Lookahead (positive)
  test('Positive lookahead', () => {
    const result = testRegex('test(?=\\d)', 'g', 'test123 test456');
    return result.valid && result.matches.length === 2;
  });

  // Test: Lookahead (negative)
  test('Negative lookahead', () => {
    const result = testRegex('test(?!\\d)', 'g', 'test123 testabc');
    return result.valid && result.matches.length === 1 && 
           result.matches[0].match === 'test';
  });

  // Test: Lookbehind (positive) - if supported
  test('Positive lookbehind', () => {
    try {
      const result = testRegex('(?<=\\d)test', 'g', '123test abc');
      return result.valid && result.matches.length === 1;
    } catch (e) {
      // Lookbehind might not be supported in all browsers
      return true; // Skip if not supported
    }
  });

  // Test: Safety limit
  test('Safety limit - prevent too many matches', () => {
    const result = testRegex('.*', 'g', 'a'.repeat(100));
    return result.valid && result.matches.length <= 1000; // Should be limited
  });

  // Summary
  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log(`Success rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  return {
    passed,
    failed,
    total: passed + failed,
    successRate: (passed / (passed + failed)) * 100
  };
}

// Export for use in browser console or test runner
if (typeof window !== 'undefined') {
  window.regexTests = runTests;
}

// Run tests if this is executed directly
if (typeof window !== 'undefined' && window.location.search.includes('test=true')) {
  runTests();
}

export { runTests };

