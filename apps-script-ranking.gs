// LaberinOjo ranking backend para Google Apps Script.
// Uso:
// 1. Crea o abre la hoja de Google Sheets del ranking.
// 2. Extensiones -> Apps Script.
// 3. Pega este código.
// 4. Deploy -> New deployment -> Web app.
// 5. Ejecutar como: Me. Acceso: Anyone.
// 6. Copia la URL /exec y pégala en RANKING_ENDPOINT dentro de index.html.

const SHEET_NAME = 'Scores';
const MAX_NAME_LENGTH = 12;

function doGet() {
  return json_({ ok: true, top: getTop10_() });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const name = cleanName_(body.name);
    const level = clampInt_(body.level, 1, 100000);
    const time = clampNumber_(body.time, 0, 999999);
    const score = clampInt_(body.score, 0, 999999999);
    const game = String(body.game || 'LaberinOjo').slice(0, 40);
    const version = String(body.version || '1').slice(0, 20);

    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      name,
      level,
      time,
      score,
      game,
      version
    ]);

    return json_({ ok: true, top: getTop10_() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['timestamp', 'name', 'level', 'time', 'score', 'game', 'version']);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getTop10_() {
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];

  const rows = sheet.getRange(2, 1, last - 1, 7).getValues();
  const items = rows.map(row => ({
    timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
    name: cleanName_(row[1]),
    level: clampInt_(row[2], 1, 100000),
    time: clampNumber_(row[3], 0, 999999),
    score: clampInt_(row[4], 0, 999999999)
  })).filter(item => item.name && item.level > 0);

  items.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    if (a.time !== b.time) return a.time - b.time;
    return b.score - a.score;
  });

  return items.slice(0, 10);
}

function cleanName_(value) {
  return String(value || 'ANON')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_ -]/g, '')
    .trim()
    .slice(0, MAX_NAME_LENGTH) || 'ANON';
}

function clampInt_(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clampNumber_(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
