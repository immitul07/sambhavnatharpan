const ExcelJS = require('exceljs');
const path = require('path');

const NIYAMS = [
  { gu: 'જિન પૂજા', pts: 10 },
  { gu: 'અષ્ટપ્રકારી પૂજા', pts: 30 },
  { gu: '૩ પ્રદક્ષિણા આપવી', pts: 10 },
  { gu: 'ચૈત્યવંદન', pts: 20 },
  { gu: 'ગુરૂવંદન', pts: 20 },
  { gu: 'રાઈ પ્રતિક્રમણ', pts: 30 },
  { gu: 'દેવસિય પ્રતિક્રમણ', pts: 30 },
  { gu: 'સામાયિક', pts: 30 },
  { gu: 'સાંજના દર્શન', pts: 10 },
  { gu: 'ગોચરી માટે વિનંતી', pts: 10 },
  { gu: '૩૦ મિ. જિનવાણી શ્રવણ', pts: 20 },
  { gu: 'નવકારવાળી', pts: 20 },
  { gu: 'ૐ હ્રીં સંભવનાથ નવકારવાળી', pts: 10 },
  { gu: 'પાઠશાળામાં જવું', pts: 20 },
  { gu: 'નવી ગાથા', pts: 10 },
  { gu: '૩૦ મિ. સ્વાધ્યાય', pts: 10 },
  { gu: '૧૫ મિ. ધાર્મિક વાચન', pts: 10 },
  { gu: 'જ્ઞાનના ૫ ખમાસણા', pts: 10 },
  { gu: '૧૨ લોગસ્સ કાયોત્સર્ગ', pts: 20 },
  { gu: 'સૂતા ૭, ઊઠતા ૮ નવકાર', pts: 10 },
  { gu: 'નવકારશી', pts: 10 },
  { gu: 'રાત્રિભોજન ત્યાગ', pts: 20 },
  { gu: 'કંદમૂળ ત્યાગ', pts: 10 },
  { gu: 'થાળી ધોઈ પાણી પીવું', pts: 10 },
  { gu: 'મૌન સાથે ભોજન', pts: 10 },
  { gu: 'ઉકાળેલું પાણી પીવું', pts: 20 },
  { gu: 'અભક્ષ્ય ભોજન ત્યાગ', pts: 20 },
  { gu: 'તમાકુ/સિગારેટ ત્યાગ', pts: 10 },
  { gu: 'ટીવી/મોબાઈલ ત્યાગ (ભોજન)', pts: 10 },
  { gu: 'કૂતરાને રોટલી આપવી', pts: 10 },
  { gu: 'અનુકંપા દાન', pts: 10 },
  { gu: 'ગુસ્સો ન કરવો', pts: 20 },
  { gu: 'જૂઠું ન બોલવું', pts: 20 },
  { gu: 'મિચ્છામી દુક્કડમ માંગવું', pts: 20 },
  { gu: 'અન્યના ગુણાનુવાદ', pts: 20 },
  { gu: 'અપશબ્દ ન બોલવા', pts: 10 },
  { gu: 'પરનિંદા નહીં', pts: 20 },
  { gu: 'સરખામણી ના કરવી', pts: 10 },
  { gu: '"Thank You" કહેવું', pts: 10 },
  { gu: 'એક વ્યક્તિને મદદ', pts: 20 },
  { gu: 'માતા-પિતાને પ્રણામ', pts: 20 },
  { gu: 'ફિલ્મ/વેબ સિરીઝ ત્યાગ', pts: 20 },
  { gu: 'સાબુનો ત્યાગ', pts: 10 },
  { gu: 'પરફ્યુમનો ત્યાગ', pts: 10 },
  { gu: '૧ કલાક મૌન', pts: 20 },
  { gu: 'બિનજરૂરી ફરિયાદ નહીં', pts: 10 },
  { gu: '૧૫ મિ. પરિવાર સાથે', pts: 20 },
  { gu: 'ભગવાનની મહિમા વિચારવું', pts: 10 },
];

const MONTHS = [
  { name: 'March', year: 2026, start: 14, end: 31 },
  { name: 'April', year: 2026, start: 1, end: 30 },
  { name: 'May', year: 2026, start: 1, end: 31 },
  { name: 'June', year: 2026, start: 1, end: 30 },
  { name: 'July', year: 2026, start: 1, end: 31 },
  { name: 'August', year: 2026, start: 1, end: 31 },
  { name: 'September', year: 2026, start: 1, end: 30 },
  { name: 'October', year: 2026, start: 1, end: 31 },
  { name: 'November', year: 2026, start: 1, end: 30 },
  { name: 'December', year: 2026, start: 1, end: 14 },
];

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };
const HEADER_FONT = { bold: true, size: 9, color: { argb: 'FF78350F' } };
const NIYAM_FONT = { size: 10, color: { argb: 'FF1A1A1A' } };
const PTS_FONT = { bold: true, size: 9, color: { argb: 'FF92400E' } };
const PTS_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9F0' } };
const TOTAL_ROW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8CD' } };
const TOTAL_ROW_FONT = { bold: true, size: 10, color: { argb: 'FF7C2D12' } };
const ALT_ROW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFCF7' } };
const TITLE_FONT = { bold: true, size: 14, color: { argb: 'FF7C2D12' } };
const BORDER_COLOR = { argb: 'FFB8855C' };
const THIN_BORDER = {
  top: { style: 'thin', color: BORDER_COLOR },
  left: { style: 'thin', color: BORDER_COLOR },
  bottom: { style: 'thin', color: BORDER_COLOR },
  right: { style: 'thin', color: BORDER_COLOR },
};

