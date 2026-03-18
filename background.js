chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'clipboard-smiley/toggle' });
  } catch (error) {
    console.error('Unable to toggle Clipboard Smiley on this tab.', error);
  }
});
