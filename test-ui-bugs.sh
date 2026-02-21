#!/bin/bash
# Integration test script for UI bug fixes v0.4.0
# Tests all UI bug fixes via curl

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:8080}"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
  echo -e "${GREEN}PASS${NC}: $1"
  ((PASS++))
}

fail() {
  echo -e "${RED}FAIL${NC}: $1"
  ((FAIL++))
}

info() {
  echo -e "${YELLOW}INFO${NC}: $1"
}

echo "=========================================="
echo "UI Bug Fixes v0.4.0 - Integration Tests"
echo "=========================================="
echo "Testing against: $BASE_URL"
echo ""

# Test 1: About page has required update elements
info "Testing Bug 1 & 6: About page update elements..."
ABOUT_PAGE=$(curl -s "$BASE_URL/about" 2>/dev/null || echo "CURL_FAILED")
if [[ "$ABOUT_PAGE" == "CURL_FAILED" ]]; then
  fail "About page - Could not connect to server"
else
  if echo "$ABOUT_PAGE" | grep -q 'id="updateStatusCard"'; then
    pass "About page has updateStatusCard element"
  else
    fail "About page missing updateStatusCard element"
  fi

  if echo "$ABOUT_PAGE" | grep -q 'id="updateStatusContent"'; then
    pass "About page has updateStatusContent element"
  else
    fail "About page missing updateStatusContent element"
  fi

  if echo "$ABOUT_PAGE" | grep -q 'id="progressCard"'; then
    pass "About page has progressCard element"
  else
    fail "About page missing progressCard element"
  fi

  if echo "$ABOUT_PAGE" | grep -q 'id="progressBar"'; then
    pass "About page has progressBar element"
  else
    fail "About page missing progressBar element"
  fi
fi
echo ""

# Test 2: VPN auth status accepts token parameter
info "Testing Bug 2: VPN authentication with token..."
# First, login to get a token
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"password":"nguard-vpn-access"}' \
  "$BASE_URL/api/vpn/auth/login" 2>/dev/null || echo '{"error":"CURL_FAILED"}')

if echo "$LOGIN_RESPONSE" | grep -q "CURL_FAILED"; then
  fail "VPN login - Could not connect to server"
else
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  if [[ -n "$TOKEN" ]]; then
    pass "VPN login returns token"

    # Test auth status with token
    AUTH_STATUS=$(curl -s "$BASE_URL/api/vpn/auth/status?token=$TOKEN" 2>/dev/null || echo '{"error":"CURL_FAILED"}')
    if echo "$AUTH_STATUS" | grep -q '"authenticated":true'; then
      pass "Auth status with token returns authenticated=true"
    else
      fail "Auth status with token does not return authenticated=true"
    fi
  else
    info "VPN login did not return token (may need correct password or VPN not configured)"
  fi
fi
echo ""

# Test 3: VPN status endpoint returns endpoint info
info "Testing Bug 3: VPN status endpoint..."
VPN_STATUS=$(curl -s "$BASE_URL/api/vpn/status" 2>/dev/null || echo '{"error":"CURL_FAILED"}')
if echo "$VPN_STATUS" | grep -q "CURL_FAILED"; then
  fail "VPN status - Could not connect to server"
else
  if echo "$VPN_STATUS" | grep -q '"endpoint"'; then
    pass "VPN status returns endpoint field"
  else
    fail "VPN status missing endpoint field"
  fi
fi
echo ""

# Test 4: VPN setup page has instruction panels
info "Testing Bug 5: VPN setup instruction panels..."
VPN_SETUP=$(curl -s "$BASE_URL/vpn-setup" 2>/dev/null || echo "CURL_FAILED")
if [[ "$VPN_SETUP" == "CURL_FAILED" ]]; then
  fail "VPN setup page - Could not connect to server"
else
  if echo "$VPN_SETUP" | grep -q 'id="instructions-ios"'; then
    pass "VPN setup has iOS instruction panel"
  else
    fail "VPN setup missing iOS instruction panel"
  fi

  if echo "$VPN_SETUP" | grep -q 'id="instructions-android"'; then
    pass "VPN setup has Android instruction panel"
  else
    fail "VPN setup missing Android instruction panel"
  fi

  if echo "$VPN_SETUP" | grep -q "showInstructions('ios')"; then
    pass "VPN setup has iOS showInstructions call"
  else
    fail "VPN setup missing iOS showInstructions call"
  fi
fi
echo ""

# Test 5: System status endpoint with timeout
info "Testing Bug 7: System status with timeout..."
STATUS_RESPONSE=$(curl -s --max-time 15 "$BASE_URL/api/system/status" 2>/dev/null)
if [[ $? -eq 0 ]]; then
  pass "System status responds within timeout"
else
  fail "System status timed out or failed"
fi

# Test 6: Status page has abort controller
info "Testing Bug 7: Status page abort controller..."
STATUS_PAGE=$(curl -s "$BASE_URL/status" 2>/dev/null || echo "CURL_FAILED")
if [[ "$STATUS_PAGE" == "CURL_FAILED" ]]; then
  fail "Status page - Could not connect to server"
else
  if echo "$STATUS_PAGE" | grep -q 'AbortController'; then
    pass "Status page has AbortController"
  else
    fail "Status page missing AbortController"
  fi

  if echo "$STATUS_PAGE" | grep -q 'showErrorState'; then
    pass "Status page has showErrorState function"
  else
    fail "Status page missing showErrorState function"
  fi

  if echo "$STATUS_PAGE" | grep -q 'Retry'; then
    pass "Status page has Retry button in error state"
  else
    fail "Status page missing Retry button"
  fi
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed${NC}: $PASS"
echo -e "${RED}Failed${NC}: $FAIL"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