async function createBooklet() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sambhavnatharpan - Puran Panch Mahajan';

  for (const month of MONTHS) {
    const dates = [];
    for (let d = month.start; d <= month.end; d++) dates.push(d);

    const sheetName = `${month.name} ${month.year}`;
    const ws = workbook.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.3, header: 0.2, footer: 0.2 },
      },
    });

    // ── Row 1: Title + Name/Phone fields ──
    const totalCols = 2 + dates.length + 2; // Sr + Niyam + dates + Pts + Total
    ws.mergeCells(1, 1, 1, 2);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `${month.name} ${month.year}`;
    titleCell.font = TITLE_FONT;

    // Name field
    const nameCol = Math.floor(totalCols * 0.5);
    ws.mergeCells(1, nameCol, 1, nameCol + 2);
    const nameCell = ws.getCell(1, nameCol);
    nameCell.value = 'નામ: ___________________';
    nameCell.font = { size: 10, color: { argb: 'FF78350F' }, bold: true };

    // Phone field
    const phoneCol = nameCol + 3;
    if (phoneCol + 2 <= totalCols) {
      ws.mergeCells(1, phoneCol, 1, Math.min(phoneCol + 2, totalCols));
      const phoneCell = ws.getCell(1, phoneCol);
      phoneCell.value = 'ફોન: ___________________';
      phoneCell.font = { size: 10, color: { argb: 'FF78350F' }, bold: true };
    }

    ws.getRow(1).height = 22;

    // ── Row 2: Header row ──
    const headerRow = ws.getRow(2);
    headerRow.height = 18;

    // Column widths
    ws.getColumn(1).width = 4;   // Sr
    ws.getColumn(2).width = 28;  // Niyam

    const headers = ['ક્ર.', 'નિયમ'];
    dates.forEach((d, i) => {
      headers.push(String(d));
      ws.getColumn(3 + i).width = 3.5;
    });
    headers.push('પોઈ.');
    headers.push('કુલ');
    ws.getColumn(3 + dates.length).width = 5;     // Points
    ws.getColumn(3 + dates.length + 1).width = 6;  // Total

    headers.forEach((h, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = h;
      cell.font = HEADER_FONT;
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = THIN_BORDER;
    });
    // Left-align niyam header
    ws.getCell(2, 2).alignment = { horizontal: 'left', vertical: 'middle' };

    // ── Niyam rows ──
    NIYAMS.forEach((n, idx) => {
      const rowNum = 3 + idx;
      const row = ws.getRow(rowNum);
      row.height = 14;

      // Sr
      const srCell = ws.getCell(rowNum, 1);
      srCell.value = idx + 1;
      srCell.font = { size: 8, color: { argb: 'FF555555' } };
      srCell.alignment = { horizontal: 'center', vertical: 'middle' };
      srCell.border = THIN_BORDER;

      // Niyam name
      const niyamCell = ws.getCell(rowNum, 2);
      niyamCell.value = n.gu;
      niyamCell.font = NIYAM_FONT;
      niyamCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      niyamCell.border = THIN_BORDER;

      // Date cells (empty)
      dates.forEach((_, di) => {
        const dateCell = ws.getCell(rowNum, 3 + di);
        dateCell.border = THIN_BORDER;
        dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (idx % 2 === 1) dateCell.fill = ALT_ROW_FILL;
      });

      // Points
      const ptsCell = ws.getCell(rowNum, 3 + dates.length);
      ptsCell.value = n.pts;
      ptsCell.font = PTS_FONT;
      ptsCell.fill = PTS_FILL;
      ptsCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ptsCell.border = THIN_BORDER;

      // Total (blank)
      const totalCell = ws.getCell(rowNum, 3 + dates.length + 1);
      totalCell.border = THIN_BORDER;
      totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (idx % 2 === 1) totalCell.fill = ALT_ROW_FILL;

      // Alternating row fill for sr and niyam
      if (idx % 2 === 1) {
        srCell.fill = ALT_ROW_FILL;
        niyamCell.fill = ALT_ROW_FILL;
      }
    });

    // ── Total row ──
    const totalRowNum = 3 + NIYAMS.length;
    const totalRow = ws.getRow(totalRowNum);
    totalRow.height = 18;

    const totalSrCell = ws.getCell(totalRowNum, 1);
    totalSrCell.fill = TOTAL_ROW_FILL;
    totalSrCell.border = THIN_BORDER;

    const totalLabelCell = ws.getCell(totalRowNum, 2);
    totalLabelCell.value = 'કુલ પોઈન્ટ્સ';
    totalLabelCell.font = TOTAL_ROW_FONT;
    totalLabelCell.fill = TOTAL_ROW_FILL;
    totalLabelCell.alignment = { horizontal: 'left', vertical: 'middle' };
    totalLabelCell.border = THIN_BORDER;

    for (let c = 3; c <= totalCols; c++) {
      const cell = ws.getCell(totalRowNum, c);
      cell.fill = TOTAL_ROW_FILL;
      cell.font = TOTAL_ROW_FONT;
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  }

  const outPath = path.join(__dirname, 'niyam-booklet.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`✅ Excel booklet saved: ${outPath}`);
}

createBooklet().catch(console.error);
