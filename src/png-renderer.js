(() => {
  const WIDTH = 560;
  const PAGE_PADDING = 28;
  const CONTENT_WIDTH = WIDTH - PAGE_PADDING * 2;
  const HEADER_HEIGHT = 170;
  const CARD_HEADER_HEIGHT = 52;
  const CARD_GAP = 12;
  const COLORS = {
    ink: "#17191a",
    paper: "#faf9f5",
    muted: "#77756f",
    line: "#d9d6cf",
    lightLine: "#e6e2db",
    red: "#c9342d",
    redLight: "#e05a53",
    blue: "#326aa1",
    gold: "#b8842c",
    cream: "#f8f6f1",
    white: "#ffffff"
  };

  function formatMoney(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    }).format(Number(amount) || 0);
  }

  function setFont(context, size, weight = 400, family = "Arial") {
    context.font = `${weight} ${size}px ${family}`;
  }

  function wrapText(context, value, maxWidth) {
    const words = String(value || "").trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];

    const lines = [];
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
    return lines;
  }

  function drawLines(context, lines, x, y, lineHeight) {
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  }

  function roundedPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function cornerColor(event, selection) {
    const sides = String(event).split(/\s+vs\.?\s+/i).map((side) => side.trim());
    const pick = String(selection).toLowerCase();
    if (sides.length === 2 && pick.includes(sides[0].toLowerCase())) return COLORS.red;
    if (sides.length === 2 && pick.includes(sides[1].toLowerCase())) return COLORS.blue;
    return "#a2a3a0";
  }

  function measureSingle(context, entry) {
    setFont(context, 12, 600, "Georgia");
    const selectionLines = wrapText(context, entry.leg.selection, CONTENT_WIDTH - 105);
    return {
      type: "single",
      entry,
      selectionLines,
      height: 66 + selectionLines.length * 15
    };
  }

  function measureParlay(context, entry) {
    const legs = entry.bet.legs.map((leg) => {
      setFont(context, 10, 600, "Georgia");
      const selectionLines = wrapText(context, leg.selection, CONTENT_WIDTH - 120);
      setFont(context, 7, 400, "Arial");
      const eventLines = wrapText(context, leg.event, CONTENT_WIDTH - 120);
      return {
        ...leg,
        selectionLines,
        eventLines,
        height: selectionLines.length * 12 + eventLines.length * 9 + 8
      };
    });
    return {
      type: "parlay",
      entry,
      legs,
      height: 67 + legs.reduce((total, leg) => total + leg.height, 0)
    };
  }

  function buildLayout(context, groups) {
    const measuredGroups = groups.map((group) => {
      const entries = group.entries.map((entry) => {
        return group.type === "parlay"
          ? measureParlay(context, entry)
          : measureSingle(context, entry);
      });
      return {
        ...group,
        measuredEntries: entries,
        height: CARD_HEADER_HEIGHT + entries.reduce((total, entry) => total + entry.height, 0)
      };
    });

    const cardsHeight = measuredGroups.reduce((total, group) => total + group.height, 0) +
      Math.max(0, measuredGroups.length - 1) * CARD_GAP;
    return {
      groups: measuredGroups,
      height: PAGE_PADDING + HEADER_HEIGHT + 31 + cardsHeight + 38 + PAGE_PADDING
    };
  }

  function drawPaper(context, height) {
    context.fillStyle = COLORS.paper;
    context.fillRect(0, 0, WIDTH, height);
    context.save();
    context.strokeStyle = "rgba(25, 26, 26, 0.025)";
    context.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 18) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y <= height; y += 18) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(WIDTH, y);
      context.stroke();
    }
    context.restore();
  }

  function drawHeader(context, options, y) {
    const x = PAGE_PADDING;
    const width = CONTENT_WIDTH;
    roundedPath(context, x, y, width, HEADER_HEIGHT, 8);
    context.fillStyle = COLORS.ink;
    context.fill();

    setFont(context, 8, 700, "Arial");
    context.fillStyle = COLORS.redLight;
    context.fillText("BET EXPORTER", x + 22, y + 24);
    context.fillStyle = "#a5a6a3";
    context.fillText(" / PERSONAL FIGHT CARD", x + 88, y + 24);
    context.textAlign = "right";
    context.fillText(`${options.report.dateRange || "Selected range"} · ${options.dateLabel}`, x + width - 22, y + 24);
    context.textAlign = "left";

    setFont(context, 29, 500, "Georgia");
    context.fillStyle = "#f8f5ef";
    const titleLines = wrapText(context, options.title, 365).slice(0, 2);
    drawLines(context, titleLines, x + 22, y + 65, 31);
    setFont(context, 8, 600, "Arial");
    context.fillStyle = "#c7c5c0";
    context.fillText(String(options.note || "").toUpperCase(), x + 22, y + 104);

    setFont(context, 46, 800, "Georgia");
    context.fillStyle = COLORS.redLight;
    context.textAlign = "center";
    context.fillText("B", x + width - 48, y + 84);
    context.textAlign = "left";

    const summaryY = y + 118;
    const summaryWidth = width / 4;
    context.fillStyle = "rgba(0, 0, 0, 0.15)";
    context.fillRect(x, summaryY, width, 52);
    context.strokeStyle = "rgba(255, 255, 255, 0.1)";
    context.lineWidth = 1;

    const summary = [
      ["BETS", String(options.betCount)],
      ["TOTAL RISK", formatMoney(options.totalRisk)],
      ["BEST-CASE WIN", formatMoney(options.totalWin)],
      ["BEST RETURN", formatMoney(options.totalPayout)]
    ];
    summary.forEach(([label, value], index) => {
      const itemX = x + summaryWidth * index;
      if (index > 0) {
        context.beginPath();
        context.moveTo(itemX, summaryY);
        context.lineTo(itemX, summaryY + 52);
        context.stroke();
      }
      setFont(context, 6.5, 700, "Arial");
      context.fillStyle = "#92938f";
      context.fillText(label, itemX + 16, summaryY + 18);
      setFont(context, 16, 600, "Georgia");
      context.fillStyle = index === 3 ? "#f0746d" : "#f8f5ef";
      context.fillText(value, itemX + 16, summaryY + 39);
    });
  }

  function drawMoneyGrid(context, bet, x, y, width) {
    const height = 34;
    roundedPath(context, x, y, width, height, 4);
    context.fillStyle = COLORS.cream;
    context.fill();
    context.strokeStyle = "#e2ded7";
    context.lineWidth = 1;
    context.stroke();

    const columns = [
      ["RISK", bet.stake],
      ["TO WIN", bet.toWin],
      ["PAYOUT", bet.payout]
    ];
    const columnWidth = width / 3;
    columns.forEach(([label, value], index) => {
      const itemX = x + columnWidth * index;
      if (index > 0) {
        context.beginPath();
        context.moveTo(itemX, y);
        context.lineTo(itemX, y + height);
        context.stroke();
      }
      setFont(context, 6, 700, "Arial");
      context.fillStyle = "#96938c";
      context.fillText(label, itemX + 8, y + 12);
      setFont(context, 10, 700, "Arial");
      context.fillStyle = index === 2 ? "#a52d27" : COLORS.ink;
      context.fillText(formatMoney(value), itemX + 8, y + 27);
    });
  }

  function drawOutcome(context, x, y) {
    setFont(context, 6.5, 700, "Arial");
    context.fillStyle = "#8a8985";
    context.textAlign = "right";
    context.fillText("RESULT", x - 7, y + 7);
    context.strokeStyle = "#a7a59f";
    context.strokeRect(x, y, 9, 9);
    context.textAlign = "left";
  }

  function drawOdds(context, odds, x, y) {
    roundedPath(context, x, y, 38, 19, 4);
    context.fillStyle = "#f4f1ea";
    context.fill();
    context.strokeStyle = "#d9d5cd";
    context.stroke();
    setFont(context, 8, 700, "Arial");
    context.fillStyle = "#4d4c49";
    context.textAlign = "center";
    context.fillText(odds || "-", x + 19, y + 13);
    context.textAlign = "left";
  }

  function drawSingle(context, measured, x, y, width, index) {
    const { bet, leg } = measured.entry;
    context.fillStyle = cornerColor(leg.event, leg.selection);
    context.fillRect(x, y, 3, measured.height);

    setFont(context, 6.8, 700, "Arial");
    context.fillStyle = "#8a8985";
    context.fillText(`BET ${String(index + 1).padStart(2, "0")} · ${bet.type} · ${bet.status}`.toUpperCase(), x + 14, y + 17);
    drawOutcome(context, x + width - 23, y + 9);

    setFont(context, 12, 600, "Georgia");
    context.fillStyle = COLORS.ink;
    drawLines(context, measured.selectionLines, x + 14, y + 40, 15);
    drawOdds(context, leg.odds, x + width - 52, y + 28);
    drawMoneyGrid(context, bet, x + 14, y + measured.height - 43, width - 28);
  }

  function drawParlay(context, measured, x, y, width, index) {
    const { bet } = measured.entry;
    context.fillStyle = COLORS.gold;
    context.fillRect(x, y, 3, measured.height);

    setFont(context, 6.8, 700, "Arial");
    context.fillStyle = "#8a8985";
    context.fillText(`PARLAY ${String(index + 1).padStart(2, "0")} · ${bet.status}`.toUpperCase(), x + 14, y + 17);
    drawOutcome(context, x + width - 23, y + 9);

    let legY = y + 31;
    measured.legs.forEach((leg, legIndex) => {
      context.beginPath();
      context.arc(x + 21, legY + 7, 7, 0, Math.PI * 2);
      context.fillStyle = "#8b6a2e";
      context.fill();
      setFont(context, 6, 700, "Arial");
      context.fillStyle = COLORS.white;
      context.textAlign = "center";
      context.fillText(String(legIndex + 1), x + 21, legY + 9);
      context.textAlign = "left";

      setFont(context, 10, 600, "Georgia");
      context.fillStyle = COLORS.ink;
      drawLines(context, leg.selectionLines, x + 35, legY + 9, 12);
      const eventY = legY + leg.selectionLines.length * 12 + 3;
      setFont(context, 7, 400, "Arial");
      context.fillStyle = "#87847e";
      drawLines(context, leg.eventLines, x + 35, eventY + 7, 9);
      drawOdds(context, leg.odds, x + width - 52, legY);
      legY += leg.height;
    });
    drawMoneyGrid(context, bet, x + 14, y + measured.height - 43, width - 28);
  }

  function drawGroup(context, group, x, y, width, index) {
    roundedPath(context, x, y, width, group.height, 7);
    context.fillStyle = COLORS.white;
    context.fill();
    context.save();
    roundedPath(context, x, y, width, group.height, 7);
    context.clip();
    context.fillStyle = "#202223";
    context.fillRect(x, y, width, CARD_HEADER_HEIGHT);
    context.fillStyle = group.type === "parlay" ? COLORS.gold : COLORS.red;
    context.fillRect(x, y, group.type === "parlay" ? width : width / 2, 2);
    if (group.type !== "parlay") {
      context.fillStyle = COLORS.blue;
      context.fillRect(x + width / 2, y, width / 2, 2);
    }
    context.restore();
    roundedPath(context, x, y, width, group.height, 7);
    context.strokeStyle = "#d5d2cb";
    context.stroke();

    setFont(context, 19, 400, "Georgia");
    context.fillStyle = "#7d8080";
    context.textAlign = "center";
    context.fillText(String(index + 1).padStart(2, "0"), x + 27, y + 34);
    context.textAlign = "left";
    setFont(context, 6, 700, "Arial");
    context.fillStyle = "#828584";
    context.fillText(group.type === "parlay" ? "COMBINED TICKETS" : "MATCHUP", x + 51, y + 18);
    setFont(context, 13, 600, "Georgia");
    context.fillStyle = "#f8f5ef";
    context.fillText(group.title, x + 51, y + 36, width - 155);

    const groupRisk = group.entries.reduce((total, entry) => total + (Number(entry.bet.stake) || 0), 0);
    setFont(context, 6, 700, "Arial");
    context.fillStyle = "#828584";
    context.textAlign = "right";
    context.fillText("RISK", x + width - 14, y + 18);
    setFont(context, 12, 600, "Georgia");
    context.fillStyle = "#f8f5ef";
    context.fillText(formatMoney(groupRisk), x + width - 14, y + 36);
    context.textAlign = "left";

    let entryY = y + CARD_HEADER_HEIGHT;
    group.measuredEntries.forEach((entry, entryIndex) => {
      if (entryIndex > 0) {
        context.strokeStyle = COLORS.lightLine;
        context.beginPath();
        context.moveTo(x, entryY);
        context.lineTo(x + width, entryY);
        context.stroke();
      }
      if (entry.type === "parlay") drawParlay(context, entry, x, entryY, width, entryIndex);
      else drawSingle(context, entry, x, entryY, width, entryIndex);
      entryY += entry.height;
    });
  }

  function drawReport(context, layout, options) {
    drawPaper(context, layout.height);
    let y = PAGE_PADDING;
    drawHeader(context, options, y);
    y += HEADER_HEIGHT + 31;

    setFont(context, 8, 700, "Arial");
    context.fillStyle = COLORS.ink;
    context.fillText(`${options.matchupCount} MATCHUP${options.matchupCount === 1 ? "" : "S"} ON THIS SHEET`, PAGE_PADDING + 2, y - 11);

    layout.groups.forEach((group, index) => {
      drawGroup(context, group, PAGE_PADDING, y, CONTENT_WIDTH, index);
      y += group.height + CARD_GAP;
    });

    y += 2;
    context.strokeStyle = COLORS.line;
    context.beginPath();
    context.moveTo(PAGE_PADDING, y);
    context.lineTo(WIDTH - PAGE_PADDING, y);
    context.stroke();
    setFont(context, 6, 600, "Arial");
    context.fillStyle = "#85837e";
    context.fillText(options.capturedLabel.toUpperCase(), PAGE_PADDING, y + 15);
    context.textAlign = "right";
    context.fillText("BEST CASE USES THE HIGHEST TICKET PER MATCHUP · PARLAYS COUNT SEPARATELY", WIDTH - PAGE_PADDING, y + 15);
    context.textAlign = "left";
  }

  function canvasToPng(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Chrome could not create the PNG file."));
      }, "image/png");
    });
  }

  async function render(options) {
    const scratch = document.createElement("canvas");
    const scratchContext = scratch.getContext("2d");
    if (!scratchContext) throw new Error("Chrome could not start the PNG renderer.");
    const layout = buildLayout(scratchContext, options.groups);

    const maximumDimension = 30000;
    const maximumArea = 180000000;
    const scale = Math.min(
      2,
      maximumDimension / WIDTH,
      maximumDimension / layout.height,
      Math.sqrt(maximumArea / (WIDTH * layout.height))
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(WIDTH * scale));
    canvas.height = Math.max(1, Math.floor(layout.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Chrome could not start the PNG renderer.");
    context.scale(scale, scale);
    drawReport(context, layout, options);
    return canvasToPng(canvas);
  }

  window.BetExporterPng = { render };
})();
