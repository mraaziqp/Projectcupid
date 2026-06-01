#!/bin/bash

# Project Cupid Notification System Test Script
# This script tests the bulletproof notification delivery system

set -e

echo "🔔 Project Cupid Notification Test Suite"
echo "========================================"
echo ""

# Configuration
API_BASE="http://localhost:3000/api"
TEST_FCM_TOKEN="test-fcm-token-12345"
TEST_EMAIL="test@example.com"
TEST_TITLE="Test Notification"
TEST_BODY="This is a test notification message"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to pretty-print responses
pretty_json() {
  echo "$1" | jq '.' 2>/dev/null || echo "$1"
}

# Test 1: Check if server is healthy
echo -e "${YELLOW}Test 1: Server Health Check${NC}"
if curl -s "$API_BASE/health" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${RED}✗ Server is not responding${NC}"
  echo "  Make sure to run: npm run dev"
  exit 1
fi
echo ""

# Test 2: Test legacy /api/notify endpoint (FCM only)
echo -e "${YELLOW}Test 2: Legacy FCM Endpoint (/api/notify)${NC}"
RESPONSE=$(curl -s -X POST "$API_BASE/notify" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TEST_FCM_TOKEN\",\"title\":\"$TEST_TITLE\",\"body\":\"$TEST_BODY\"}")

if echo "$RESPONSE" | grep -q '"success"'; then
  echo -e "${GREEN}✓ Endpoint accepted request${NC}"
  echo "  Response: $(pretty_json "$RESPONSE")"
else
  echo -e "${YELLOW}⚠ Expected Firebase to be misconfigured${NC}"
  echo "  Response: $(pretty_json "$RESPONSE")"
fi
echo ""

# Test 3: Test robust endpoint with both FCM and email
echo -e "${YELLOW}Test 3: Robust Endpoint (/api/notify-robust)${NC}"
RESPONSE=$(curl -s -X POST "$API_BASE/notify-robust" \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TEST_FCM_TOKEN\",\"email\":\"$TEST_EMAIL\",\"title\":\"$TEST_TITLE\",\"body\":\"$TEST_BODY\",\"recipientName\":\"Beloved\"}")

if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>/dev/null; then
  echo -e "${GREEN}✓ Robust endpoint succeeded${NC}"
  echo "  Response: $(pretty_json "$RESPONSE")"

  # Check delivery channels
  if echo "$RESPONSE" | grep -q '"success":true.*"success":true'; then
    echo -e "${GREEN}  ✓ Both FCM and email channels available${NC}"
  elif echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${YELLOW}  ⚠ At least one channel succeeded${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No delivery channels available (expected)${NC}"
  echo "  To enable: set RESEND_API_KEY and FIREBASE_SERVICE_ACCOUNT env vars"
  echo "  Response: $(pretty_json "$RESPONSE")"
fi
echo ""

# Test 4: Test error handling - missing parameters
echo -e "${YELLOW}Test 4: Error Handling - Missing Parameters${NC}"
RESPONSE=$(curl -s -X POST "$API_BASE/notify-robust" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"$TEST_TITLE\"}")

if echo "$RESPONSE" | grep -q 'error'; then
  echo -e "${GREEN}✓ Properly validates required fields${NC}"
  echo "  Error message: $(echo "$RESPONSE" | jq '.error' 2>/dev/null || echo "$RESPONSE")"
else
  echo -e "${RED}✗ Should have returned error for missing fields${NC}"
fi
echo ""

# Test 5: Test method validation
echo -e "${YELLOW}Test 5: HTTP Method Validation${NC}"
RESPONSE=$(curl -s -X GET "$API_BASE/notify-robust" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "Method not allowed\|405"; then
  echo -e "${GREEN}✓ Properly rejects GET requests${NC}"
else
  echo -e "${YELLOW}⚠ Endpoint accepted GET (expected POST only)${NC}"
fi
echo ""

echo "========================================"
echo -e "${GREEN}Notification System Tests Complete!${NC}"
echo ""
echo "To fully test notifications in the UI:"
echo "1. Open http://localhost:3000 in two browser windows"
echo "2. User A: Grant notification permission"
echo "3. User B: Send a letter/message"
echo "4. Verify notification appears for User A"
echo ""
echo "For detailed testing guide, see: NOTIFICATION_TESTING_GUIDE.md"
