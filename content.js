let authToken = null;
let user = null;

// Check authentication status when content script loads
chrome.storage.local.get(['user', 'authToken'], (result) => {
  if (result.user && result.authToken) {
    user = result.user;
    authToken = result.authToken;
    injectSummarizeButton();
  }
});

// Listen for authentication changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.user || changes.authToken) {
    chrome.storage.local.get(['user', 'authToken'], (result) => {
      user = result.user;
      authToken = result.authToken;
      if (user && authToken) {
        injectSummarizeButton();
      } else {
        removeSummarizeButton();
      }
    });
  }
});

// Observe DOM changes to handle dynamic content loading
const observer = new MutationObserver((mutations) => {
  if (document.querySelector('article') && !document.getElementById('medium-summarizer-btn')) {
    injectSummarizeButton();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

function injectSummarizeButton() {
  if (document.getElementById('medium-summarizer-btn')) return;

  // Wait for article to be available
  const article = document.querySelector('article');
  if (!article) return;

  const container = document.createElement('div');
  container.className = 'medium-summarizer-container';
  container.innerHTML = `
    <button id="medium-summarizer-btn" class="medium-summarizer-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6H20M4 12H20M4 18H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Summarize Article
    </button>
    <div id="medium-summarizer-result" class="medium-summarizer-result hidden">
      <div class="summary-content"></div>
      <div class="summary-footer">
        <span class="remaining-uses"></span>
        <button class="close-summary">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  document.getElementById('medium-summarizer-btn').addEventListener('click', handleSummarize);
  document.querySelector('.close-summary').addEventListener('click', () => {
    document.getElementById('medium-summarizer-result').classList.add('hidden');
  });
}

function removeSummarizeButton() {
  const container = document.querySelector('.medium-summarizer-container');
  if (container) {
    container.remove();
  }
}

async function handleSummarize() {
  const resultDiv = document.getElementById('medium-summarizer-result');
  const summaryContent = resultDiv.querySelector('.summary-content');
  const remainingUsesSpan = resultDiv.querySelector('.remaining-uses');

  summaryContent.textContent = 'Generating summary...';
  resultDiv.classList.remove('hidden');

  try {
    // Get article content
    const article = document.querySelector('article');
    if (!article) {
      throw new Error('No article content found');
    }

    // Clean the article text
    const articleText = article.innerText
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!articleText) {
      throw new Error('No article content found');
    }

    const summary = await fetchSummary(articleText);
    
    if (summary) {
      summaryContent.innerHTML = `<p>${summary}</p>`;
      const remainingUses = await updateUsageCount();
      if (remainingUses !== null) {
        remainingUsesSpan.textContent = `Remaining uses: ${remainingUses}`;
      }
    }
  } catch (error) {
    summaryContent.innerHTML = `<p class="error-message">${error.message || 'Failed to generate summary. Please try again.'}</p>`;
    console.error('Summarization failed:', error);
  }
}

async function updateUsageCount() {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/api/user/summary-count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch usage count');
    }
    
    const data = await response.json();
    return data.remaining;
  } catch (error) {
    console.error('Failed to fetch usage count:', error);
    return null;
  }
}

async function fetchSummary(content) {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/api/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Accept': 'application/json',
        'Origin': window.location.origin
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ 
        content,
        url: window.location.href
      })
    });

    if (response.status === 429) {
      throw new Error('Daily limit reached. Please try again tomorrow.');
    }

    if (!response.ok) {
      throw new Error(`Failed to generate summary (${response.status})`);
    }

    const data = await response.json();
    if (!data.summary) {
      throw new Error('No summary received from server');
    }

    return data.summary;
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch summary from server');
  }
}