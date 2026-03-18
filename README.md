# feedpoli

A minimal browser extension named **Clipboard Smiley**.

## What it does
- Opens a playful clipboard manager popup by default.
- Lets you drag highlighted text onto a smiley face to save snippets.
- Persists saved text in `localStorage` under `clipboard_items`.
- Lets you click any saved snippet to copy it back to the clipboard.
- Remembers whether the modal was closed and where it was dragged.

## Files
- `manifest.json` – Manifest V3 configuration for the extension popup and permissions.
- `popup.html` – Popup UI markup.
- `popup.js` – Drag/drop, persistence, copy, and modal state logic.
- `styles.css` – Minimal styles and smiley animations.
- `icon.svg` – Simple smiley icon.
