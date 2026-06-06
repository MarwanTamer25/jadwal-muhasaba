# 🕌 جدول محاسبة — Daily Ibadah Tracker

A Google Apps Script web app that replaces manual Google Sheets editing with a clean, mobile-friendly UI. Score your daily Islamic habits (0–10 each) and sync them directly to your Google Sheet with one tap.

---

## 📁 Project Files

| File | Description |
|------|-------------|
| `Code.gs` | Google Apps Script backend — finds today's row and writes scores |
| `index.html` | Main UI — responsive, works great on laptop & desktop |
| `index-mobile.html` | Previous version — mobile-first, single-column layout |

---

## ✨ Features

- 9 daily ibadah tasks, each scored 0–10 via a slider
- Live progress bar showing total out of 90
- Automatically finds today's row in your Google Sheet by date
- Saves all scores in one click — no manual cell editing
- Fully Arabic, right-to-left layout
- Responsive: 2-column grid on desktop, single column on mobile
- Works as a home screen app (Add to Home Screen on iOS/Android)

---

## 🛠️ Setup — Step by Step

### Step 1 — Open Google Apps Script

1. Open your Google Sheet
2. Click **Extensions → Apps Script**
3. A new Apps Script project opens in a new tab

---

### Step 2 — Add the backend (Code.gs)

1. In the Apps Script editor, click on `Code.gs` in the left sidebar
2. **Select all** the existing code and **delete** it
3. **Paste** the contents of `Code.gs` from this repo
4. Find line 2 and replace the placeholder with your **Sheet ID**:

```js
const SHEET_ID = "YOUR_GOOGLE_SHEET_ID_HERE";
```

> Your Sheet ID is the long string in your Google Sheet URL:
> `https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`

5. Find line 3 and set your **sheet tab name** (the name at the bottom of your spreadsheet):

```js
const SHEET_NAME = "1";  // change to match your tab name exactly
```

6. Check the `COLS` object — make sure the column numbers match your sheet. Column A = 1, B = 2, C = 3, etc.

```js
const COLS = {
  date      : 4,   // D column — التاريخ  (never written, read only)
  dua       : 6,   // F column — الدعاء
  istighfar : 7,   // G column — الاستغفار
  tawbah    : 8,   // H column — التوبة
  dhikr     : 9,   // I column — الذكر
  jama      : 10,  // J column — صلاة الجماعة
  nawafil   : 11,  // K column — النوافل
  qiyam     : 12,  // L column — قيام الليل
  quran     : 13,  // M column — القرآن
  tadabbur  : 14,  // N column — تدبر القرآن
};
```

7. Press **Ctrl+S** (or Cmd+S) to save

---

### Step 3 — Add the HTML file (index.html)

1. In the Apps Script left sidebar, click **+** next to "Files"
2. Choose **HTML**
3. Name it exactly **`index`** (no `.html` — Apps Script adds it automatically)
4. **Select all** the placeholder code and **delete** it
5. **Paste** the contents of `index.html` from this repo
6. Press **Ctrl+S** to save

---

### Step 4 — Deploy as a Web App

1. Click the **Deploy** button (top right) → **New deployment**
2. Click the ⚙️ gear icon next to "Type" → select **Web app**
3. Fill in the settings:
   - **Description**: جدول محاسبة v1 (or anything you like)
   - **Execute as**: Me
   - **Who has access**: Anyone *(required so you can open it on your phone without signing in every time)*
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → click **Allow**
6. Copy the **Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfyc.../exec`

> ⚠️ **Save this URL** — it's your app's permanent address.

---

### Step 5 — Verify the date column matches

Before using the app, run the built-in debug function to make sure your date format matches:

1. In the Apps Script editor, click the function dropdown (top bar, next to the Run ▶ button)
2. Select **`debugDate`**
3. Click **Run ▶**
4. Click **Execution log** (bottom panel)
5. Look for a line marked **`← MATCH ✓`** — this confirms today's row was found

If there's no match, the date format in your sheet is different. Tell the format you see (e.g. `06-Jun-2026` vs `6-Jun-2026`) and update `fmtDate()` in `Code.gs` accordingly.

---

### Step 6 — Open on your phone (optional but recommended)

**On iPhone (Safari):**
1. Open the Web App URL in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Tap **Add** — done! It opens like a native app

**On Android (Chrome):**
1. Open the Web App URL in Chrome
2. Tap the **⋮ menu** → **Add to Home screen**
3. Tap **Add**

---

## 🔄 How to Update the App

Whenever you change `Code.gs` or `index.html`:

1. Click **Deploy → Manage deployments**
2. Click the **✏️ pencil** icon on your existing deployment
3. Change **Version** to **New version**
4. Click **Deploy**

> The URL stays the same — no need to update your home screen shortcut.

---

## 🗂️ Column Mapping

The app writes to these columns in your sheet. Adjust `COLS` in `Code.gs` if your layout differs:

| Column Letter | Column Number | Arabic Name | Task Key |
|:---:|:---:|---|---|
| D | 4 | التاريخ | *(date — read only)* |
| F | 6 | الدعاء | `dua` |
| G | 7 | الاستغفار | `istighfar` |
| H | 8 | التوبة | `tawbah` |
| I | 9 | الذكر | `dhikr` |
| J | 10 | صلاة الجماعة | `jama` |
| K | 11 | النوافل | `nawafil` |
| L | 12 | قيام الليل | `qiyam` |
| M | 13 | القرآن | `quran` |
| N | 14 | تدبر القرآن | `tadabbur` |

---

## ⚠️ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Illegal spreadsheet id or key` | Wrong `SHEET_ID` | Copy the ID from your sheet URL between `/d/` and `/edit` |
| `Sheet not found` | Wrong `SHEET_NAME` | Check the tab name at the bottom of your spreadsheet |
| `لم يُعثر على صف اليوم` | Date format mismatch | Run `debugDate()` and compare the format with `fmtDate()` |
| `You are trying to edit a protected cell` | Writing to wrong column | Run `debugDate()` to confirm row, check `COLS` numbers |
| `Failed to fetch` | Opening `index.html` as a local file | Always open the **Web App URL** (`script.google.com/.../exec`), never open the HTML file directly |
| `google.script.run is not defined` | Same as above | Same fix — use the Web App URL |

---

## 🗃️ Versions

| File | Description |
|------|-------------|
| `index.html` | **v2** — Desktop + mobile responsive. 2-column grid on wide screens, fluid `clamp()` sizing, gradient header, elevated cards with hover effects |
| `index-mobile.html` | **v1** — Mobile-first, single-column. Simpler, lighter. Recommended if you only use this on your phone |

To use the mobile version: in Apps Script, replace the contents of `index.html` with the contents of `index-mobile.html`, then redeploy.

---

## 📄 License

MIT — use freely, modify as needed.
