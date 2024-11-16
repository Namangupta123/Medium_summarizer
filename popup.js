document.addEventListener('DOMContentLoaded', async () => {
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const userInfo = document.getElementById('userInfo');
  const errorDiv = document.getElementById('error');
  const mainSection = document.getElementById('mainSection');
  const loginSection = document.getElementById('loginSection');
  
  // Check if user is already logged in
  chrome.storage.local.get(['user', 'authToken'], (result) => {
    if (result.user && result.authToken) {
      updateUI(result.user);
    }
  });

  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);
});

async function handleLogin() {
  try {
    const response = await chrome.identity.getAuthToken({ interactive: true });
    const authToken = response.token;
    
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }
    
    const user = await userInfoResponse.json();
    
    chrome.storage.local.set({ 
      user: user,
      authToken: authToken
    });
    
    updateUI(user);
  } catch (error) {
    showError('Login failed. Please try again.');
    console.error('Login failed:', error);
  }
}

function handleLogout() {
  chrome.storage.local.get(['authToken'], (result) => {
    if (result.authToken) {
      chrome.identity.removeCachedAuthToken({ token: result.authToken });
    }
    chrome.storage.local.remove(['user', 'authToken']);
    updateUI(null);
  });
}

function updateUI(user) {
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