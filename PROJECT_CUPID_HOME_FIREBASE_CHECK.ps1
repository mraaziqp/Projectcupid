# ==============================================================================
# PROJECT CUPID — HOME FIREBASE EMULATOR PREREQUISITE CHECKER
# ==============================================================================
# This script verifies that your home workstation has all required dependencies
# to execute the Firebase Firestore Security Rules Emulator suite.
# It does NOT modify or deploy anything to production.
# ==============================================================================

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host "   PROJECT CUPID — HOME FIREBASE EMULATOR PREREQUISITE CHECK               " -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""

$AllChecksPassed = $true

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js runtime..." -NoNewline
try {
    $nodeVer = & node -v 2>$null
    if ($nodeVer) {
        Write-Host " OK ($nodeVer)" -ForegroundColor Green
    } else {
        Write-Host " FAILED (Node.js not found in PATH)" -ForegroundColor Red
        $AllChecksPassed = $false
    }
} catch {
    Write-Host " FAILED ($($_))" -ForegroundColor Red
    $AllChecksPassed = $false
}

# 2. Check Java (Firebase Emulator requires Java 11+)
Write-Host "[2/5] Checking Java runtime (requires Java 11+ for Firestore emulator)..." -NoNewline
try {
    $javaOutput = & java -version 2>&1 | Out-String
    if ($javaOutput -match 'version "(\d+)') {
        $majorVer = [int]$matches[1]
        if ($majorVer -eq 1 -and $javaOutput -match 'version "1\.(\d+)') {
            $majorVer = [int]$matches[1] # e.g. 1.8 -> 8
        }
        if ($majorVer -ge 11) {
            Write-Host " OK (Java $majorVer detected)" -ForegroundColor Green
        } else {
            Write-Host " WARNING (Java $majorVer detected; Java 11+ recommended)" -ForegroundColor Yellow
            Write-Host "      Download OpenJDK 17 or 21 from: https://adoptium.net/" -ForegroundColor Yellow
        }
    } else {
        Write-Host " FAILED (Java not found. Emulator requires Java 11+)" -ForegroundColor Red
        Write-Host "      Download OpenJDK 17 from: https://adoptium.net/" -ForegroundColor Yellow
        $AllChecksPassed = $false
    }
} catch {
    Write-Host " FAILED (Java not installed or not in PATH)" -ForegroundColor Red
    $AllChecksPassed = $false
}

# 3. Check Firebase CLI
Write-Host "[3/5] Checking Firebase CLI (firebase-tools)..." -NoNewline
try {
    $fbVer = & firebase --version 2>$null
    if ($fbVer) {
        Write-Host " OK ($fbVer)" -ForegroundColor Green
    } else {
        Write-Host " NOT DETECTED" -ForegroundColor Yellow
        Write-Host "      Install globally using: npm install -g firebase-tools" -ForegroundColor Yellow
        $AllChecksPassed = $false
    }
} catch {
    Write-Host " NOT DETECTED" -ForegroundColor Yellow
    Write-Host "      Install globally using: npm install -g firebase-tools" -ForegroundColor Yellow
    $AllChecksPassed = $false
}

# 4. Check @firebase/rules-unit-testing dependency
Write-Host "[4/5] Checking @firebase/rules-unit-testing package..." -NoNewline
$pkgPath = Join-Path $PSScriptRoot "node_modules\@firebase\rules-unit-testing"
if (Test-Path $pkgPath) {
    Write-Host " OK (Installed in node_modules)" -ForegroundColor Green
} else {
    Write-Host " NOT DETECTED" -ForegroundColor Yellow
    Write-Host "      Install via: npm install --save-dev @firebase/rules-unit-testing" -ForegroundColor Yellow
    $AllChecksPassed = $false
}

# 5. Check Port 8080 (Default Firestore emulator port)
Write-Host "[5/5] Checking port 8080 availability..." -NoNewline
try {
    $portActive = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
    if ($portActive) {
        Write-Host " BUSY (Port 8080 currently in use by process $($portActive.OwningProcess[0]))" -ForegroundColor Yellow
        Write-Host "      Please stop any existing service using port 8080 before running emulator." -ForegroundColor Yellow
    } else {
        Write-Host " OK (Port 8080 is available)" -ForegroundColor Green
    }
} catch {
    Write-Host " OK (Available)" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Cyan
if ($AllChecksPassed) {
    Write-Host " ALL CHECKS PASSED! Your workstation is ready to execute emulator tests." -ForegroundColor Green
    Write-Host " Run .\PROJECT_CUPID_HOME_FIREBASE_TEST.ps1 to start the test suite." -ForegroundColor Green
} else {
    Write-Host " ONE OR MORE PREREQUISITES ARE MISSING." -ForegroundColor Yellow
    Write-Host " Follow the instructions above, then rerun this script." -ForegroundColor Yellow
}
Write-Host "==========================================================================" -ForegroundColor Cyan
Write-Host ""
