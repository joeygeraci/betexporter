const ui = {
  reportPage: document.querySelector("#reportPage"),
  emptyState: document.querySelector("#emptyState"),
  titleInput: document.querySelector("#titleInput"),
  noteInput: document.querySelector("#noteInput"),
  reportTitle: document.querySelector("#reportTitle"),
  reportNote: document.querySelector("#reportNote"),
  rangeLabel: document.querySelector("#rangeLabel"),
  betCount: document.querySelector("#betCount"),
  totalRisk: document.querySelector("#totalRisk"),
  totalWin: document.querySelector("#totalWin"),
  totalPayout: document.querySelector("#totalPayout"),
  matchupCount: document.querySelector("#matchupCount"),
  fightGrid: document.querySelector("#fightGrid"),
  capturedLabel: document.querySelector("#capturedLabel"),
  downloadCsv: document.querySelector("#downloadCsv"),
  downloadPng: document.querySelector("#downloadPng"),
  printReport: document.querySelector("#printReport")
};

let currentReport = null;
let dynamicPrintStyleSheet = null;
let dynamicPrintRuleIndex = null;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function money(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function sum(bets, property) {
  return bets.reduce((total, bet) => total + (Number(bet[property]) || 0), 0);
}

function bestCaseSum(groups, property) {
  return groups.reduce((total, group) => {
    const values = group.entries.map((entry) => Number(entry.bet[property]) || 0);
    const groupValue = group.type === "parlay"
      ? values.reduce((subtotal, value) => subtotal + value, 0)
      : Math.max(0, ...values);
    return total + groupValue;
  }, 0);
}

function matchupSides(event) {
  const sides = String(event).split(/\s+vs\.?\s+/i).map((side) => side.trim());
  return sides.length === 2 ? sides : [];
}

function cornerClass(event, selection) {
  const sides = matchupSides(event);
  const normalizedSelection = String(selection).toLowerCase();
  if (sides[0] && normalizedSelection.includes(sides[0].toLowerCase())) return "bet-row--red";
  if (sides[1] && normalizedSelection.includes(sides[1].toLowerCase())) return "bet-row--blue";
  return "";
}

function groupBets(bets) {
  const groups = [];
  const matchupGroups = new Map();
  let parlayGroup = null;

  for (const bet of bets) {
    if (bet.legs.length === 1) {
      const leg = bet.legs[0];
      const key = leg.event || "Other bets";
      if (!matchupGroups.has(key)) {
        const group = { type: "matchup", title: key, entries: [] };
        matchupGroups.set(key, group);
        groups.push(group);
      }
      matchupGroups.get(key).entries.push({ bet, leg });
      continue;
    }

    if (!parlayGroup) {
      parlayGroup = { type: "parlay", title: "Multi-fight parlays", entries: [] };
      groups.push(parlayGroup);
    }
    parlayGroup.entries.push({ bet });
  }

  return groups;
}

function renderMoneyGrid(bet) {
  const grid = createElement("div", "money-grid");
  for (const [label, value] of [
    ["RISK", bet.stake],
    ["TO WIN", bet.toWin],
    ["PAYOUT", bet.payout]
  ]) {
    const item = createElement("div");
    item.append(createElement("span", "", label), createElement("strong", "", money(value)));
    grid.append(item);
  }
  return grid;
}

function renderSingleBet(entry, index) {
  const { bet, leg } = entry;
  const row = createElement("article", `bet-row ${cornerClass(leg.event, leg.selection)}`.trim());
  const meta = createElement("div", "bet-row__meta");
  meta.append(
    createElement("span", "", `BET ${String(index + 1).padStart(2, "0")} · ${bet.type} · ${bet.status}`),
    createElement("span", "outcome-box", "RESULT")
  );

  const pick = createElement("div", "bet-row__pick");
  pick.append(
    createElement("strong", "", leg.selection),
    createElement("span", "odds", leg.odds || "-")
  );

  row.append(meta, pick, renderMoneyGrid(bet));
  return row;
}

function renderParlayBet(entry, index) {
  const { bet } = entry;
  const row = createElement("article", "bet-row bet-row--parlay");
  const meta = createElement("div", "bet-row__meta");
  meta.append(
    createElement("span", "", `PARLAY ${String(index + 1).padStart(2, "0")} · ${bet.status}`),
    createElement("span", "outcome-box", "RESULT")
  );

  const legs = createElement("div", "parlay-legs");
  bet.legs.forEach((leg, legIndex) => {
    const legRow = createElement("div", "parlay-leg");
    const description = createElement("div");
    description.append(
      createElement("strong", "", leg.selection),
      createElement("small", "", leg.event)
    );
    legRow.append(
      createElement("span", "parlay-leg__number", String(legIndex + 1)),
      description,
      createElement("span", "odds", leg.odds || "-")
    );
    legs.append(legRow);
  });

  row.append(meta, legs, renderMoneyGrid(bet));
  return row;
}

function renderGroup(group, groupIndex) {
  const card = createElement("section", `fight-card${group.type === "parlay" ? " fight-card--parlay" : ""}`);
  const header = createElement("header", "fight-card__header");
  const heading = createElement("div", "fight-card__heading");
  heading.append(
    createElement("span", "", group.type === "parlay" ? "COMBINED TICKETS" : "MATCHUP"),
    createElement("h2", "", group.title)
  );

  const groupBetsList = group.entries.map((entry) => entry.bet);
  const total = createElement("div", "fight-card__total");
  total.append(
    createElement("span", "", "RISK"),
    createElement("strong", "", money(sum(groupBetsList, "stake")))
  );
  header.append(
    createElement("span", "fight-number", String(groupIndex + 1).padStart(2, "0")),
    heading,
    total
  );
  card.append(header);

  group.entries.forEach((entry, index) => {
    card.append(group.type === "parlay" ? renderParlayBet(entry, index) : renderSingleBet(entry, index));
  });
  return card;
}

function reportDateLabel(report) {
  const dates = Array.from(new Set(report.bets.map((bet) => bet.date).filter(Boolean)));
  if (dates.length === 1) return dates[0];
  return report.dateRange || "Selected transactions";
}

function reportFileDate(report) {
  const capturedAt = new Date(report.capturedAt);
  const date = Number.isNaN(capturedAt.getTime()) ? new Date() : capturedAt;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateDocumentTitle() {
  const title = ui.titleInput.value.trim() || "Fight Night Bets";
  const date = reportFileDate(currentReport || { capturedAt: new Date().toISOString() });
  document.title = `${title} - ${date}`;
}

function configureSinglePagePrint() {
  const measurement = ui.reportPage.cloneNode(true);
  measurement.hidden = false;
  measurement.removeAttribute("id");
  measurement.classList.add("page--print-measure");
  measurement.setAttribute("aria-hidden", "true");
  document.body.append(measurement);

  const minimumHeightMillimeters = 210;
  const contentHeightMillimeters = measurement.scrollHeight * 25.4 / 96;
  const pageHeightMillimeters = Math.max(
    minimumHeightMillimeters,
    Math.ceil((contentHeightMillimeters + 12) * 10) / 10
  );
  measurement.remove();

  const pageRule = `@page { size: 148mm ${pageHeightMillimeters}mm; margin: 0; }`;
  const reportStyleSheet = Array.from(document.styleSheets || []).find((styleSheet) => {
    return styleSheet.href?.endsWith("/src/report.css");
  });

  if (reportStyleSheet) {
    try {
      if (dynamicPrintStyleSheet === reportStyleSheet && dynamicPrintRuleIndex !== null) {
        reportStyleSheet.deleteRule(dynamicPrintRuleIndex);
      }
      dynamicPrintRuleIndex = reportStyleSheet.cssRules.length;
      reportStyleSheet.insertRule(pageRule, dynamicPrintRuleIndex);
      dynamicPrintStyleSheet = reportStyleSheet;
      return;
    } catch {
      dynamicPrintStyleSheet = null;
      dynamicPrintRuleIndex = null;
    }
  }

  let printSize = document.querySelector("#dynamicPrintPageSize");
  if (!printSize) {
    printSize = document.createElement("style");
    printSize.id = "dynamicPrintPageSize";
    document.head.append(printSize);
  }
  printSize.textContent = pageRule;
}

function printSinglePage() {
  configureSinglePagePrint();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });
}

