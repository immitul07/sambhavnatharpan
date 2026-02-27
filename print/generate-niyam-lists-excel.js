const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const ExcelJS = require('exceljs');

const ROOT = path.resolve(__dirname, '..');
const NIYAM_TS_PATH = path.join(ROOT, 'constants', 'niyams.ts');

const AGE_GROUPS = [
  {
    key: 'born_2011_or_later',
    sheetEn: 'Sambhav Bal Jyoti',
    sheetGu: 'સંભવ બાળ જ્યોતિ',
  },
  {
    key: 'born_1981_to_2010',
    sheetEn: 'Sambhav Yuva Shakti',
    sheetGu: 'સંભવ યુવા શક્તિ',
  },
  {
    key: 'born_1980_or_earlier',
    sheetEn: 'Sambhav Gaurav',
    sheetGu: 'સંભવ ગૌરવ',
  },
];

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

function styleHeaderRow(row, color) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB7B7B7' } },
      left: { style: 'thin', color: { argb: 'FFB7B7B7' } },
      bottom: { style: 'thin', color: { argb: 'FFB7B7B7' } },
      right: { style: 'thin', color: { argb: 'FFB7B7B7' } },
    };
  });
}

function styleBodyRow(row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E2E2' } },
      left: { style: 'thin', color: { argb: 'FFE2E2E2' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E2E2' } },
      right: { style: 'thin', color: { argb: 'FFE2E2E2' } },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.font = { size: 11 };
  });
}

function populateSheet(ws, niyams, lang) {
  const headers =
    lang === 'en'
      ? ['Sr No', 'Niyam', 'Points']
      : ['ક્રમાંક', 'નિયમ', 'પોઈન્ટ્સ'];
  ws.addRow(headers);
  styleHeaderRow(ws.getRow(1), lang === 'en' ? 'FF2E5AAC' : 'FF8A3D12');

  niyams.forEach((item, index) => {
    const row = ws.addRow([index + 1, lang === 'en' ? item.en : item.gu, item.points]);
    styleBodyRow(row);
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  ws.columns = [
    { key: 'sr', width: 10 },
    { key: 'niyam', width: 72 },
    { key: 'points', width: 14 },
  ];
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function buildWorkbook(lang, niyamModule) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Samarpanam';
  workbook.created = new Date();

  for (const group of AGE_GROUPS) {
    const sheetName = lang === 'en' ? group.sheetEn : group.sheetGu;
    const ws = workbook.addWorksheet(sheetName);
    const niyams = niyamModule.getNiyamListForAgeGroup(group.key);
    populateSheet(ws, niyams, lang);
  }

  return workbook;
}

async function run() {
  const niyamModule = loadNiyamModule();
  if (typeof niyamModule.getNiyamListForAgeGroup !== 'function') {
    throw new Error('Could not load getNiyamListForAgeGroup from constants/niyams.ts');
  }

  const englishWorkbook = buildWorkbook('en', niyamModule);
  const gujaratiWorkbook = buildWorkbook('gu', niyamModule);

  const englishOut = path.join(__dirname, 'Niyam-All-Categories-English.xlsx');
  const gujaratiOut = path.join(__dirname, 'Niyam-All-Categories-Gujarati.xlsx');

  await englishWorkbook.xlsx.writeFile(englishOut);
  await gujaratiWorkbook.xlsx.writeFile(gujaratiOut);

  console.log(`Created: ${englishOut}`);
  console.log(`Created: ${gujaratiOut}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

