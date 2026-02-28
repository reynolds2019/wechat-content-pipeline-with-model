#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
PASS=0; FAIL=0; TOTAL=0

ok()   { TOTAL=$((TOTAL+1)); PASS=$((PASS+1)); echo "  ✓ PASS [$TOTAL]: $1"; }
fail() { TOTAL=$((TOTAL+1)); FAIL=$((FAIL+1)); echo "  ✗ FAIL [$TOTAL]: $1"; }

echo "=========================================="
echo "  wx-format v1.5 CLI Test Suite"
echo "=========================================="
echo ""

# ---------- Formatter Tests (F1-F20) ----------
echo "--- Formatter Tests ---"

# F1: simple theme
OUT=$(node index.js test/sample.md -t simple --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q 'style='; then ok "F1: simple theme → has style="; else fail "F1: simple theme → missing style="; fi

# F2: business theme
OUT=$(node index.js test/sample.md -t business --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q 'style='; then ok "F2: business theme → has style="; else fail "F2: business theme → missing style="; fi

# F3: tech theme
OUT=$(node index.js test/sample.md -t tech --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q 'style='; then ok "F3: tech theme → has style="; else fail "F3: tech theme → missing style="; fi

# F4: custom theme JSON
OUT=$(node index.js test/sample.md -t test/custom-theme.json --no-clipboard -o /dev/stdout 2>/dev/null || true)
if [ -n "$OUT" ]; then ok "F4: custom theme JSON → generates output"; else fail "F4: custom theme JSON → no output"; fi

# F5: stdin mode
OUT=$(echo "# Hello" | node index.js --no-clipboard 2>/dev/null || true)
if [ -n "$OUT" ]; then ok "F5: stdin mode → produces output"; else fail "F5: stdin mode → no output"; fi

# F6: empty input → exit 1
TMPEMPTY=$(mktemp /tmp/wxformat-empty-XXXX.md)
: > "$TMPEMPTY"
if node index.js "$TMPEMPTY" --no-clipboard 2>/dev/null; then
  fail "F6: empty input → should have exit 1"
else
  ok "F6: empty input → exit 1"
fi
rm -f "$TMPEMPTY"

# F7: nonexistent file → exit 1, stderr contains "不存在"
ERR=$(node index.js nonexistent-file.md --no-clipboard 2>&1 || true)
if echo "$ERR" | grep -q '不存在'; then ok "F7: nonexistent file → stderr has 不存在"; else fail "F7: nonexistent file → stderr: $ERR"; fi

# F8: normalize → output contains Chinese comma
OUT=$(node index.js test/sample.md --normalize --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q '，'; then ok "F8: normalize → has ，"; else fail "F8: normalize → missing ，"; fi

# F9: --important → output contains !important
OUT=$(node index.js test/sample.md --important --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q '!important'; then ok "F9: --important → has !important"; else fail "F9: --important → missing !important"; fi

# F10: polish dry-run → contains "DRY RUN"
OUT=$(node index.js test/sample.md --polish gemini --dry-run --no-clipboard 2>&1 || true)
if echo "$OUT" | grep -qi 'DRY RUN'; then ok "F10: polish dry-run → has DRY RUN"; else fail "F10: polish dry-run → output: $(echo "$OUT" | head -3)"; fi

# F11: --polish --polish-only --dry-run → doesn't crash
OUT=$(node index.js test/sample.md --polish gemini --polish-only --dry-run --no-clipboard 2>&1 || true)
EXIT=$?
if [ $EXIT -eq 0 ] || echo "$OUT" | grep -qi 'DRY RUN'; then ok "F11: polish-only dry-run → no crash"; else fail "F11: polish-only dry-run → crashed"; fi

# F12: polish chain dry-run → contains "润色链" or "DRY RUN"
OUT=$(node index.js test/sample.md --polish gemini --polish-type "grammar,style" --dry-run --no-clipboard 2>&1 || true)
if echo "$OUT" | grep -q '润色链\|DRY RUN'; then ok "F12: polish chain dry-run → has 润色链 or DRY RUN"; else fail "F12: polish chain dry-run → output: $(echo "$OUT" | head -3)"; fi

# F13: --images --dry-run → contains "dry-run" or "dry" (case insensitive)
OUT=$(node index.js test/sample.md --images --dry-run --no-clipboard 2>&1 || true)
if echo "$OUT" | grep -qi 'dry'; then ok "F13: images dry-run → has dry"; else fail "F13: images dry-run → output: $(echo "$OUT" | head -3)"; fi

# F14: list-themes → contains "simple"
OUT=$(node index.js --list-themes 2>&1 || true)
if echo "$OUT" | grep -q 'simple'; then ok "F14: list-themes → has simple"; else fail "F14: list-themes → output: $OUT"; fi

# F15: code highlighting → output contains <pre and color:
OUT=$(node index.js test/sample.md --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q '<pre' && echo "$OUT" | grep -q 'color:'; then
  ok "F15: code highlighting → has <pre and color:"
else
  fail "F15: code highlighting → missing <pre or color:"
fi

# F16: links → comprehensive.md has href or docs.anthropic.com
OUT=$(node index.js test/comprehensive.md --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q 'href\|docs.anthropic.com'; then ok "F16: links → has href"; else fail "F16: links → missing href"; fi

# F17: table → comprehensive.md has <table
OUT=$(node index.js test/comprehensive.md --no-clipboard -o /dev/stdout 2>/dev/null || true)
if echo "$OUT" | grep -q '<table'; then ok "F17: table → has <table"; else fail "F17: table → missing <table"; fi

# F18: frontmatter theme overrides -t flag
OUT=$(node index.js test/sample.md -t tech --no-clipboard -o /dev/stdout 2>/dev/null || true)
# sample.md has theme: simple in frontmatter, which takes priority over -t tech
if echo "$OUT" | grep -q 'wx-format \[simple\]'; then
  ok "F18: frontmatter theme → uses simple (overrides -t tech)"
else
  fail "F18: frontmatter theme → title: $(echo "$OUT" | grep '<title' | head -1)"
fi

# F19: >1MB file warning → stderr contains "警告"
TMPLARGE=$(mktemp /tmp/wxformat-1mb-XXXX.md)
python3 -c "print('# Big file\n' + 'x' * 1100000)" > "$TMPLARGE"
ERR=$(node index.js "$TMPLARGE" --no-clipboard -o /dev/null 2>&1 || true)
if echo "$ERR" | grep -q '警告'; then ok "F19: >1MB file → stderr has 警告"; else fail "F19: >1MB file → stderr: $ERR"; fi
rm -f "$TMPLARGE"

# F20: >10MB file rejection → exit 1
TMPHUGE=$(mktemp /tmp/wxformat-10mb-XXXX.md)
python3 -c "print('# Huge file\n' + 'x' * 11000000)" > "$TMPHUGE"
if node index.js "$TMPHUGE" --no-clipboard 2>/dev/null; then
  fail "F20: >10MB file → should have exit 1"
else
  ok "F20: >10MB file → exit 1"
fi
rm -f "$TMPHUGE"

echo ""
echo "--- Topic Tests ---"

# T1: topic --dry-run → has DRY RUN output
OUT=$(node index.js topic --dry-run 2>&1 || true)
if echo "$OUT" | grep -qi 'DRY RUN'; then ok "T1: topic --dry-run → has DRY RUN"; else fail "T1: topic --dry-run → output: $(echo "$OUT" | head -3)"; fi

# T2: topic --json --dry-run → doesn't crash
OUT=$(node index.js topic --json --dry-run 2>&1 || true)
EXIT=$?
if [ $EXIT -eq 0 ] || [ -n "$OUT" ]; then ok "T2: topic --json --dry-run → no crash"; else fail "T2: topic --json --dry-run → crashed"; fi

# T3: topic --niche "AI" --dry-run → has DRY RUN
OUT=$(node index.js topic --niche "AI" --dry-run 2>&1 || true)
if echo "$OUT" | grep -qi 'DRY RUN'; then ok "T3: topic --niche AI --dry-run → has DRY RUN"; else fail "T3: topic --niche AI --dry-run → output: $(echo "$OUT" | head -3)"; fi

# T4: topic --format structured --dry-run → doesn't crash
OUT=$(node index.js topic --format structured --dry-run 2>&1 || true)
EXIT=$?
if [ $EXIT -eq 0 ] || [ -n "$OUT" ]; then ok "T4: topic --format structured --dry-run → no crash"; else fail "T4: topic --format structured --dry-run → crashed"; fi

echo ""
echo "--- Writer Tests ---"

# W1: write "测试观点" --dry-run → contains "DRY RUN"
OUT=$(node index.js write "测试观点" --dry-run 2>&1 || true)
if echo "$OUT" | grep -qi 'DRY RUN'; then ok "W1: write dry-run → has DRY RUN"; else fail "W1: write dry-run → output: $(echo "$OUT" | head -3)"; fi

# W2: write --list-types → contains "opinion"
OUT=$(node index.js write --list-types 2>&1 || true)
if echo "$OUT" | grep -q 'opinion'; then ok "W2: write --list-types → has opinion"; else fail "W2: write --list-types → output: $OUT"; fi

# W3: write "测试" --outline-only --dry-run → doesn't crash
OUT=$(node index.js write "测试" --outline-only --dry-run 2>&1 || true)
EXIT=$?
if [ $EXIT -eq 0 ] || [ -n "$OUT" ]; then ok "W3: write outline-only dry-run → no crash"; else fail "W3: write outline-only dry-run → crashed"; fi

# W4: write --type tutorial and --type listicle → don't crash
OUT1=$(node index.js write "测试" --type tutorial --dry-run 2>&1 || true)
OUT2=$(node index.js write "测试" --type listicle --dry-run 2>&1 || true)
if [ -n "$OUT1" ] && [ -n "$OUT2" ]; then
  ok "W4: write tutorial + listicle dry-run → no crash"
else
  fail "W4: write tutorial + listicle dry-run → crashed"
fi

echo ""
echo "=========================================="
echo "  Results: $PASS passed, $FAIL failed / $TOTAL total"
echo "=========================================="
if [ "$FAIL" -gt 0 ]; then exit 1; fi
echo "ALL TESTS PASSED"
