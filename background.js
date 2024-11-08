chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // This listener is no longer needed as we're handling everything in popup.js
  return true;
});