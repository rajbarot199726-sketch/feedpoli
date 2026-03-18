const PANEL_ENABLED_KEY = 'clipboard_modal_enabled';

chrome.action.onClicked.addListener(async () => {
  try {
    const stored = await chrome.storage.local.get(PANEL_ENABLED_KEY);
    const currentlyEnabled = stored[PANEL_ENABLED_KEY] !== false;

    await chrome.storage.local.set({
      [PANEL_ENABLED_KEY]: !currentlyEnabled
    });
  } catch (error) {
    console.error('Unable to toggle Clipboard Smiley.', error);
  }
});
