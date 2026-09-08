const writeLine = globalThis.print;

class FakeElement {
  constructor() {
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.hidden = true;
    this.textContent = "";
    this.value = "";
    this.listeners = {};
    this.scrollHeight = 0;
    this.classList = {
      values: [],
      add: (...values) => this.classList.values.push(...values)
    };
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

  cloneNode() {
    const clone = new FakeElement();
    clone.scrollHeight = this.scrollHeight;
    return clone;
  }

  removeAttribute() {}

  setAttribute() {}

  remove() {
    this.removed = true;
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
  "downloadPng",
  "printReport"
]) {
  elements.set(id, new FakeElement());
}
elements.get("titleInput").value = "Fight Night Bets";
elements.get("reportPage").scrollHeight = 1440;

const documentHead = new FakeElement();
const documentBody = new FakeElement();
const reportStyleSheet = {
  href: "chrome-extension://test/src/report.css",
  cssRules: [],
  insertRule(rule, index) {
    this.cssRules.splice(index, 0, rule);
  },
  deleteRule(index) {
    this.cssRules.splice(index, 1);
  }
};
let printWasCalled = false;

globalThis.window = globalThis;
globalThis.document = {
  title: "",
  head: documentHead,
  body: documentBody,
  styleSheets: [reportStyleSheet],
  querySelector(selector) {
    return elements.get(selector.replace(/^#/, ""));
  },
  createElement() {
    return new FakeElement();
  }
};
globalThis.requestAnimationFrame = (callback) => callback();
globalThis.print = () => {
  printWasCalled = true;
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
assert(elements.get("totalWin").textContent === "$175.00", "Expected the best-case profit total");
assert(elements.get("totalPayout").textContent === "$215.00", "Expected the best-case payout total");
assert(elements.get("matchupCount").textContent === "1 matchup", "Expected one straight-bet matchup");
assert(elements.get("fightGrid").children.length === 2, "Expected one matchup card and one parlay card");
assert(document.title === "Fight Night Bets - 2026-09-04", "Expected a dated PDF filename with a plain hyphen");
assert(typeof elements.get("downloadPng").listeners.click === "function", "Expected a PNG download action");

elements.get("printReport").listeners.click();
assert(reportStyleSheet.cssRules.length === 1, "Expected a dynamic print-size rule");
assert(reportStyleSheet.cssRules[0].includes("size: 148mm 393mm"), "Expected one buffered custom-height print page");
assert(printWasCalled, "Expected the print dialog to open after measuring");

writeLine("Report tests passed");
