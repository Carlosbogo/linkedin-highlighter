let xpathExpression = "//*[contains(@class, 'artdeco-entity-lockup__subtitle ember-view')]";
console.log("Background script loaded");

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setXPath") {
    xpathExpression = request.xpath;
  } else if (request.action === "getXPath") {
    sendResponse({ xpath: xpathExpression });
  }
});