async function createReportPng() {
  if (!window.BetExporterPng) throw new Error("The PNG renderer did not load.");
  const groups = groupBets(currentReport.bets);
  const matchupCount = groups.filter((group) => group.type === "matchup").length;
  return window.BetExporterPng.render({
    report: currentReport,
    groups,
    title: ui.titleInput.value.trim() || "Fight Night Bets",
    note: ui.noteInput.value.trim(),
    dateLabel: reportDateLabel(currentReport),
    betCount: currentReport.bets.length,
    matchupCount,
    totalRisk: sum(currentReport.bets, "stake"),
    totalWin: bestCaseSum(groups, "toWin"),
    totalPayout: bestCaseSum(groups, "payout"),
    capturedLabel: ui.capturedLabel.textContent
  });
}

async function downloadPng() {
  const originalLabel = ui.downloadPng.textContent;
  ui.downloadPng.disabled = true;
  ui.downloadPng.textContent = "Rendering PNG…";

  try {
    const png = await createReportPng();
    const url = URL.createObjectURL(png);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fight-night-bets-${reportFileDate(currentReport)}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    window.alert(error.message || "The PNG could not be created.");
  } finally {
    ui.downloadPng.disabled = false;
    ui.downloadPng.textContent = originalLabel;
  }
}

function renderReport(report) {
  currentReport = report;
  const groups = groupBets(report.bets);
  const matchupTotal = groups.filter((group) => group.type === "matchup").length;
  const capturedAt = new Date(report.capturedAt);
  const dateLabel = reportDateLabel(report);

  ui.rangeLabel.textContent = `${report.dateRange || "Selected range"} · ${dateLabel}`;
  ui.noteInput.value = dateLabel;
  ui.reportNote.textContent = dateLabel;
  ui.betCount.textContent = String(report.bets.length);
  ui.totalRisk.textContent = money(sum(report.bets, "stake"));
  ui.totalWin.textContent = money(bestCaseSum(groups, "toWin"));
  ui.totalPayout.textContent = money(bestCaseSum(groups, "payout"));
  ui.matchupCount.textContent = `${matchupTotal} matchup${matchupTotal === 1 ? "" : "s"}`;
  ui.capturedLabel.textContent = `Captured ${capturedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })}`;

  ui.fightGrid.replaceChildren(...groups.map(renderGroup));
  ui.reportPage.hidden = false;
  updateDocumentTitle();
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv() {
  if (!currentReport) return;
  const rows = [[
    "Date",
    "Time",
    "Type",
    "Status",
    "Matchup(s)",
    "Selection(s)",
    "Odds",
    "Risk",
    "To Win",
    "Payout"
  ]];

  for (const bet of currentReport.bets) {
    rows.push([
      bet.date,
      bet.time,
      bet.type,
      bet.status,
      bet.legs.map((leg) => leg.event).join(" | "),
      bet.legs.map((leg) => leg.selection).join(" | "),
      bet.legs.map((leg) => leg.odds).join(" | "),
      bet.stake.toFixed(2),
      bet.toWin.toFixed(2),
      bet.payout.toFixed(2)
    ]);
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `fight-night-bets-${reportFileDate(currentReport)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

ui.titleInput.addEventListener("input", () => {
  const title = ui.titleInput.value.trim() || "Fight Night Bets";
  ui.reportTitle.textContent = title;
  updateDocumentTitle();
});

ui.noteInput.addEventListener("input", () => {
  ui.reportNote.textContent = ui.noteInput.value.trim();
});

ui.downloadCsv.addEventListener("click", downloadCsv);
ui.downloadPng.addEventListener("click", downloadPng);
ui.printReport.addEventListener("click", printSinglePage);

chrome.storage.session.get("currentReport").then(({ currentReport }) => {
  if (!currentReport?.bets?.length) {
    ui.emptyState.hidden = false;
    return;
  }
  renderReport(currentReport);
});
