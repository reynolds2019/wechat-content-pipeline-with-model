const { PROVIDERS, createClient } = require('../providers');
let pass = 0, fail = 0;

function assertThrows(name, fn, expectedMsg) {
  try { fn(); fail++; console.log(`  ✗ ${name}: did not throw`); }
  catch (e) {
    if (e.message.includes(expectedMsg)) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}: wrong error: ${e.message}`); }
  }
}

console.log('--- Provider Unit Tests ---');

// P1: Invalid provider
assertThrows('P1: invalid provider', () => createClient('invalid'), '不支持的 provider');

// P2: Missing API key (clear env first)
const origKey = process.env.GEMINI_API_KEY;
delete process.env.GEMINI_API_KEY;
assertThrows('P2: missing API key', () => createClient('gemini'), '缺少 API Key');
if (origKey) process.env.GEMINI_API_KEY = origKey;

// P3: All providers have required fields
const required = ['baseURL', 'model', 'envKey'];
let p3pass = true;
for (const [name, config] of Object.entries(PROVIDERS)) {
  for (const field of required) {
    if (!config[field]) { p3pass = false; console.log(`  ✗ P3: ${name} missing ${field}`); }
  }
}
if (p3pass) { pass++; console.log('  ✓ P3: all providers have required fields'); }
else { fail++; }

console.log(`\n结果: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log('ALL PROVIDER TESTS PASSED');
