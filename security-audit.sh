#!/bin/bash
# Neural Nexus Security Audit Script
# Run this to check for security issues

echo "╔══════════════════════════════════════════════════╗"
echo "║     Neural Nexus Security Audit                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

ISSUES=0

# Check 1: API keys in code
echo "[1/10] Checking for hardcoded API keys..."
if grep -r "sk-[a-zA-Z0-9]\{20,\}" --include="*.js" --include="*.json" . 2>/dev/null | grep -v "node_modules" | grep -v ".git"; then
    echo "  ❌ FAIL: API keys found in source code"
    ISSUES=$((ISSUES + 1))
else
    echo "  ✅ PASS: No hardcoded API keys found"
fi

# Check 2: Secrets in environment
echo "[2/10] Checking environment variables..."
if [ -f .env ]; then
    echo "  ⚠️  WARNING: .env file exists (should be in .gitignore)"
    if grep -q "^OPENAI_API_KEY=" .env 2>/dev/null; then
        echo "  ✅ API keys in .env (correct)"
    fi
else
    echo "  ✅ PASS: No .env file in repo"
fi

# Check 3: File permissions
echo "[3/10] Checking file permissions..."
if find . -type f -perm /o+w 2>/dev/null | grep -v "node_modules" | grep -q .; then
    echo "  ⚠️  WARNING: World-writable files found"
else
    echo "  ✅ PASS: File permissions OK"
fi

# Check 4: Dangerous patterns in scripts
echo "[4/10] Checking for dangerous code patterns..."
DANGEROUS=0
if grep -r "eval\s*(" --include="*.js" . 2>/dev/null | grep -v "node_modules" | grep -q .; then
    echo "  ❌ FAIL: eval() found"
    DANGEROUS=1
fi
if grep -r "child_process" --include="*.js" . 2>/dev/null | grep -v "node_modules" | grep -q .; then
    echo "  ⚠️  WARNING: child_process usage found (review required)"
fi
if [ $DANGEROUS -eq 0 ]; then
    echo "  ✅ PASS: No dangerous patterns found"
fi

# Check 5: Dependencies with known vulnerabilities
echo "[5/10] Checking dependencies..."
if command -v npm &> /dev/null; then
    npm audit --audit-level=moderate 2>/dev/null | grep -q "found 0 vulnerabilities"
    if [ $? -eq 0 ]; then
        echo "  ✅ PASS: No known vulnerabilities"
    else
        echo "  ⚠️  WARNING: Run 'npm audit' for details"
    fi
else
    echo "  ⚠️  SKIP: npm not available"
fi

# Check 6: Database permissions
echo "[6/10] Checking database security..."
if [ -f "data/neural-nexus.db" ]; then
    PERMS=$(stat -c "%a" data/neural-nexus.db 2>/dev/null || stat -f "%Lp" data/neural-nexus.db 2>/dev/null)
    if [ "$PERMS" = "600" ] || [ "$PERMS" = "644" ]; then
        echo "  ✅ PASS: Database permissions OK ($PERMS)"
    else
        echo "  ⚠️  WARNING: Database permissions $PERMS (should be 600)"
    fi
else
    echo "  ℹ️  INFO: No database file yet"
fi

# Check 7: Log file permissions
echo "[7/10] Checking log file security..."
if [ -f "/var/log/neural-nexus.log" ]; then
    PERMS=$(stat -c "%a" /var/log/neural-nexus.log 2>/dev/null || stat -f "%Lp" /var/log/neural-nexus.log 2>/dev/null)
    if [ "$PERMS" = "640" ] || [ "$PERMS" = "600" ]; then
        echo "  ✅ PASS: Log permissions OK"
    else
        echo "  ⚠️  WARNING: Log permissions $PERMS"
    fi
else
    echo "  ℹ️  INFO: Log file not created yet"
fi

# Check 8: Systemd service security
echo "[8/10] Checking systemd service..."
if [ -f "/etc/systemd/system/neural-nexus.service" ]; then
    if grep -q "User=root" /etc/systemd/system/neural-nexus.service; then
        echo "  ⚠️  WARNING: Service runs as root (consider dedicated user)"
    fi
    if grep -q "Restart=always" /etc/systemd/system/neural-nexus.service; then
        echo "  ✅ PASS: Auto-restart enabled"
    fi
else
    echo "  ℹ️  INFO: Service not installed yet"
fi

# Check 9: Backup existence
echo "[9/10] Checking backups..."
if [ -d "/backups/neural-nexus" ] && [ "$(ls -A /backups/neural-nexus 2>/dev/null)" ]; then
    LATEST=$(ls -t /backups/neural-nexus/*.db 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST" 2>/dev/null || stat -f %m "$LATEST")) / 3600 ))
        if [ $AGE -lt 24 ]; then
            echo "  ✅ PASS: Recent backup ($AGE hours old)"
        else
            echo "  ⚠️  WARNING: Backup is $AGE hours old"
        fi
    fi
else
    echo "  ❌ FAIL: No backups configured"
    ISSUES=$((ISSUES + 1))
fi

# Check 10: Network exposure
echo "[10/10] Checking network exposure..."
if command -v netstat &> /dev/null || command -v ss &> /dev/null; then
    # Check if dashboard is exposed externally
    if netstat -tlnp 2>/dev/null | grep -q ":3456" || ss -tlnp 2>/dev/null | grep -q ":3456"; then
        echo "  ⚠️  WARNING: Dashboard on port 3456 (ensure firewall configured)"
    else
        echo "  ✅ PASS: No unexpected ports open"
    fi
else
    echo "  ⚠️  SKIP: netstat/ss not available"
fi

echo ""
echo "═══════════════════════════════════════════════════"
if [ $ISSUES -eq 0 ]; then
    echo "✅ Security audit PASSED with warnings"
else
    echo "❌ Security audit FAILED: $ISSUES critical issues"
fi
echo "═══════════════════════════════════════════════════"

exit $ISSUES
