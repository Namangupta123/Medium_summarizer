chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    const content = message.content;

    const summary = await fetchSummaryFromServer(content);
  
    sendResponse({ summary });
    return true;
  });
  
  async function fetchSummaryFromServer(content) {
    const response = await fetch("http://127.0.0.1:5000/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    return data.summary;
  }
  