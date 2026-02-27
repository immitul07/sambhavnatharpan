const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PRINT_DIR = __dirname;
const NIYAM_TS_PATH = path.join(ROOT, 'constants', 'niyams.ts');
const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
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

const AGE_GROUPS = [
  {
    key: 'born_2011_or_later',
    slug: 'bal-jyoti',
    labelEn: 'Sambhav Bal Jyoti',
    labelGu: 'સંભવ બાળ જ્યોતિ',
  },
  {
    key: 'born_1981_to_2010',
    slug: 'yuva-shakti',
    labelEn: 'Sambhav Yuva Shakti',
    labelGu: 'સંભવ યુવા શક્તિ',
  },
  {
    key: 'born_1980_or_earlier',
    slug: 'gaurav',
    labelEn: 'Sambhav Gaurav',
    labelGu: 'સંભવ ગૌરવ',
  },
];

const LANG = {
  gu: {
    code: 'gu',
    suffix: 'gujarati',
    title: 'નિયમ ટ્રેકિંગ પુસ્તિકા',
    name: 'નામ',
    phone: 'ફોન',
    sr: 'ક્ર.',
    niyam: 'નિયમ',
    points: 'પોઈ.',
    total: 'કુલ',
    footer: 'સમર્પણમ્',
    continued: '(ચાલુ)',
    pagePart1: '૧/૨',
    pagePart2: '૨/૨',
    totalLabel: 'કુલ',
  },
  en: {
    code: 'en',
    suffix: 'english',
    title: 'Niyam Tracking Booklet',
    name: 'Name',
    phone: 'Phone',
    sr: 'Sr',
    niyam: 'Niyam',
    points: 'Pts',
    total: 'Total',
    footer: 'Samarpanam',
    continued: '(contd.)',
    pagePart1: '1/2',
    pagePart2: '2/2',
    totalLabel: 'Total',
  },
};

const MAX_DATES_SINGLE = 22;
const LANDSCAPE_ROWS_PER_PAGE = 15;

function findBrowserPath() {
  for (const candidate of EDGE_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Edge/Chrome executable not found for PDF generation.');
}

function loadNiyamModule() {
  const source = fs.readFileSync(NIYAM_TS_PATH, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports, require, console });
  vm.runInContext(transpiled, context, { filename: NIYAM_TS_PATH });
  return module.exports;
}

function escHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeHeader(month, lang, groupLabel, suffix) {
  return `<div class="header">
    <div class="header-left">${escHtml(groupLabel)} • ${escHtml(month.name)} ${month.year} ${escHtml(lang.title)} ${suffix ? ' ' + escHtml(suffix) : ''}</div>
    <div class="header-right">
      <div class="header-field">${escHtml(lang.name)}: <div class="field-line"></div></div>
      <div class="header-field">${escHtml(lang.phone)}: <div class="field-line"></div></div>
    </div>
  </div>`;
}

function buildTableRows(niyams, lang, dates, includeNiyam, includePoints) {
  let out = '';
  niyams.forEach((n, i) => {
    out += '<tr>';
    out += `<td class="sr-cell">${i + 1}</td>`;
    if (includeNiyam) out += `<td class="niyam-cell">${escHtml(n.name)}</td>`;
    dates.forEach(() => {
      out += '<td></td>';
    });
    if (includePoints) {
      out += `<td class="pts-cell">${n.points}</td><td class="total-cell"></td>`;
    }
    out += '</tr>';
  });

  out += '<tr class="total-row"><td></td>';
  if (includeNiyam) out += `<td class="niyam-cell" style="font-weight:700">${escHtml(lang.totalLabel)}</td>`;
  dates.forEach(() => {
    out += '<td></td>';
  });
  if (includePoints) out += '<td></td><td></td>';
  out += '</tr>';

  return out;
}

function generateSinglePage(month, niyams, lang, groupLabel, dates) {
  let html = '<div class="page">';
  html += makeHeader(month, lang, groupLabel, '');

  html += '<table><colgroup>';
  html += '<col style="width:5mm">';
  html += `<col style="width:${lang.code === 'en' ? '56mm' : '44mm'}">`;
  dates.forEach(() => {
    html += '<col>';
  });
  html += '<col style="width:7mm">';
  html += '<col style="width:8mm">';
  html += '</colgroup><thead><tr>';
  html += `<th>${escHtml(lang.sr)}</th><th class="niyam-hdr">${escHtml(lang.niyam)}</th>`;
  dates.forEach((d) => {
    html += `<th>${d}</th>`;
  });
  html += `<th>${escHtml(lang.points)}</th><th>${escHtml(lang.total)}</th>`;
  html += '</tr></thead><tbody>';

  html += buildTableRows(niyams, lang, dates, true, true);
  html += '</tbody></table>';
  html += `<div class="footer">${escHtml(lang.footer)} • ${escHtml(groupLabel)} • ${escHtml(month.name)} ${month.year}</div>`;
  html += '</div>';
  return html;
}

