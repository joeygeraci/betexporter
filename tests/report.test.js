class FakeElement {
  constructor() {
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.hidden = true;
    this.textContent = "";
    this.value = "";
    this.listeners = {};
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }
}

const elements = new Map();
for (const id of [
  "reportPage",
  "emptyState",
  "titleInput",
  "noteInput",
  "reportTitle",
  "reportNote",
  "rangeLabel",
  "betCount",
  "totalRisk",
  "totalWin",
  "totalPayout",
  "matchupCount",
  "fightGrid",
  "capturedLabel",
  "downloadCsv",
  "printReport"
]) {
  elements.set(id, new FakeElement());
}
elements.get("titleInput").value = "Fight Night Bets";

globalThis.window = globalThis;
globalThis.document = {
  title: "",
  querySelector(selector) {
    return elements.get(selector.replace(/^#/, ""));
  },
  createElement() {
    return new FakeElement();
  }
};
globalThis.chrome = {
  storage: {
    session: {
      get() {
        return Promise.resolve({
          currentReport: {
            schemaVersion: 1,
            capturedAt: "2026-09-04T22:08:00.000Z",
            dateRange: "24 Hours",
            bets: [
              {
                id: "bet-1",
                sourceIndex: "0",
                date: "Sep 4, 2026",
                time: "06:08 PM",
                type: "Single",
                status: "Placed",
                stake: 25,
                toWin: 75,
                payout: 100,
                legs: [{
                  event: "Punahele Soriano vs Daniil Donchenko",
                  selection: "Daniil Donchenko by TKO/KO/DQ",
                  odds: "+300"
                }]
              },
              {
                id: "bet-2",
                sourceIndex: "1",
                date: "Sep 4, 2026",
                time: "06:08 PM",
                type: "Single",
                status: "Placed",
                stake: 10,
                toWin: 55,
                payout: 65,
                legs: [{
                  event: "Punahele Soriano vs Daniil Donchenko",
                  selection: "Punahele Soriano by KO, TKO or DQ",
                  odds: "+550"
                }]
              },
              {
                id: "bet-3",
                sourceIndex: "2",
                date: "Sep 4, 2026",
                time: "06:03 PM",
                type: "Parlay",
                status: "Placed",
                stake: 15,
                toWin: 100,
                payout: 115,
                legs: [
                  { event: "Fighter A vs Fighter B", selection: "Fighter A", odds: "-110" },
                  { event: "Fighter C vs Fighter D", selection: "Fighter D", odds: "+125" }
                ]
              }
            ]
          }
        });
      }
    }
  }
};

load("src/report.js");
drainMicrotasks();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(elements.get("reportPage").hidden === false, "Expected the report to become visible");
assert(elements.get("betCount").textContent === "3", "Expected three bets");
assert(elements.get("totalRisk").textContent === "$50.00", "Expected the risk total");
assert(elements.get("totalWin").textContent === "$230.00", "Expected the potential profit total");
assert(elements.get("totalPayout").textContent === "$280.00", "Expected the payout total");
assert(elements.get("matchupCount").textContent === "1 matchup", "Expected one straight-bet matchup");
assert(elements.get("fightGrid").children.length === 2, "Expected one matchup card and one parlay card");

print("Report tests passed");
