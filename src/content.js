(() => {
  const TARGET_PATH = "/account/transactions";
  if (window.location.hostname !== "www.bovada.lv" || window.location.pathname !== TARGET_PATH) return;

  const extractor = window.BetExporterExtractor;

  function selectedDateRange() {
    return extractor.cleanText(
      document.querySelector('input[name="transactionsDate"]')?.value || "Selected transactions"
    );
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "BET_EXPORTER_STATUS") {
      sendResponse({ count: extractor.readMountedBets().length });
      return false;
    }

    if (message?.type === "BET_EXPORTER_COLLECT") {
      extractor.collectAllBets()
        .then((bets) => {
          sendResponse({
            ok: bets.length > 0,
            error: bets.length > 0 ? "" : "No Bovada sports bets were found in the current transaction list.",
            report: {
              schemaVersion: 1,
              capturedAt: new Date().toISOString(),
              dateRange: selectedDateRange(),
              bets
            }
          });
        })
        .catch((error) => {
          sendResponse({ ok: false, error: error.message || "The transaction list could not be read." });
        });
      return true;
    }

    return false;
  });
})();
