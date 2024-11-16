chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'checkAuth') {
    chrome.storage.local.get(['user', 'authToken'], (result) => {
      sendResponse({
        isAuthenticated: !!(result.user && result.authToken),
        user: result.user,
        authToken: result.authToken
      });
    });
    return true;
  }
});