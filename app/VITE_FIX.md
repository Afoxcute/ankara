# Vite Dynamic Import Fix

## Problem

Vite was failing to load dynamically imported modules from thirdweb, specifically:
```
Failed to fetch dynamically imported module: InAppWalletSelectionUI-CTRQA5K7.js
```

## Solution

1. **Updated `vite.config.ts`**:
   - Added `thirdweb` packages to `optimizeDeps.include`
   - Configured manual chunks for better code splitting
   - Added server filesystem permissions

2. **Cleared Vite cache**:
   - Removed `node_modules/.vite` directory to force re-optimization

## Next Steps

1. **Restart the dev server**:
   ```bash
   cd app
   yarn dev
   ```

2. **If the issue persists**, try:
   ```bash
   # Clear cache again
   rm -rf node_modules/.vite
   
   # Reinstall dependencies
   yarn install
   
   # Restart dev server
   yarn dev
   ```

## Alternative Solution (if above doesn't work)

If the issue continues, you can try disabling optimization for thirdweb:

```typescript
optimizeDeps: {
  exclude: ['thirdweb'],
},
```

However, this may slow down initial load times.





