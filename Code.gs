const CONFIG = {
  masterSpreadsheetId: '',
  masterSheetName: 'Users',
  defaultDataSheetName: '',
  headerSearchRows: 80,
  recentDaysLimit: 7,
  excellentThreshold: 80,
  dateColumn: 4,
  habitHeaderRow: 6,
  habitDescriptionRow: 8,
  firstHabitColumn: 6,
  lastHabitColumn: 14,
  timezone: 'Africa/Cairo',
  dateFormats: ['d-MMM-yyyy', 'dd-MMM-yyyy', 'd-M-yyyy', 'dd-M-yyyy']
};

const SUMMARY_HEADER_KEYWORDS = [
  'م', 'اليوم', 'التاريخ', 'الدرس', 'الحضور', 'العمل',
  'تقييم الحضور', 'تقييم الأعمال', 'attendance', 'work', 'date', 'day', 'id'
];

function doGet(e) {
  const route = resolveRoute_(e && e.parameter ? e.parameter : {});
  const template = HtmlService.createTemplateFromFile('Index');
  template.bootstrap = JSON.stringify(buildBootstrap_(route));

  return template
    .evaluate()
    .setTitle('جدول محاسبة')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getHabitTrackerData(routeInput) {
  const route = resolveRoute_(routeInput || {});
  return buildBootstrap_(route);
}

function saveDailyHabits(routeInput, dateKey, habitData) {
  const route = resolveRoute_(routeInput || {});
  const context = getSheetContext_(route.spreadsheetId, route.sheetName);
  const row = findRowByDateKey_(context, dateKey);

  if (!row) {
    throw new Error('لم يتم العثور على صف التاريخ المحدد في ورقة المستخدم.');
  }

  const values = context.habits.map(function(habit) {
    const raw = habitData && habitData[habit.key] !== undefined ? habitData[habit.key] : '';
    if (raw === '' || raw === null) return '';
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > 10) {
      throw new Error('قيمة غير صحيحة للعادة: ' + habit.name);
    }
    return value;
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    context.habits.forEach(function(habit, index) {
      context.sheet.getRange(row.rowNumber, habit.column).setValue(values[index]);
    });
  } finally {
    lock.releaseLock();
  }

  return buildBootstrap_(route);
}

function resolveRoute_(params) {
  const sheetId = sanitize_(params.sheet_id || params.spreadsheetId || params.spreadsheet_id);
  const userId = sanitize_(params.user_id || params.userId);
  const sheetName = sanitize_(params.sheet_name || params.sheetName || CONFIG.defaultDataSheetName);

  if (sheetId) {
    return { spreadsheetId: sheetId, userId: userId || '', sheetName: sheetName || '' };
  }

  if (userId && CONFIG.masterSpreadsheetId) {
    const mapped = lookupUserSpreadsheet_(userId);
    return {
      spreadsheetId: mapped.spreadsheetId,
      userId: userId,
      sheetName: sheetName || mapped.sheetName || ''
    };
  }

  throw new Error('يرجى تمرير sheet_id في رابط التطبيق، أو إعداد masterSpreadsheetId واستخدام user_id.');
}

function lookupUserSpreadsheet_(userId) {
  const ss = SpreadsheetApp.openById(CONFIG.masterSpreadsheetId);
  const sheet = ss.getSheetByName(CONFIG.masterSheetName);
  if (!sheet) throw new Error('لم يتم العثور على ورقة Users في ملف التحكم.');

  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift().map(function(value) { return normalize_(value); });
  const userCol = headers.indexOf('user_id');
  const idCol = headers.indexOf('spreadsheet_id');
  const sheetNameCol = headers.indexOf('sheet_name');

  if (userCol === -1 || idCol === -1) {
    throw new Error('ملف التحكم يحتاج أعمدة user_id و spreadsheet_id.');
  }

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][userCol]).trim() === userId) {
      return {
        spreadsheetId: String(rows[i][idCol]).trim(),
        sheetName: sheetNameCol >= 0 ? String(rows[i][sheetNameCol]).trim() : ''
      };
    }
  }

  throw new Error('لم يتم العثور على المستخدم في ملف التحكم: ' + userId);
}

function buildBootstrap_(route) {
  const context = getSheetContext_(route.spreadsheetId, route.sheetName);
  const rows = readRows_(context);
  const todayKey = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd');
  const recentDays = rows
    .filter(function(row) { return row.dateKey <= todayKey; })
    .slice(-CONFIG.recentDaysLimit)
    .reverse();
  const stats = calculateStats_(rows, context.habits, recentDays);

  return {
    route: route,
    spreadsheetName: context.spreadsheet.getName(),
    sheetName: context.sheet.getName(),
    generatedAt: formatDisplayDate_(new Date()),
    habits: context.habits,
    recentDays: recentDays,
    stats: stats
  };
}

