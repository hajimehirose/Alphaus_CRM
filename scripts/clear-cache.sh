#!/bin/bash
# Clear Next.js build cache and restart

echo "Clearing Next.js build cache..."
rm -rf .next
echo "✓ Cache cleared"

echo ""
echo "To restart dev server, run: npm run dev"
echo "Then hard refresh your browser: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)"

