#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
PASS=0; FAIL=0

ok() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

echo "=== wx-format v1.3 验证 ==="

# Test 1: Three themes
echo "[1] 三主题输出"
for t in simple business tech; do
  node index.js test/comprehensive.md -t $t -o "test/v12-${t}.html" --no-clipboard 2>/dev/null && ok "$t" || fail "$t"
done

# Test 2: stdin mode
echo "[2] stdin 模式"
cat test/comprehensive.md | node index.js -t tech --no-clipboard > /tmp/wx-stdin-test.html 2>/dev/null && ok "stdin" || fail "stdin"

# Test 3: Error handling
echo "[3] 错误处理"
echo "" | node index.js --no-clipboard > /dev/null 2>&1 && fail "empty should error" || ok "empty rejected"
node index.js nonexistent.md --no-clipboard > /dev/null 2>&1 && fail "missing should error" || ok "missing rejected"

# Test 4: Custom theme
echo "[4] 自定义主题"
node index.js test/comprehensive.md -t test/custom-theme.json -o test/v12-custom.html --no-clipboard 2>/dev/null && ok "custom theme" || fail "custom theme"

# Test 5: Polish dry-run
echo "[5] 润色 dry-run"
node index.js test/sample.md --polish gemini --dry-run --no-clipboard 2>&1 | grep -q "DRY RUN" && ok "dry-run" || fail "dry-run"

# Test 6: Normalize
echo "[6] normalize 测试"
echo "这是test,共10个item." | node index.js --normalize --no-clipboard > /tmp/wx-normalize-test.html 2>/dev/null && ok "normalize" || fail "normalize"

# Test 7: !important
echo "[7] !important 测试"
node index.js test/sample.md --important -o /tmp/wx-important-test.html --no-clipboard 2>/dev/null
grep -q '!important' /tmp/wx-important-test.html && ok "!important" || fail "!important"

# Test 8: Topic dry-run
echo "[8] topic 子命令"
node index.js topic --dry-run --analyze 2>&1 | grep -q "DRY RUN\|热点\|获取" && ok "topic dry-run" || fail "topic dry-run"

# Test 9: Polish chain dry-run
echo "[9] 润色链 dry-run"
node index.js test/sample.md --polish gemini --polish-type grammar,deai --dry-run --no-clipboard 2>&1 | grep -q "DRY RUN\|润色链" && ok "polish chain" || fail "polish chain"

# Test 10: Write dry-run
echo "[10] write dry-run"
node index.js write "AI改变教育" --dry-run 2>&1 | grep -q "DRY RUN" && ok "write dry-run" || fail "write dry-run"

# Test 11: Write list-types
echo "[11] write --list-types"
node index.js write --list-types 2>&1 | grep -q "opinion" && ok "list-types" || fail "list-types"

# Summary
echo ""
echo "结果: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && echo "ALL TESTS PASSED" || exit 1
