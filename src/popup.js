const TARGET_HOST = "www.bovada.lv";
const TARGET_PATH = "/account/transactions";

const elements = {
  button: document.querySelector("#createReport"),
  buttonLabel: document.querySelector("#buttonLabel"),
  statusDot: document.querySelector("#statusDot"),
  statusTitle: document.querySelector("#statusTitle"),
  statusDetail: document.querySelector("#statusDetail")
};

function setStatus(state, title, detail) {
  elements.statusDot.dataset.state = state;
  elements.statusTitle.textContent = title;
  elements.statusDetail.textContent = detail;
}

function isTransactionsPage(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" &&
      parsedUrl.hostname === TARGET_HOST &&
      parsedUrl.pathname === TARGET_PATH;
  } catch {
    return false;
  }
}

function sendMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function initialize() {
  const tab = await getActiveTab();

  if (!tab?.id || !isTransactionsPage(tab.url)) {
    setStatus("error", "Open Bovada transactions", "This extension only runs on the Bovada Account Transactions page.");
    return;
  }

  try {
    const response = await sendMessage(tab.id, { type: "BET_EXPORTER_STATUS" });
    const count = response?.count ?? 0;

    if (count === 0) {
      setStatus("error", "No bets found yet", "Choose a date range on Bovada and wait for the transaction list to finish loading.");
      return;
    }

    setStatus(
      "ready",
      `${count} bet${count === 1 ? "" : "s"} ready`,
      "The sheet will use every bet currently available in the selected Bovada date range."
    );
    elements.button.disabled = false;
  } catch {
    setStatus("error", "Refresh this page", "Bovada loaded before the extension was ready. Refresh the transactions page and try again.");
  }
}

elements.button.addEventListener("click", async () => {
  elements.button.disabled = true;
  elements.button.dataset.loading = "true";
  elements.buttonLabel.textContent = "Collecting every bet…";

  try {
    const tab = await getActiveTab();
    const response = await sendMessage(tab.id, { type: "BET_EXPORTER_COLLECT" });

    if (!response?.ok || !response.report?.bets?.length) {
      throw new Error(response?.error || "No bets were found.");
    }

    await chrome.storage.session.set({ currentReport: response.report });
    await chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
    window.close();
  } catch (error) {
    setStatus("error", "Couldn’t create the sheet", error.message || "Refresh the page and try again.");
    elements.button.disabled = false;
    elements.button.dataset.loading = "false";
    elements.buttonLabel.textContent = "Try again";
  }
});

initialize().catch(() => {
  setStatus("error", "Couldn’t read this tab", "Close this popup, refresh Bovada, and try again.");
});
