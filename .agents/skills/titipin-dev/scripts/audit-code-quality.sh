#!/usr/bin/env bash
set -e

echo "=== TITIPIN CODE QUALITY & COMPLIANCE AUDIT ==="

# 1. Audit for Forbidden Raw SVG / Inline SVG / Emoji Icons in Frontend
echo "🔍 [1/4] Auditing Frontend for raw SVG / emoji icons..."
if grep -rn "<svg" apps/frontend/src/ 2>/dev/null; then
  echo "❌ FAILED: Raw inline <svg> found in frontend! Only use 'lucide-react'."
  exit 1
else
  echo "✅ PASSED: No raw inline <svg> found."
fi

# 2. Run Linting across Monorepo
echo "🔍 [2/4] Running ESLint 9 Flat Config across workspace..."
pnpm turbo lint

# 3. Run TypeScript Typechecking
echo "🔍 [3/4] Running strict TypeScript typechecks..."
pnpm turbo typecheck

# 4. Run Automated Test Suites
echo "🔍 [4/4] Running automated test suites..."
pnpm turbo test

echo "🎉 ALL CODE QUALITY & COMPLIANCE CHECKS PASSED!"
