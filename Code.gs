// ── Set these two values ──────────────────────────────────────
const SHEET_ID   = "YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "1";   // tab is named "1" as seen in screenshot

// ── Column numbers matching YOUR sheet exactly (A=1, B=2 …) ──
// Sheet layout right-to-left: N=تدبر | M=قرآن | L=قيام | K=نوافل
//   J=جماعة | I=ذكر | H=توبة | G=استغفار | F=دعاء | E=درس
//   D=تاريخ | C=يوم | B=م
const COLS = {
  date      : 4,   // D — التاريخ  (read only, never written)
  dua       : 6,   // F — الدعاء
  istighfar : 7,   // G — الاستغفار
  tawbah    : 8,   // H — التوبة
  dhikr     : 9,   // I — الذكر
  jama      : 10,  // J — صلاة الجماعة
  nawafil   : 11,  // K — النوافل
  qiyam     : 12,  // L — قيام الليل
  quran     : 13,  // M — القرآن
  tadabbur  : 14,  // N — تدبر القرآن
};

// ── Serve the HTML page ───────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("يومياتي")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Save scores — called via google.script.run ────────────────
function saveScores(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("لم يتم العثور على الورقة: " + SHEET_NAME);

  var row = findTodayRow(sheet);
  if (row === -1) throw new Error("لم يُعثر على صف اليوم. شغّل debugDate() للتشخيص.");

  // Write ONLY score columns F–N, never touch date column D
  var scoreKeys = ["dua","istighfar","tawbah","dhikr","jama","nawafil","qiyam","quran","tadabbur"];
  var values    = scoreKeys.map(function(k){ return Number(data[k]) || 0; });

  // Batch write all 9 scores in one call starting at column F (6)
  sheet.getRange(row, COLS.dua, 1, values.length).setValues([values]);

  return "تم الحفظ بنجاح ✓";
}

// ── Find the row whose date column matches today ──────────────
function findTodayRow(sheet) {
  var today   = fmtDate(new Date());
  var lastRow = sheet.getLastRow();
  var cells   = sheet.getRange(1, COLS.date, lastRow, 1).getValues();

  for (var i = 0; i < cells.length; i++) {
    var raw   = cells[i][0];
    var asStr = (raw instanceof Date) ? fmtDate(raw) : String(raw).trim();
    if (asStr === today) return i + 1;
  }
  return -1;
}

// ── Run this manually in the editor to verify date matching ──
function debugDate() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  var today = fmtDate(new Date());
  var last  = sheet.getLastRow();
  var cells = sheet.getRange(1, COLS.date, last, 1).getValues();

  var log = "Today: [" + today + "]\n\nFirst 20 rows of date column (D):\n";
  for (var i = 0; i < Math.min(cells.length, 180); i++) {
    var raw   = cells[i][0];
    var asStr = (raw instanceof Date) ? fmtDate(raw) : String(raw).trim();
    if (asStr === today || asStr.indexOf("Jun-2026") !== -1) {
      log += "Row " + (i+1) + ": [" + asStr + "]" + (asStr === today ? " ← MATCH ✓" : "") + "\n";
    }
  }
  Logger.log(log);
  return log;
}

// ── Format as "6-Jun-2026" to match sheet display ────────────
function fmtDate(d) {
  var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d.getDate() + "-" + m[d.getMonth()] + "-" + d.getFullYear();
}
