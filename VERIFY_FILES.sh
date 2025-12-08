#!/bin/bash
echo "=== FILE VERIFICATION ==="
echo ""
echo "Checking app.js..."
if grep -q "console.log" app.js; then
    echo "❌ WRONG FILE - app.js contains console.log"
else
    echo "✅ CORRECT - app.js is clean"
fi

echo ""
echo "Checking POS.html..."
if grep -q "Attempting to load CSS" POS.html; then
    echo "❌ WRONG FILE - POS.html contains CSS loading logs"
else
    echo "✅ CORRECT - POS.html is clean"
fi

if grep -q "pos-styles.css" POS.html; then
    echo "❌ WRONG FILE - POS.html references old pos-styles.css"
else
    echo "✅ CORRECT - POS.html uses new modular CSS files"
fi

echo ""
echo "Checking for new CSS files..."
for file in pos-base.css pos-sidebar.css pos-main.css pos-products.css pos-cart.css; do
    if [ -f "css/$file" ]; then
        echo "✅ Found css/$file"
    else
        echo "❌ MISSING css/$file"
    fi
done
