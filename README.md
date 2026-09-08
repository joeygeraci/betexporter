# Fight Night Bet Sheet

A private Chrome extension that turns the sports bets shown on Bovada’s Account Transactions page into a polished, printable fight-night cheat sheet.

The extension reads only the transaction rows already rendered in your browser. It does not make network requests, send data to a server, or use analytics. A generated report is kept in Chrome’s in-memory session storage and disappears when Chrome closes.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** in the upper-right corner.
3. Click **Load unpacked**.
4. Choose this `betexporter` folder.
5. Pin **Fight Night Bet Sheet** from Chrome’s Extensions menu if you want it visible in the toolbar.

After making code changes, return to `chrome://extensions` and click the extension’s reload button.

## Use

1. Sign in to Bovada and open `https://www.bovada.lv/account/transactions`.
2. Choose the date range containing the bets you want on the sheet and let the list finish loading.
3. Click the extension icon, then **Create printable sheet**.
4. Optionally edit the sheet title or event note.
5. Click **Print / Save PDF**. Use Chrome’s print dialog to print the sheet or save it as a PDF.

The report keeps an A5-width layout, stacks straight bets by matchup, and keeps multi-leg parlays together. When you click **Print / Save PDF**, its page height is measured automatically so the entire sheet prints as one continuous PDF page instead of being split across fixed-size pages. **Save PNG** renders that same complete sheet as one long, high-resolution image. Each bet shows its selection, American odds, amount risked, potential profit (`To Win`), and total payout (risk + profit). Summary winnings use only the highest result in each matchup, since mutually exclusive picks cannot all win; parlays count as separate tickets. PDF, PNG, and CSV filenames include the capture date. The CSV button provides the same captured data in a spreadsheet-friendly format.

## Scope

The extension action and content scripts are limited to this exact page:

`https://www.bovada.lv/account/transactions`

No build step or package installation is required. The code uses standard Manifest V3 and browser APIs, so the folder can be loaded directly into Chrome.

## Troubleshooting

- **The icon is disabled:** make sure the URL and hostname exactly match the page above.
- **No bets found:** select a wider date range, wait for Bovada to render the transaction rows, and reopen the extension.
- **Refresh this page:** this usually means the extension was installed or reloaded after Bovada was already open. Refresh the Bovada tab once.
- **Some old bets are missing:** Bovada controls which transactions are available through its date-range selector. Select the desired range before creating the report.

## Project layout

- `manifest.json` — Manifest V3 configuration and page permissions
- `src/extractor.js` — desktop/mobile Bovada transaction parsing and virtual-list collection
- `src/content.js` — scoped page messaging and report capture
- `popup.html`, `src/popup.*` — extension toolbar interface
- `report.html`, `src/report.*` — editable, printable report and CSV export
- `src/png-renderer.js` — safe, direct-canvas renderer for the long PNG export
- `src/service-worker.js` — enables the extension action only on the supported Bovada page
- `example/page.html` — saved Bovada markup used to verify selectors

## Verification

On macOS, the dependency-free extractor test can be run with:

```sh
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/extractor.test.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/report.test.js
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tests/png-renderer.test.js
```
