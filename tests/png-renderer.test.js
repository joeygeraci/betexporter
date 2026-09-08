const writeLine = globalThis.print;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createContext() {
  return new Proxy({
    measureText(value) {
      return { width: String(value).length * 6 };
    }
  }, {
    get(target, property) {
      if (property in target) return target[property];
      return () => {};
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

globalThis.window = globalThis;
globalThis.document = {
  createElement(tagName) {
    assert(tagName === "canvas", "The PNG renderer should only create safe canvases");
    return {
      width: 0,
      height: 0,
      getContext() {
        return createContext();
      },
      toBlob(callback, type) {
        callback({ type, safeCanvas: true });
      }
    };
  }
};

load("src/png-renderer.js");

const bet = {
  id: "bet-1",
  type: "Single",
  status: "Placed",
  stake: 25,
  toWin: 75,
  payout: 100,
  legs: [{
    event: "Punahele Soriano vs Daniil Donchenko",
    selection: "Daniil Donchenko by TKO/KO/DQ in Rounds 2 or 3",
    odds: "+300"
  }]
};
const groups = [{
  type: "matchup",
  title: bet.legs[0].event,
  entries: [{ bet, leg: bet.legs[0] }]
}];

let png = null;
BetExporterPng.render({
  report: { dateRange: "24 Hours", bets: [bet] },
  groups,
  title: "Fight Night Bets",
  note: "Sep 4, 2026",
  dateLabel: "Sep 4, 2026",
  betCount: 1,
  matchupCount: 1,
  totalRisk: 25,
  totalWin: 75,
  totalPayout: 100,
  capturedLabel: "Captured Sep 4, 2026"
}).then((result) => {
  png = result;
});
drainMicrotasks();

assert(png?.type === "image/png", "Expected a PNG blob from the safe canvas renderer");
assert(png?.safeCanvas === true, "Expected no SVG or foreignObject taint path");
writeLine("PNG renderer tests passed");