function generateTwoPages(month, niyams, lang, groupLabel, allDates) {
  const mid = Math.ceil(allDates.length / 2);
  const leftDates = allDates.slice(0, mid);
  const rightDates = allDates.slice(mid);

  let html = '';

  html += '<div class="page">';
  html += makeHeader(month, lang, groupLabel, '');
  html += '<table><colgroup><col style="width:5mm">';
  html += `<col style="width:${lang.code === 'en' ? '68mm' : '52mm'}">`;
  leftDates.forEach(() => {
    html += '<col>';
  });
  html += '</colgroup><thead><tr>';
  html += `<th>${escHtml(lang.sr)}</th><th class="niyam-hdr">${escHtml(lang.niyam)}</th>`;
  leftDates.forEach((d) => {
    html += `<th>${d}</th>`;
  });
  html += '</tr></thead><tbody>';
  html += buildTableRows(niyams, lang, leftDates, true, false);
  html += '</tbody></table>';
  html += `<div class="footer">${escHtml(lang.footer)} • ${escHtml(groupLabel)} • ${escHtml(month.name)} ${month.year} • ${escHtml(lang.pagePart1)}</div>`;
  html += '</div>';

  html += '<div class="page">';
  html += makeHeader(month, lang, groupLabel, lang.continued);
  html += '<table><colgroup><col style="width:5mm">';
  rightDates.forEach(() => {
    html += '<col>';
  });
  html += '<col style="width:7mm"><col style="width:8mm">';
  html += '</colgroup><thead><tr>';
  html += `<th>${escHtml(lang.sr)}</th>`;
  rightDates.forEach((d) => {
    html += `<th>${d}</th>`;
  });
  html += `<th>${escHtml(lang.points)}</th><th>${escHtml(lang.total)}</th>`;
  html += '</tr></thead><tbody>';
  html += buildTableRows(niyams, lang, rightDates, false, true);
  html += '</tbody></table>';
  html += `<div class="footer">${escHtml(lang.footer)} • ${escHtml(groupLabel)} • ${escHtml(month.name)} ${month.year} • ${escHtml(lang.pagePart2)}</div>`;
  html += '</div>';

  return html;
}

function generateBookletHtml(niyams, lang, groupLabel) {
  let booklet = '';
  for (const month of MONTHS) {
    const dates = [];
    for (let d = month.start; d <= month.end; d++) dates.push(d);

    if (dates.length <= MAX_DATES_SINGLE) {
      booklet += generateSinglePage(month, niyams, lang, groupLabel, dates);
    } else {
      booklet += generateTwoPages(month, niyams, lang, groupLabel, dates);
    }
  }

  return `<!DOCTYPE html>
<html lang="${lang.code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(groupLabel)} - ${escHtml(lang.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 portrait; margin: 5mm; }
    body { font-family: 'Noto Sans Gujarati', Arial, sans-serif; background: #fff; color: #1a1a1a; }
    .page { width: 200mm; height: 287mm; page-break-after: always; overflow: hidden; padding: 1mm; }
    .page:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5mm; border-bottom: 0.5px solid #c4956a; padding-bottom: 1mm; }
    .header-left { font-size: 12px; font-weight: 800; color: #7c2d12; }
    .header-right { display: flex; gap: 18px; }
    .header-field { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: #78350f; }
    .field-line { border-bottom: 1px solid #92400e; width: 105px; height: 14px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 0.5px solid #b8855c; }
    th, td { border: 0.5px solid #b8855c; text-align: center; vertical-align: middle; padding: 0; line-height: 1.15; overflow: hidden; }
    th { background: #fef3e2; color: #78350f; font-weight: 700; font-size: 11px; height: 5.4mm; }
    td { font-size: 6.5px; height: 5.4mm; }
    td.niyam-cell { text-align: left; padding-left: 1px; font-size: ${lang.code === 'en' ? '9.2px' : '11px'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    th.niyam-hdr { text-align: left; padding-left: 1px; }
    td.sr-cell { font-size: 11px; color: #555; }
    td.pts-cell { font-size: 11px; font-weight: 700; color: #92400e; background: #fef9f0; }
    td.total-cell { background: #fffbf5; }
    tr:nth-child(even) td { background: #fffcf7; }
    tr:nth-child(even) td.pts-cell { background: #fef3e2; }
    tr:nth-child(even) td.total-cell { background: #fef9f0; }
    .total-row td { background: #fde8cd !important; font-weight: 700; font-size: 12px; color: #7c2d12; }
    .footer { text-align: center; font-size: 6px; color: #b45309; margin-top: 1mm; opacity: 0.65; }
    @media print {
      body { margin: 0; }
      .page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${booklet}
</body>
</html>`;
}

