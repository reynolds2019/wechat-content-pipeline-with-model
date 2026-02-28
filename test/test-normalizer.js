const { normalize } = require('../normalizer');
let pass = 0, fail = 0;

function assert(name, actual, expected) {
  if (actual === expected) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`); fail++; }
}

function assertIncludes(name, actual, substring) {
  if (actual.includes(substring)) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name}\n    expected to include: ${JSON.stringify(substring)}\n    actual: ${JSON.stringify(actual)}`); fail++; }
}

console.log('--- Normalizer Unit Tests ---');

// N1: comma after English char is NOT converted (regex only matches Chinese char before comma)
// "这是test,好的" → "这是 test,好的" (space added between 是/t, comma stays because it follows 't' not a Chinese char)
assert('N1: CJK-Latin spacing, comma after English kept', normalize('这是test,好的'), '这是 test,好的');

// N2: period after Chinese char IS converted
assert('N2: Chinese period conversion', normalize('结束了.下一句'), '结束了。下一句');

// N3: CJK-number spacing
assert('N3: Number spacing', normalize('共10个'), '共 10 个');

// N4: inline code protected from modification
assert('N4: Inline code protected', normalize('`code,test`'), '`code,test`');

// N5: URL protected (including comma inside URL path)
assert('N5: URL protected', normalize('访问https://example.com/path?a=1,2了'), '访问https://example.com/path?a=1,2了');

// N6: Markdown link protected
assert('N6: Markdown link protected', normalize('[链接](https://example.com)'), '[链接](https://example.com)');

console.log(`\n结果: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log('ALL NORMALIZER TESTS PASSED');
