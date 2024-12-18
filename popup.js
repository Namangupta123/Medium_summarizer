let user = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', async () => {
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const summarizeButton = document.getElementById('summarizeButton');
  const errorDiv = document.getElementById('error');
  
  // Check if user is already logged in
  chrome.storage.local.get(['user', 'authToken'], async (result) => {
    if (result.user && result.authToken) {
      user = result.user;
      authToken = result.authToken;
      await updateUsageCount();
      updateUI();
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
    authToken = token.token;
    
    chrome.storage.local.set({ 
      user: user,
      authToken: token.token
    });
    
    await updateUsageCount();
    updateUI();
  } catch (error) {
    showError('Login failed. Please try again.');
    console.error('Login failed:', error);
  }
}

function handleLogout() {
  chrome.identity.clearAllCachedAuthTokens();
  chrome.storage.local.remove(['user', 'authToken']);
  user = null;
  authToken = null;
  updateUI();
}

async function updateUsageCount() {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/user/summary-count', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch usage count');
    }
    
    const data = await response.json();
    const remainingUses = 5 - data.count;
    document.getElementById('remainingUses').textContent = remainingUses;
    
    return remainingUses;
  } catch (error) {
    console.error('Failed to fetch usage count:', error);
    return null;
  }
}

async function handleSummarize() {
  if (!user || !authToken) {
    showError('Please sign in first');
    return;
  }

  const summaryResult = document.getElementById('summaryResult');
  const errorDiv = document.getElementById('error');
  errorDiv.classList.add('hidden');

  const remainingUses = await updateUsageCount();
  
  if (remainingUses === 0) {
    showError('You have reached your daily limit. Please try again tomorrow.');
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
      await updateUsageCount(); // Refresh the count after successful summary
    }
  } catch (error) {
    showError('Failed to generate summary. Please try again.');
    console.error('Summarization failed:', error);
  } finally {
    summaryResult.classList.remove('loading');
  }
}

async function fetchSummary(content, token) {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Origin': chrome.runtime.getURL(''),
        'Accept': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (response.status === 429) {
      const data = await response.json();
      showError(data.error || 'Daily limit reached. Please try again tomorrow.');
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    throw new Error('Failed to fetch summary from server');
  }
}

function updateUI() {
  const loginSection = document.getElementById('loginSection');
  const mainSection = document.getElementById('mainSection');
  const userInfo = document.getElementById('userInfo');
  const errorDiv = document.getElementById('error');

  errorDiv.classList.add('hidden');

  if (user) {
    loginSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
    userInfo.textContent = `Signed in as ${user.email}`;
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