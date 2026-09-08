globalThis.window = globalThis;
globalThis.Node = {
  DOCUMENT_POSITION_PRECEDING: 2,
  DOCUMENT_POSITION_FOLLOWING: 4
};

load("src/extractor.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function leaf(textContent, order = 0) {
  return {
    textContent,
    order,
    querySelector() {
      return null;
    },
    compareDocumentPosition(other) {
      return this.order < other.order
        ? Node.DOCUMENT_POSITION_FOLLOWING
        : Node.DOCUMENT_POSITION_PRECEDING;
    }
  };
}

const date = leaf("Sep 4, 2026");
const time = leaf("06:08 PM");
const type = leaf("Single", 1);
const status = leaf("Placed", 2);
const toWin = leaf("To Win $75.00", 3);
const selection = leaf("Daniil Donchenko by TKO/KO/DQ in Rounds 2 or 3 (+300)", 4);
const event = leaf(" Punahele Soriano vs Daniil Donchenko", 5);
const amount = leaf("-$25.00");
const balance = leaf("$585.00");

const transactionContent = {
  textContent: [type, status, toWin, selection, event].map((item) => item.textContent).join(" "),
  querySelectorAll(selector) {
    if (selector === "span") return [type, status, toWin, selection];
    if (selector === "p") return [event];
    return [];
  }
};

const cells = [
  {
    querySelectorAll(selector) {
      return selector === "span" ? [date, time] : [];
    }
  },
  {
    querySelector(selector) {
      return selector === ":scope > div" ? transactionContent : null;
    }
  },
  { querySelectorAll() { return []; } },
  {
    querySelectorAll(selector) {
      return selector === "span" ? [amount, balance] : [];
    }
  }
];

const row = {
  dataset: { index: "0" },
  querySelectorAll(selector) {
    return selector === ":scope > td" ? cells : [];
  }
};

const bet = BetExporterExtractor.parseDesktopRow(row);
assert(bet !== null, "Expected the desktop transaction to parse");
assert(bet.date === "Sep 4, 2026", "Expected the transaction date");
assert(bet.time === "06:08 PM", "Expected the transaction time");
assert(bet.type === "Single", "Expected the bet type");
assert(bet.status === "Placed", "Expected the bet status");
assert(bet.stake === 25, "Expected a $25 risk");
assert(bet.toWin === 75, "Expected $75 to win");
assert(bet.payout === 100, "Expected a $100 payout");
assert(bet.balance === 585, "Expected the post-bet balance");
assert(bet.legs.length === 1, "Expected one leg");
assert(bet.legs[0].event === "Punahele Soriano vs Daniil Donchenko", "Expected the matchup");
assert(bet.legs[0].selection === "Daniil Donchenko by TKO/KO/DQ in Rounds 2 or 3", "Expected odds removed from the pick");
assert(bet.legs[0].odds === "+300", "Expected American odds");

assert(BetExporterExtractor.parseMoney("-$1,234.50") === -1234.5, "Expected negative money parsing");
assert(BetExporterExtractor.parseMoney("To Win $55.00") === 55, "Expected labeled money parsing");
assert(BetExporterExtractor.parseMoney("") === null, "Expected blank money to return null");

print("Extractor tests passed");
