# Cursor Token Prices Chrome Extension

Shows the actual API costs on the Cursor Usage page – even when included in your current plan.

## Features

- **Real costs**: Displays `totalCents` from the Cursor API
- **"Included" usage**: Works with `USAGE_EVENT_KIND_INCLUDED_IN_ULTRA` and other plans
- **Hover details**: Shows Input/Output/Cache tokens on mouseover
<img width="986" height="1053" alt="image" src="https://github.com/user-attachments/assets/c5f95548-41bd-48e2-9874-6d4f2a2391ed" />

## Installation

1. Reload extension at `chrome://extensions/` (🔄 button)
2. Hard-reload the [Cursor Usage page](https://cursor.com/dashboard?tab=usage) with `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Costs are displayed directly in the usage table

## Debugging

```javascript
// Check if data is available in DevTools Console:
window.__cursorUsageData
```

## Files

| File | Purpose |
|------|---------|
| `inject.js` | Intercepts Fetch/XHR in the page |
| `content.js` | Receives data and displays costs in the table |
| `styles.css` | Styling for the cost badges |

## License

MIT License
