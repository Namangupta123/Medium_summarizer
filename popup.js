document.getElementById("summarizeButton").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractContentAndSummarize
    });
  });
  
  async function extractContentAndSummarize() {
    const content = document.body.innerText;
    chrome.runtime.sendMessage({ content: content }, (response) => {
      document.getElementById("summaryResult").innerText = response.summary;
    });
  }
  