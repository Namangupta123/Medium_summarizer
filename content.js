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

function injectSummarizeButton() {
  if (document.getElementById('medium-summarizer-btn')) return;

  const articleContent = document.querySelector('article');
  if (!articleContent) return;

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

  articleContent.parentElement.insertBefore(container, articleContent);

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
    const remainingUses = await updateUsageCount(authToken);
    
    if (remainingUses === 0) {
      summaryContent.textContent = 'You have reached your daily limit. Please try again tomorrow.';
      return;
    }

    const articleContent = document.querySelector('article').innerText;
    const summary = await fetchSummary(articleContent, authToken);

    if (summary) {
      summaryContent.textContent = summary;
      const newRemainingUses = await updateUsageCount(authToken);
      remainingUsesSpan.textContent = `Remaining uses: ${newRemainingUses}`;
    }
  } catch (error) {
    summaryContent.textContent = 'Failed to generate summary. Please try again.';
    console.error('Summarization failed:', error);
  }
}

async function updateUsageCount(token) {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/user/summary-count', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
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

async function fetchSummary(content, token) {
  try {
    const response = await fetch('https://summarizer-medium-naman.vercel.app/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(data.error || 'Daily limit reached. Please try again tomorrow.');
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