function getSheetContext_(spreadsheetId, requestedSheetName) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = requestedSheetName
    ? spreadsheet.getSheetByName(requestedSheetName)
    : spreadsheet.getSheets()[0];

  if (!sheet) throw new Error('لم يتم العثور على ورقة البيانات المطلوبة.');

  const structure = detectStructure_(sheet);
  return Object.assign({ spreadsheet: spreadsheet, sheet: sheet }, structure);
}

function detectStructure_(sheet) {
  const lastRow = sheet.getLastRow();
  const width = CONFIG.lastHabitColumn - CONFIG.firstHabitColumn + 1;
  const headers = sheet
    .getRange(CONFIG.habitHeaderRow, CONFIG.firstHabitColumn, 1, width)
    .getDisplayValues()[0];
  const descriptions = sheet
    .getRange(CONFIG.habitDescriptionRow, CONFIG.firstHabitColumn, 1, width)
    .getDisplayValues()[0];
  const habitColumns = [];

  for (var index = 0; index < width; index++) {
    const column = CONFIG.firstHabitColumn + index;
    const name = String(headers[index] || '').trim();
    if (!isValidHabitHeader_(name)) continue;

    habitColumns.push({
      key: 'h' + column,
      name: name,
      description: cleanDescription_(descriptions[index]),
      column: column
    });
  }

  if (!habitColumns.length) {
    throw new Error('لم يتم العثور على عادات في الصف 6 ضمن الأعمدة F:N.');
  }

  const dataStartRow = findFirstDateRowInSheet_(sheet, CONFIG.habitDescriptionRow + 1, CONFIG.dateColumn, lastRow);
  if (!dataStartRow) {
    throw new Error('لم يتم العثور على صفوف تواريخ بعد صف العادات.');
  }

  return {
    headerRowNumber: CONFIG.habitHeaderRow,
    dataStartRow: dataStartRow,
    dateColumn: CONFIG.dateColumn,
    habits: habitColumns
  };
}

function readRows_(context) {
  const lastRow = context.sheet.getLastRow();
  if (lastRow < context.dataStartRow) return [];

  const numRows = lastRow - context.dataStartRow + 1;
  const maxHabitCol = context.habits.reduce(function(max, habit) {
    return Math.max(max, habit.column);
  }, 1);
  const readUntil = Math.max(context.dateColumn, maxHabitCol);
  const values = context.sheet.getRange(context.dataStartRow, 1, numRows, readUntil).getValues();
  const displayValues = context.sheet.getRange(context.dataStartRow, 1, numRows, readUntil).getDisplayValues();

  return values.map(function(row, index) {
    const displayRow = displayValues[index];
    const rawDate = row[context.dateColumn - 1];
    const displayDate = displayRow[context.dateColumn - 1];
    const date = coerceDate_(rawDate, displayDate);
    if (!date) return null;

    const habitValues = {};
    const missingHabitNames = [];
    var earned = 0;
    var filled = 0;

    context.habits.forEach(function(habit) {
      const raw = row[habit.column - 1];
      const display = displayRow[habit.column - 1];
      const value = normalizeScore_(raw, display);
      habitValues[habit.key] = value;
      if (value !== '') {
        earned += Number(value);
        filled++;
      } else {
        missingHabitNames.push(habit.name);
      }
    });

    const possible = context.habits.length * 10;
    const percentage = possible ? Math.round((earned / possible) * 100) : 0;

    return {
      rowNumber: context.dataStartRow + index,
      dateKey: Utilities.formatDate(date, CONFIG.timezone, 'yyyy-MM-dd'),
      displayDate: formatDisplayDate_(date),
      shortDate: Utilities.formatDate(date, CONFIG.timezone, 'd-MMM-yyyy'),
      dayName: Utilities.formatDate(date, CONFIG.timezone, 'EEEE'),
      values: habitValues,
      earned: earned,
      possible: possible,
      percentage: percentage,
      filledCount: filled,
      totalHabits: context.habits.length,
      missingHabitNames: missingHabitNames,
      status: filled === 0 ? 'empty' : filled === context.habits.length ? 'complete' : 'partial'
    };
  }).filter(Boolean);
}

function calculateStats_(rows, habits, recentDays) {
  const totalEarned = rows.reduce(function(sum, row) { return sum + row.earned; }, 0);
  const totalPossible = rows.reduce(function(sum, row) { return sum + row.possible; }, 0);

  const averages = habits.map(function(habit, index) {
    const scores = rows.map(function(row) { return row.values[habit.key]; })
      .filter(function(value) { return value !== ''; })
      .map(Number);
    const average = scores.length
      ? Math.round((scores.reduce(function(sum, value) { return sum + value; }, 0) / scores.length) * 10) / 10
      : 0;

    return {
      key: habit.key,
      name: habit.name,
      average: average,
      percentage: Math.round((average / 10) * 100),
      colorIndex: index
    };
  });

  return {
    overallPercentage: totalPossible ? Math.round((totalEarned / totalPossible) * 100) : 0,
    recentIncompleteDays: (recentDays || []).filter(function(row) {
      return row.missingHabitNames && row.missingHabitNames.length;
    }),
    averages: averages
  };
}

