(() => {
  const STATUS_WORDS = new Set([
    "placed",
    "pending",
    "open",
    "won",
    "lost",
    "void",
    "push",
    "cancelled",
    "canceled",
    "cashed out"
  ]);

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function parseMoney(value) {
    const text = cleanText(value).replace(/,/g, "");
    const match = text.match(/-?\$?\s*(\d+(?:\.\d{1,2})?)/);
    if (!match) return null;

    const amount = Number(match[1]);
    const isNegative = /^\s*[-−]/.test(text) || /^\s*\(/.test(text);
    return Math.round((isNegative ? -amount : amount) * 100) / 100;
  }

  function parseOdds(selection) {
    const match = cleanText(selection).match(/\(([+-]\d+)\)\s*$/);
    return match ? match[1] : "";
  }

  function stripOdds(selection) {
    return cleanText(selection).replace(/\s*\([+-]\d+\)\s*$/, "");
  }

  function hash(value) {
    let result = 5381;
    for (const character of value) {
      result = ((result << 5) + result) ^ character.charCodeAt(0);
    }
    return (result >>> 0).toString(36);
  }

  function isMetadata(text) {
    const lower = text.toLowerCase();
    return STATUS_WORDS.has(lower) ||
      /^to win\b/i.test(text) ||
      /^(single|parlay|teaser|round robin|straight)$/i.test(text);
  }

  function extractTransaction(transactionRoot) {
    if (!transactionRoot) return null;

    const directContainer = transactionRoot.querySelector(":scope > div");
    const contentRoot = directContainer && /\bto win\b/i.test(directContainer.textContent)
      ? directContainer
      : transactionRoot;
    const spans = Array.from(contentRoot.querySelectorAll("span"))
      .filter((span) => !span.querySelector("span"));
    const spanValues = spans.map((span) => cleanText(span.textContent)).filter(Boolean);
    const toWinText = spanValues.find((text) => /^to win\b/i.test(text));

    if (!toWinText) return null;

    const status = spanValues.find((text) => STATUS_WORDS.has(text.toLowerCase())) || "Placed";
    const statusIndex = spanValues.indexOf(status);
    const type = spanValues.slice(0, Math.max(statusIndex, 1))
      .find((text) => !isMetadata(text)) || spanValues[0] || "Bet";
    const selectionElements = spans.filter((span) => {
      const text = cleanText(span.textContent);
      return text && !isMetadata(text) && text !== type;
    });
    const eventElements = Array.from(contentRoot.querySelectorAll("p"))
      .filter((element) => cleanText(element.textContent));
    const usedSelections = new Set();

    const legs = eventElements.map((eventElement) => {
      const candidates = selectionElements.filter((selectionElement) => {
        const position = selectionElement.compareDocumentPosition(eventElement);
        return !usedSelections.has(selectionElement) &&
          Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      const selectionElement = candidates.at(-1) || null;
      if (selectionElement) usedSelections.add(selectionElement);

      const rawSelection = cleanText(selectionElement?.textContent);
      return {
        event: cleanText(eventElement.textContent),
        selection: stripOdds(rawSelection) || "Bet selection",
        odds: parseOdds(rawSelection)
      };
    });

    if (legs.length === 0 && selectionElements.length > 0) {
      const rawSelection = cleanText(selectionElements[0].textContent);
      legs.push({
        event: "Other bets",
        selection: stripOdds(rawSelection) || "Bet selection",
        odds: parseOdds(rawSelection)
      });
    }

    return {
      type,
      status,
      toWin: Math.abs(parseMoney(toWinText) || 0),
      legs
    };
  }

  function makeBet(fields) {
    const transaction = extractTransaction(fields.transactionRoot);
    if (!transaction || transaction.legs.length === 0) return null;

    const rawAmount = parseMoney(fields.amountText);
    const stake = rawAmount === null ? 0 : Math.abs(rawAmount);
    const payout = Math.round((stake + transaction.toWin) * 100) / 100;
    const signature = [
      fields.sourceIndex,
      fields.date,
      fields.time,
      transaction.type,
      transaction.status,
      stake,
      transaction.toWin,
      ...transaction.legs.flatMap((leg) => [leg.event, leg.selection, leg.odds])
    ].join("|");

    return {
      id: `bet-${hash(signature)}`,
      sourceIndex: fields.sourceIndex,
      date: cleanText(fields.date),
      time: cleanText(fields.time),
      type: cleanText(transaction.type),
      status: cleanText(transaction.status),
      stake,
      toWin: transaction.toWin,
      payout,
      balance: Math.abs(parseMoney(fields.balanceText) || 0),
      legs: transaction.legs
    };
  }

  function parseDesktopRow(row, fallbackIndex = 0) {
    const cells = Array.from(row.querySelectorAll(":scope > td"));
    if (cells.length < 3) return null;

    const dateParts = Array.from(cells[0].querySelectorAll("span"))
      .map((span) => cleanText(span.textContent));
    const amountParts = Array.from(cells.at(-1).querySelectorAll("span"))
      .map((span) => cleanText(span.textContent));

    return makeBet({
      sourceIndex: row.dataset.index ?? fallbackIndex,
      date: dateParts[0] || "",
      time: dateParts[1] || "",
      transactionRoot: cells[1],
      amountText: amountParts[0] || "",
      balanceText: amountParts[1] || ""
    });
  }

  function parseMobileGroup(group, fallbackIndex = 0) {
    const fields = new Map();

    for (const row of group.querySelectorAll(':scope > [role="row"]')) {
      const cells = row.querySelectorAll(':scope > [role="cell"]');
      if (cells.length < 2) continue;
      fields.set(cleanText(cells[0].textContent).toLowerCase(), cells[1]);
    }

    const transactionRoot = fields.get("transaction");
    if (!transactionRoot) return null;

    const container = group.closest("[data-index]");
    return makeBet({
      sourceIndex: container?.dataset.index ?? fallbackIndex,
      date: fields.get("date")?.textContent,
      time: fields.get("time")?.textContent,
      transactionRoot,
      amountText: fields.get("amount")?.textContent,
      balanceText: fields.get("total balance")?.textContent
    });
  }

  function desktopRows(root = document) {
    return Array.from(root.querySelectorAll(
      ".ol-responsive--show_desktop table tbody tr[data-index], table tbody tr[data-index]"
    ));
  }

  function mobileGroups(root = document) {
    return Array.from(root.querySelectorAll(
      '.ol-responsive--show_mobile [data-index] > [role="rowgroup"], [data-index] > [role="rowgroup"]'
    ));
  }

  function readMountedBets(root = document) {
    const desktopBets = desktopRows(root)
      .map((row, index) => parseDesktopRow(row, index))
      .filter(Boolean);
    const mobileBets = mobileGroups(root)
      .map((group, index) => parseMobileGroup(group, index))
      .filter(Boolean);
    const bets = [...desktopBets, ...mobileBets];

    return Array.from(new Map(bets.map((bet) => [bet.id, bet])).values());
  }

  function getTransactionScroller(root = document) {
    const rows = desktopRows(root);
    if (rows.length === 0) return null;

    const scroller = rows[0].closest(".ol-table__scrollableContainer");
    return scroller && scroller.scrollHeight > scroller.clientHeight ? scroller : null;
  }

  function waitForVirtualList() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 55));
    });
  }

  async function collectAllBets(root = document) {
    const collected = new Map();
    const collectMounted = () => {
      for (const bet of readMountedBets(root)) collected.set(bet.id, bet);
    };

    collectMounted();
    const scroller = getTransactionScroller(root);
    if (!scroller) return Array.from(collected.values());

    const originalScrollTop = scroller.scrollTop;
    const step = Math.max(Math.floor(scroller.clientHeight * 0.8), 180);
    const maxScrollTop = Math.max(scroller.scrollHeight - scroller.clientHeight, 0);
    const stops = [];

    for (let top = 0; top < maxScrollTop; top += step) stops.push(top);
    stops.push(maxScrollTop);

    for (const top of stops.slice(0, 180)) {
      scroller.scrollTop = top;
      scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
      await waitForVirtualList();
      collectMounted();
    }

    scroller.scrollTop = originalScrollTop;
    scroller.dispatchEvent(new Event("scroll", { bubbles: true }));

    return Array.from(collected.values()).sort((first, second) => {
      return Number(first.sourceIndex) - Number(second.sourceIndex);
    });
  }

  window.BetExporterExtractor = {
    cleanText,
    parseMoney,
    parseDesktopRow,
    parseMobileGroup,
    readMountedBets,
    collectAllBets
  };
})();
