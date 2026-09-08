const TRANSACTIONS_PAGE = {
  schemes: ["https"],
  hostEquals: "www.bovada.lv",
  pathEquals: "/account/transactions"
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.disable();

  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        id: "bovada-transactions-only",
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: TRANSACTIONS_PAGE
          })
        ],
        actions: [new chrome.declarativeContent.ShowAction()]
      }
    ]);
  });
});