function buildLandscapeRows(niyams, dates, startIndex, lang, addTotalRow) {
  let out = '';
  niyams.forEach((n, i) => {
    const sr = startIndex + i + 1;
    out += '<tr>';
    out += `<td class="sr-cell">${sr}</td>`;
    out += `<td class="niyam-cell">${escHtml(n.name)}</td>`;
    dates.forEach(() => {
      out += '<td></td>';
    });
    out += `<td class="pts-cell">${n.points}</td><td class="total-cell"></td>`;
    out += '</tr>';
  });

  // Keep both halves visually aligned even if a group has < 30 rows in future.
  for (let i = niyams.length; i < LANDSCAPE_ROWS_PER_PAGE; i++) {
    out += '<tr>';
    out += '<td class="sr-cell"></td><td class="niyam-cell"></td>';
    dates.forEach(() => {
      out += '<td></td>';
    });
    out += '<td class="pts-cell"></td><td class="total-cell"></td>';
    out += '</tr>';
  }

  if (addTotalRow) {
    out += '<tr class="total-row">';
    out += '<td class="sr-cell"></td>';
    out += `<td class="niyam-cell" style="font-weight:700">${escHtml(lang.totalLabel)}</td>`;
    dates.forEach(() => {
      out += '<td></td>';
    });
    out += '<td class="pts-cell"></td><td class="total-cell"></td>';
    out += '</tr>';
  }

  return out;
}

function buildLandscapeMonthPage(month, niyams, lang, groupLabel, dates, partLabel, suffix, startIndex, addTotalRow) {
  let html = '<div class="page">';
  html += makeHeader(month, lang, groupLabel, suffix);
  html += '<table><colgroup>';
  html += '<col style="width:6mm">';
  html += `<col style="width:${lang.code === 'en' ? '66mm' : '58mm'}">`;
  dates.forEach(() => {
    html += '<col>';
  });
  html += '<col style="width:7mm"><col style="width:8mm">';
  html += '</colgroup><thead><tr>';
  html += `<th>${escHtml(lang.sr)}</th><th class="niyam-hdr">${escHtml(lang.niyam)}</th>`;
  dates.forEach((d) => {
    html += `<th>${d}</th>`;
  });
  html += `<th>${escHtml(lang.points)}</th><th>${escHtml(lang.total)}</th>`;
  html += '</tr></thead><tbody>';
  html += buildLandscapeRows(niyams, dates, startIndex, lang, addTotalRow);
  html += '</tbody></table>';
  html += `<div class="footer">${escHtml(lang.footer)} • ${escHtml(groupLabel)} • ${escHtml(month.name)} ${month.year} • ${escHtml(partLabel)}</div>`;
  html += '</div>';
  return html;
}

