// ── Config ────────────────────────────────────────────────────
const SHEET_ID   = "YOUR_GOOGLE_SHEET_ID_HERE";
const SHEET_NAME = "1";

// Sheet: B=م | C=اليوم | D=التاريخ | E=حضور | F=دعاء | G=استغفار
//        H=توبة | I=ذكر | J=جماعة | K=نوافل | L=قيام | M=قرآن | N=تدبر
var SHEET_COLS = {
  rowNum    : 2,   // B
  dayName   : 3,   // C
  date      : 4,   // D
  dua       : 6,   // F
  istighfar : 7,   // G
  tawbah    : 8,   // H
  dhikr     : 9,   // I
  jama      : 10,  // J
  nawafil   : 11,  // K
  qiyam     : 12,  // L
  quran     : 13,  // M
  tadabbur  : 14,  // N
};

var SCORE_KEYS = ["dua","istighfar","tawbah","dhikr","jama","nawafil","qiyam","quran","tadabbur"];

// ── Serve HTML ────────────────────────────────────────────────
function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("جدول محاسبة")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Returns the 7-day window: today and the 6 days before it ─
function getWeekDates() {
  var week = [];
  var now  = new Date();
  for (var i = 6; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    week.push(fmtDate(d));
  }
  return week; // oldest → newest
}

// ── Save scores for a specific date ──────────────────────────
function saveScores(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("لم يتم العثور على الورقة: " + SHEET_NAME);

  var targetDate = data._date || fmtDate(new Date());
  var row = findRowByDate(sheet, targetDate);
  if (row === -1) throw new Error("لم يُعثر على صف التاريخ: " + targetDate);

  var values = SCORE_KEYS.map(function(k){ return Number(data[k]) || 0; });
  sheet.getRange(row, SHEET_COLS.dua, 1, values.length).setValues([values]);

  return "تم الحفظ بنجاح ✓ (" + targetDate + ")";
}

// ── Get date list — last 7 days only ─────────────────────────
function getDateList() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("لم يتم العثور على الورقة");

  var weekDates = getWeekDates();
  var lastRow   = sheet.getLastRow();
  var startRow  = 9;
  var numRows   = lastRow - startRow + 1;
  if (numRows <= 0) return [];

  var dateVals  = sheet.getRange(startRow, SHEET_COLS.date,    numRows, 1).getValues();
  var dayVals   = sheet.getRange(startRow, SHEET_COLS.dayName, numRows, 1).getValues();
  var scoreVals = sheet.getRange(startRow, SHEET_COLS.dua,     numRows, SCORE_KEYS.length).getValues();

  // Build lookup map from sheet
  var byDate = {};
  for (var i = 0; i < dateVals.length; i++) {
    var raw = dateVals[i][0];
    if (!raw || raw === "") continue;
    var dateStr = (raw instanceof Date) ? fmtDate(raw) : String(raw).trim();
    if (!dateStr) continue;
    var total = 0;
    for (var k = 0; k < SCORE_KEYS.length; k++) total += Number(scoreVals[i][k]) || 0;
    byDate[dateStr] = {
      date    : dateStr,
      dayName : String(dayVals[i][0] || ""),
      total   : total,
      filled  : total > 0
    };
  }

  // Return only the 7-day window in order oldest → newest
  var list = [];
  weekDates.forEach(function(d) {
    if (byDate[d]) list.push(byDate[d]);
  });
  return list;
}

// ── Get all data — last 7 days only (for stats) ───────────────
function getAllData() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("لم يتم العثور على الورقة");

  var weekDates = getWeekDates();
  var lastRow   = sheet.getLastRow();
  var startRow  = 9;
  var numRows   = lastRow - startRow + 1;
  if (numRows <= 0) return [];

  var range  = sheet.getRange(startRow, SHEET_COLS.date, numRows, SHEET_COLS.tadabbur - SHEET_COLS.date + 1);
  var vals   = range.getValues();
  var offset = SHEET_COLS.dua - SHEET_COLS.date;

  // Build lookup map
  var byDate = {};
  for (var i = 0; i < vals.length; i++) {
    var raw = vals[i][0];
    if (!raw || raw === "") continue;
    var dateStr = (raw instanceof Date) ? fmtDate(raw) : String(raw).trim();
    if (!dateStr) continue;
    var scores = {};
    var total  = 0;
    for (var k = 0; k < SCORE_KEYS.length; k++) {
      var val = Number(vals[i][offset + k]) || 0;
      scores[SCORE_KEYS[k]] = val;
      total += val;
    }
    byDate[dateStr] = {
      date   : dateStr,
      scores : scores,
      total  : total,
      pct    : Math.round(total / 90 * 100)
    };
  }

  // Return only the 7-day window in order oldest → newest
  var result = [];
  weekDates.forEach(function(d) {
    if (byDate[d]) result.push(byDate[d]);
  });
  return result;
}

// ── Get scores for a specific date (pre-fill sliders) ─────────
function getScoresForDate(dateStr) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("لم يتم العثور على الورقة");

  var row = findRowByDate(sheet, dateStr);
  if (row === -1) return null;

  var vals   = sheet.getRange(row, SHEET_COLS.dua, 1, SCORE_KEYS.length).getValues()[0];
  var scores = {};
  SCORE_KEYS.forEach(function(k, i){ scores[k] = Number(vals[i]) || 0; });
  return scores;
}

// ── Helpers ───────────────────────────────────────────────────
function findRowByDate(sheet, dateStr) {
  var last  = sheet.getLastRow();
  var cells = sheet.getRange(1, SHEET_COLS.date, last, 1).getValues();
  for (var i = 0; i < cells.length; i++) {
    var raw = cells[i][0];
    var s   = (raw instanceof Date) ? fmtDate(raw) : String(raw).trim();
    if (s === dateStr) return i + 1;
  }
  return -1;
}

function fmtDate(d) {
  var m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return d.getDate() + "-" + m[d.getMonth()] + "-" + d.getFullYear();
}

function debugDate() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);
  var today = fmtDate(new Date());
  var last  = sheet.getLastRow();
  var cells = sheet.getRange(1, SHEET_COLS.date, last, 1).getValues();
  var log   = "Today: [" + today + "]\nWeek: " + getWeekDates().join(", ") + "\n\n";
  for (var i = 0; i < Math.min(cells.length, 200); i++) {
    var raw = cells[i][0];
    var s   = (raw instanceof Date) ? fmtDate(raw) : String(raw).trim();
    if (s && s.indexOf("2026") !== -1) {
      log += "Row " + (i+1) + ": [" + s + "]" + (s === today ? " ← TODAY ✓" : "") + "\n";
    }
  }
  Logger.log(log);
  return log;
}
