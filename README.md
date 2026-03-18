# feedpoli

A minimal browser extension named **Clipboard Smiley**.

## What it does
- Opens a playful floating clipboard manager directly on the current page when the extension button is clicked.
- Lets you drag highlighted text onto a smiley face to save snippets.
- Persists saved text in `chrome.storage.local` under `clipboard_items`.
- Lets you click any saved snippet to copy it back to the clipboard.
- Stays open even if you click elsewhere on the page, changes to an `O` mouth while “eating” dragged text, and fully disappears when closed.
- Syncs open/closed state across pages through `chrome.storage.local`, and remembers where it was dragged.

## Files
- `manifest.json` – Manifest V3 configuration for the action button, background worker, content script, and permissions.
- `background.js` – Toggles the in-page panel globally by updating extension storage.
- `content.js` – Builds the floating modal and handles drag/drop, storage, copy, animation state, and cross-page panel visibility sync.
- `styles.css` – Scoped styles and smiley animations for the injected floating panel.
- `icon.svg` – Simple smiley icon.
