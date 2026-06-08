# Apps Script Habit Tracker Web App

This folder contains a single-codebase Google Apps Script web app for a mobile Arabic habit tracker connected to Google Sheets.

## Files

- `Code.gs`: backend routing, sheet detection, statistics, and saving.
- `Index.html`: main HTML template.
- `Styles.html`: responsive mobile-first styling.
- `JavaScript.html`: client-side rendering and `google.script.run` save logic.
- `appsscript.json`: Apps Script manifest.

## Deployment

1. Create a new Google Apps Script project.
2. Add the files in this folder with the same names.
3. Deploy as a Web App.
4. Set **Execute as** to `Me`.
5. Set access to `Anyone` or `Anyone with a Google Account`.
6. Open with a routed URL:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?sheet_id=SPREADSHEET_ID
```

## Optional Master Router

To route by `user_id`, set `CONFIG.masterSpreadsheetId` in `Code.gs`.

The master control sheet should be named `Users` and include:

| user_id | spreadsheet_id | sheet_name |
|---|---|---|
| UserA | 1abc... | Sheet1 |

Then open:

```text
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?user_id=UserA
```

## Sheet Assumptions

- The date column is `D`.
- Habit names are in row `6`.
- Habit descriptions are in row `8`.
- The 9 habit score columns are `F:N`, producing a daily total out of `90`.
- The app finds the first real date row under row `8` and matches saves by date.
- Scores are written from 0 to 10 into the matching date row.

If your sheet layout changes, update the fixed columns in `CONFIG` inside `Code.gs`.
