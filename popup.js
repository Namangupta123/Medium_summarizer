document.addEventListener('DOMContentLoaded', async () => {
  const loginButton = document.getElementById('loginButton');
  const logoutButton = document.getElementById('logoutButton');
  const userInfo = document.getElementById('userInfo');
  const errorDiv = document.getElementById('error');
  const mainSection = document.getElementById('mainSection');
  const loginSection = document.getElementById('loginSection');

  // Check authentication and inject button if needed
  async function checkAndInjectButton() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && isMediumArticle(tab.url)) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: injectSummarizeButton,
      });
    }
  }

  // Check if current URL is a Medium article
  function isMediumArticle(url) {
    const mediumDomains = [
      'medium.com',
      'javascript.plainenglish.io',
      'towardsdatascience.com',
      'betterprogramming.pub',
      'levelup.gitconnected.com'
    ];
    return mediumDomains.some(domain => url.includes(domain));
  }

  // Handle login
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
      checkAndInjectButton();
    } catch (error) {
      showError('Login failed. Please try again.');
      console.error('Login failed:', error);
    }
  }

  // Handle logout
  function handleLogout() {
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        chrome.identity.removeCachedAuthToken({ token: result.authToken });
      }
      chrome.storage.local.remove(['user', 'authToken']);
      updateUI(null);
      removeInjectedContent();
    });
  }

  // Update UI based on auth state
  function updateUI(user) {
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

  // Show error message
  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
  }

  // Remove injected content
  async function removeInjectedContent() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          const container = document.querySelector('.medium-summarizer-container');
          if (container) container.remove();
        }
      });
    }
  }

  // Inject summarize button
  async function injectSummarizeButton() {
    const styles = `
      .medium-summarizer-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 16px;
      }
      .medium-summarizer-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 600;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .medium-summarizer-result {
        background-color: white;
        border-radius: 12px;
        padding: 20px;
        width: 400px;
        max-height: 500px;
        overflow-y: auto;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      }
      .summary-content { margin-bottom: 16px; }
      .summary-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
      }
      .error-message {
        color: #ef4444;
        background-color: #fee2e2;
        padding: 12px;
        border-radius: 8px;
      }
      .hidden { display: none; }
    `;

    // Add styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    // Create button container
    const container = document.createElement('div');
    container.className = 'medium-summarizer-container';
    container.innerHTML = `
      <button class="medium-summarizer-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h8"/>
        </svg>
        Summarize Article
      </button>
      <div class="medium-summarizer-result hidden">
        <div class="summary-content"></div>
        <div class="summary-footer">
          <span class="remaining-uses"></span>
          <button onclick="this.closest('.medium-summarizer-result').classList.add('hidden')">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Add click handler
    container.querySelector('.medium-summarizer-btn').addEventListener('click', async () => {
      const resultDiv = container.querySelector('.medium-summarizer-result');
      const summaryContent = resultDiv.querySelector('.summary-content');
      resultDiv.classList.remove('hidden');

      try {
        const article = document.querySelector('article');
        if (!article) throw new Error('No article content found');

        const articleText = article.innerText
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (!articleText) throw new Error('No article content found');

        summaryContent.innerHTML = 'Generating summary...';

        const response = await fetch('https://summarizer-medium-naman.vercel.app/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          credentials: 'include',
          mode: 'cors',
          body: JSON.stringify({ 
            content: articleText,
            url: window.location.href
          })
        });

        if (!response.ok) {
          throw new Error(response.status === 429 
            ? 'Daily limit reached. Please try again tomorrow.'
            : 'Failed to generate summary');
        }

        const data = await response.json();
        if (!data.summary) throw new Error('No summary received');

        summaryContent.innerHTML = `<p>${data.summary}</p>`;

        // Update remaining uses
        const usageResponse = await fetch('https://summarizer-medium-naman.vercel.app/user/summary-count', {
          headers: {
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          credentials: 'include',
          mode: 'cors'
        });

        if (usageResponse.ok) {
          const usageData = await usageResponse.json();
          container.querySelector('.remaining-uses').textContent = 
            `Remaining uses: ${usageData.remaining}`;
        }
      } catch (error) {
        summaryContent.innerHTML = `<p class="error-message">${error.message}</p>`;
      }
    });
  }

  // Add event listeners
  loginButton.addEventListener('click', handleLogin);
  logoutButton.addEventListener('click', handleLogout);

  // Check initial auth state
  chrome.storage.local.get(['user', 'authToken'], (result) => {
    if (result.user && result.authToken) {
      updateUI(result.user);
      checkAndInjectButton();
    }
  });
});