function findRowByDateKey_(context, dateKey) {
  return readRows_(context).find(function(row) { return row.dateKey === dateKey; });
}

function isDateHeader_(value) {
  const normalized = normalize_(value);
  return normalized === 'التاريخ' || normalized === 'date';
}

function isSummaryHeader_(value) {
  const normalized = normalize_(value);
  return SUMMARY_HEADER_KEYWORDS.some(function(keyword) {
    return normalized === normalize_(keyword);
  });
}

function isValidHabitHeader_(value) {
  const text = String(value || '').trim();
  const normalized = normalize_(text);
  if (!text || isSummaryHeader_(text)) return false;
  if (normalized === 'تم' || normalized === 'done') return false;
  if (/^\d+(\.\d+)?%?$/.test(text)) return false;
  if (!/[A-Za-z\u0600-\u06FF]/.test(text)) return false;
  return true;
}

function cleanDescription_(value) {
  const text = String(value || '').trim();
  if (!text || normalize_(text) === 'تم') return '';
  return text;
}

function findFirstDateRowIndex_(rawValues, displayValues, startRowIndex, colIndex) {
  for (var row = startRowIndex; row < rawValues.length; row++) {
    if (coerceDate_(rawValues[row][colIndex], displayValues[row][colIndex])) return row;
  }
  return -1;
}

function findFirstDateRowInSheet_(sheet, startRow, dateColumn, lastRow) {
  if (lastRow < startRow) return null;
  const numRows = lastRow - startRow + 1;
  const rawValues = sheet.getRange(startRow, dateColumn, numRows, 1).getValues();
  const displayValues = sheet.getRange(startRow, dateColumn, numRows, 1).getDisplayValues();

  for (var index = 0; index < numRows; index++) {
    if (coerceDate_(rawValues[index][0], displayValues[index][0])) {
      return startRow + index;
    }
  }

  return null;
}

function countDateRows_(rawValues, displayValues, startRowIndex, colIndex) {
  var count = 0;
  for (var row = startRowIndex; row < rawValues.length; row++) {
    if (coerceDate_(rawValues[row][colIndex], displayValues[row][colIndex])) count++;
  }
  return count;
}

function findHabitHeaderRowIndex_(displayValues, rawValues, candidate, lastColumn) {
  var bestRowIndex = Math.max(0, candidate.headerRowIndex - 2);
  var bestScore = -1;
  const from = Math.max(0, candidate.headerRowIndex - 5);
  const to = Math.min(displayValues.length - 1, candidate.headerRowIndex);

  for (var row = from; row <= to; row++) {
    var score = 0;
    for (var col = 0; col < lastColumn; col++) {
      const value = String(displayValues[row][col] || '').trim();
      if (!isValidHabitHeader_(value)) continue;
      if (!isLikelyHabitScoreColumn_(rawValues, displayValues, candidate.firstDateRowIndex, col)) continue;
      score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = row;
    }
  }

  return bestRowIndex;
}

function findDescriptionRowIndex_(displayValues, habitHeaderRowIndex, tableHeaderRowIndex) {
  const preferred = habitHeaderRowIndex + 2;
  if (preferred < displayValues.length && preferred <= tableHeaderRowIndex + 1) return preferred;
  const fallback = habitHeaderRowIndex + 1;
  return fallback < displayValues.length ? fallback : habitHeaderRowIndex;
}

function isLikelyHabitScoreColumn_(rawValues, displayValues, startRowIndex, colIndex) {
  var seenScore = false;
  var inspected = 0;

  for (var row = startRowIndex; row < rawValues.length && inspected < 25; row++, inspected++) {
    const raw = rawValues[row][colIndex];
    const display = String(displayValues[row][colIndex] || '').trim();
    if (raw === '' || raw === null || raw === undefined || display === '') continue;
    if (display.indexOf('%') !== -1) return false;
    const numeric = Number(raw);
    if (Number.isNaN(numeric) || numeric < 0 || numeric > 10) return false;
    seenScore = true;
  }

  return seenScore;
}

function normalizeScore_(raw, display) {
  if (raw === '' || raw === null || raw === undefined) return '';
  if (typeof raw === 'number') return clampScore_(raw);

  const text = String(display || raw).trim();
  if (!text) return '';
  const cleaned = text.replace('%', '').replace(/[^\d.-]/g, '');
  if (!cleaned) return '';
  const value = Number(cleaned);
  if (Number.isNaN(value)) return '';

  return value > 10 ? clampScore_(value / 10) : clampScore_(value);
}

function clampScore_(value) {
  return Math.max(0, Math.min(10, Math.round(Number(value))));
}

function coerceDate_(raw, display) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const text = String(display || raw || '').trim();
  if (!text) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDisplayDate_(date) {
  return Utilities.formatDate(date, CONFIG.timezone, 'EEEE - d-MMM-yyyy');
}

function normalize_(value) {
  return String(value || '').trim().toLowerCase();
}

function sanitize_(value) {
  return String(value || '').trim();
}