function generateLandscapeRowsBookletHtml(niyams, lang, groupLabel) {
  let booklet = '';

  for (const month of MONTHS) {
    const dates = [];
    for (let d = month.start; d <= month.end; d++) dates.push(d);

    const topRows = niyams.slice(0, LANDSCAPE_ROWS_PER_PAGE);
    const bottomRows = niyams.slice(LANDSCAPE_ROWS_PER_PAGE, LANDSCAPE_ROWS_PER_PAGE * 2);

    booklet += buildLandscapeMonthPage(
      month,
      topRows,
      lang,
      groupLabel,
      dates,
      lang.pagePart1,
      '',
      0,
      false,
    );
    booklet += buildLandscapeMonthPage(
      month,
      bottomRows,
      lang,
      groupLabel,
      dates,
      lang.pagePart2,
      lang.continued,
      LANDSCAPE_ROWS_PER_PAGE,
      true,
    );
  }

  return `<!DOCTYPE html>
<html lang="${lang.code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(groupLabel)} - ${escHtml(lang.title)} - Landscape</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Gujarati:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4 landscape; margin: 5mm; }
    body { font-family: 'Noto Sans Gujarati', Arial, sans-serif; background: #fff; color: #1a1a1a; }
    .page { width: 287mm; height: 200mm; page-break-after: always; overflow: hidden; padding: 1mm; }
    .page:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.3mm; border-bottom: 0.5px solid #c4956a; padding-bottom: 1mm; }
    .header-left { font-size: 12px; font-weight: 800; color: #7c2d12; }
    .header-right { display: flex; gap: 22px; }
    .header-field { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: #78350f; }
    .field-line { border-bottom: 1px solid #92400e; width: 120px; height: 14px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border: 0.5px solid #b8855c; }
    th, td { border: 0.5px solid #b8855c; text-align: center; vertical-align: middle; padding: 0; line-height: 1.1; overflow: hidden; }
    th { background: #fef3e2; color: #78350f; font-weight: 700; font-size: 11px; height: 11.1mm; }
    td { font-size: 6px; height: 11.1mm; }
    th.niyam-hdr { text-align: left; padding-left: 1px; }
    td.niyam-cell { text-align: left; padding: 0 1px; font-size: ${lang.code === 'en' ? '12px' : '12px'}; white-space: normal; overflow: hidden; text-overflow: clip; line-height: 1.05; word-break: break-word; }
    td.sr-cell { font-size: 11px; color: #555; }
    td.pts-cell { font-size: 11px; font-weight: 700; color: #92400e; background: #fef9f0; }
    td.total-cell { background: #fffbf5; }
    tr:nth-child(even) td { background: #fffcf7; }
    tr:nth-child(even) td.pts-cell { background: #fef3e2; }
    tr:nth-child(even) td.total-cell { background: #fef9f0; }
    .total-row td { background: #fde8cd !important; font-weight: 700; font-size: 12px; color: #7c2d12; }
    .footer { text-align: center; font-size: 6px; color: #b45309; margin-top: 1mm; opacity: 0.65; }
    @media print {
      body { margin: 0; }
      .page { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
${booklet}
</body>
</html>`;
}

function toFileUri(absPath) {
  return 'file:///' + absPath.replace(/\\/g, '/');
}

function buildNiyamsByAgeGroup(moduleExports) {
  const getNiyamListForAgeGroup = moduleExports.getNiyamListForAgeGroup;
  if (typeof getNiyamListForAgeGroup !== 'function') {
    throw new Error('Unable to load getNiyamListForAgeGroup from constants/niyams.ts');
  }

  const out = {};
  for (const ag of AGE_GROUPS) {
    const list = getNiyamListForAgeGroup(ag.key);
    out[ag.key] = list.map((item) => ({
      key: item.key,
      points: item.points,
      en: item.en,
      gu: item.gu,
    }));
  }
  return out;
}

function run() {
  const browserPath = findBrowserPath();
  const niyamModule = loadNiyamModule();
  const allNiyams = buildNiyamsByAgeGroup(niyamModule);

  const created = [];

  for (const ageGroup of AGE_GROUPS) {
    const entries = allNiyams[ageGroup.key];

    for (const langKey of ['gu', 'en']) {
      const lang = LANG[langKey];
      const niyams = entries.map((n) => ({
        key: n.key,
        name: langKey === 'gu' ? n.gu : n.en,
        points: n.points,
      }));

      const groupLabel = langKey === 'gu' ? ageGroup.labelGu : ageGroup.labelEn;
      const standardHtml = generateBookletHtml(niyams, lang, groupLabel);
      const standardBaseName = `Niyam-Booklet-2026-${ageGroup.slug}-${lang.suffix}`;
      const standardHtmlPath = path.join(PRINT_DIR, `${standardBaseName}.html`);
      const standardPdfPath = path.join(PRINT_DIR, `${standardBaseName}.pdf`);

      fs.writeFileSync(standardHtmlPath, standardHtml, 'utf8');
      execFileSync(browserPath, [
        '--headless=new',
        '--disable-gpu',
        `--print-to-pdf=${standardPdfPath}`,
        toFileUri(standardHtmlPath),
      ], { stdio: 'ignore' });
      created.push(standardPdfPath);

      const landscapeHtml = generateLandscapeRowsBookletHtml(niyams, lang, groupLabel);
      const landscapeBaseName = `Niyam-Booklet-2026-${ageGroup.slug}-${lang.suffix}-landscape-row-split`;
      const landscapeHtmlPath = path.join(PRINT_DIR, `${landscapeBaseName}.html`);
      const landscapePdfPath = path.join(PRINT_DIR, `${landscapeBaseName}.pdf`);

      fs.writeFileSync(landscapeHtmlPath, landscapeHtml, 'utf8');
      execFileSync(browserPath, [
        '--headless=new',
        '--disable-gpu',
        `--print-to-pdf=${landscapePdfPath}`,
        toFileUri(landscapeHtmlPath),
      ], { stdio: 'ignore' });
      created.push(landscapePdfPath);
    }
  }

  for (const f of created) {
    const stat = fs.statSync(f);
    console.log(`${path.basename(f)}\t${stat.size} bytes`);
  }
}

run();


