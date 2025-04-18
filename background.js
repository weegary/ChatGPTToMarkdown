// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Chat Extractor installed');
});

chrome.runtime.onMessage.addListener((message, sender) => {
  console.log("Background received message:", message);
  console.log("Sender info:", sender);
  
  if (message.action === "download_chat") {
    const markdownContent = message.content;
    const filename = 'chatgpt_chat.md';
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    try {
      console.log("Starting download...");
      chrome.downloads.download({
        url: url,
        filename: filename
      }, (downloadId) => {
        console.log("Download completed, ID:", downloadId);
        
        if (chrome.runtime.lastError) {
          console.error("Download error:", chrome.runtime.lastError);
        }
        
        console.log("Sending success message to tab:", sender.tab.id);
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "download_complete",
          success: true,
          downloadId: downloadId
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error sending response:", chrome.runtime.lastError);
          } else {
            console.log("Response sent successfully");
          }
          URL.revokeObjectURL(url);
        });
      });
    } catch (err) {
      console.error("Exception during download:", err);
      chrome.tabs.sendMessage(sender.tab.id, {
        action: "download_complete",
        success: false,
        error: err.message
      });
    }
    
    // Need to return true here to indicate async response
    return true;
  }
});