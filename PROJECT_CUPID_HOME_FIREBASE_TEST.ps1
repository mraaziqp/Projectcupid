# ==============================================================================
# PROJECT CUPID — HOME FIREBASE EMULATOR SECURITY RULES TEST RUNNER
# ==============================================================================
# This script launches the local Firestore Emulator and executes the
# comprehensive security acceptance test suite against firestore.rules.
# It tests against project studio-9165894196-8cf76 in full isolation.
# It does NOT modify or deploy anything to production cloud databases.
# ==============================================================================

param (
    [switch]$SkipCheck
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Magenta
Write-Host "   PROJECT CUPID — LOCAL FIREBASE RULES EMULATOR TEST SUITE              " -ForegroundColor Magenta
Write-Host "==========================================================================" -ForegroundColor Magenta
Write-Host ""

# Run prerequisite check first unless skipped
if (-not $SkipCheck) {
    Write-Host "Verifying workstation readiness..." -ForegroundColor Cyan
    & "$PSScriptRoot\PROJECT_CUPID_HOME_FIREBASE_CHECK.ps1"
}

# Verify rules exist
$rulesPath = Join-Path $PSScriptRoot "firestore.rules"
if (-not (Test-Path $rulesPath)) {
    Write-Error "CRITICAL: firestore.rules not found at $rulesPath"
    exit 1
}

Write-Host "Starting Firestore Emulator and executing tests..." -ForegroundColor Cyan
Write-Host "Command: firebase emulators:exec --only firestore 'npx tsx tests/firebase_rules_emulator.test.ts' --project studio-9165894196-8cf76" -ForegroundColor Gray
Write-Host ""

try {
    # Run the emulator with test runner
    & firebase emulators:exec --only firestore "npx tsx tests/firebase_rules_emulator.test.ts" --project studio-9165894196-8cf76
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "==========================================================================" -ForegroundColor Green
        Write-Host "   EMULATOR VERIFICATION COMPLETE: ALL SECURITY RULES TESTS PASSED!       " -ForegroundColor Green
        Write-Host "==========================================================================" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host "   EMULATOR VERIFICATION FAILED: One or more security tests did not pass. " -ForegroundColor Red
        Write-Host "==========================================================================" -ForegroundColor Red
        Write-Host ""
        exit $LASTEXITCODE
    }
} catch {
    Write-Host ""
    Write-Host "Error launching Firebase Emulator: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common Fixes:" -ForegroundColor Yellow
    Write-Host "  1. Ensure Java 11+ is installed (Adoptium Temurin 17 or 21)" -ForegroundColor Yellow
    Write-Host "  2. Install firebase-tools: npm install -g firebase-tools" -ForegroundColor Yellow
    Write-Host "  3. Install test library: npm install --save-dev @firebase/rules-unit-testing" -ForegroundColor Yellow
    exit 1
}
