let user = null;
let authToken = null;
const client_id="218659612489-o0dfka4c7ujh31najnvjn4mffui09h03.apps.googleusercontent.com";

document.addEventListener('DOMContentLoaded', async () => {
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const summarizeButton = document.getElementById('summarizeButton');
  const errorDiv = document.getElementById('error');
  
  // Check if user is already logged in
  chrome.storage.local.get(['user', 'usageCount', 'authToken'], (result) => {
    if (result.user && result.authToken) {
      user = result.user;
      authToken = result.authToken;
      updateUI(result.usageCount || 0);
    }
  });

  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
  summarizeButton.addEventListener('click', handleSummarize);
});

async function handleLogin() {
  try {
    const token = await chrome.identity.getAuthToken({ interactive: true });
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.token}` }
    });
    user = await response.json();
    authToken = token;
    chrome.storage.local.set({ 
      user: user,
      usageCount: 0,
      authToken: token
    });
    
    updateUI(0);
  } catch (error) {
    showError('Login failed. Please try again.');
    console.error('Login failed:', error);
  }
}

function handleLogout() {
  chrome.identity.clearAllCachedAuthTokens();
  chrome.storage.local.remove(['user', 'usageCount', 'authToken']);
  user = null;
  authToken = null;
  updateUI(0);
}

async function handleSummarize() {
  if (!user || !authToken) {
    showError('Please sign in first');
    return;
  }

  const summaryResult = document.getElementById('summaryResult');
  const errorDiv = document.getElementById('error');
  errorDiv.classList.add('hidden');

  chrome.storage.local.get(['usageCount'], async (result) => {
    const currentCount = result.usageCount || 0;
    
    if (currentCount >= 5) {
      showError('You have reached your usage limit');
      return;
    }

    summaryResult.textContent = 'Generating summary...';
    summaryResult.classList.add('loading');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => document.body.innerText
      });

      const content = results[0].result;
      const summary = await fetchSummary(content, authToken);

      if (summary) {
        summaryResult.textContent = summary;
        const newCount = currentCount + 1;
        chrome.storage.local.set({ usageCount: newCount });
        updateUI(newCount);
      }
    } catch (error) {
      showError('Failed to generate summary. Please try again.');
      console.error('Summarization failed:', error);
    } finally {
      summaryResult.classList.remove('loading');
    }
  });
}

async function fetchSummary(content, token) {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/summarize', {
      method: ['POST', 'OPTIONS'],
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.token}`
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    throw new Error('Failed to fetch summary from server');
  }
}

function updateUI(usageCount) {
  const loginSection = document.getElementById('loginSection');
  const mainSection = document.getElementById('mainSection');
  const userInfo = document.getElementById('userInfo');
  const remainingUses = document.getElementById('remainingUses');
  const errorDiv = document.getElementById('error');

  errorDiv.classList.add('hidden');

  if (user) {
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    userInfo.textContent = `Signed in as ${user.email}`;
    remainingUses.textContent = 5 - usageCount;
  } else {
    loginSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
}