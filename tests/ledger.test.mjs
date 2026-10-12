import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTL, formatTL, amountInput, summarize, validateText, exportCSV } from '../dist/js/ledger.js';

test('Turkish currency entries are converted without floating-point rounding',()=>{
  assert.equal(parseTL('5.000'),500000n);
  assert.equal(parseTL('1.234,56'),123456n);
  assert.equal(parseTL(' 0,01 '),1n);
  assert.equal(parseTL('1500,5'),150050n);
  for(const input of ['0','-1','NaN','1,234','1.23','1e3','','1,2,3','Infinity','10000000000001'])assert.throws(()=>parseTL(input),undefined,input);
});

test('currency output and form values preserve exact amounts and negative balances',()=>{
  assert.equal(formatTL(350000n),'3.500,00 ₺');
  assert.equal(formatTL(-123456n),'−1.234,56 ₺');
  assert.equal(amountInput(123456n),'1234,56');
  assert.equal(parseTL(amountInput(999999999999999n)),999999999999999n);
});

test('correction history does not inflate income or spending',()=>{
  const rows=[{id:1,kind:0,amount:500000n,replacesId:0},{id:2,kind:1,amount:150000n,replacesId:0},{id:3,kind:1,amount:120000n,replacesId:2},{id:4,kind:1,amount:110000n,replacesId:3}];
  const totals=summarize(rows);
  assert.equal(totals.income,500000n);assert.equal(totals.expense,110000n);assert.equal(totals.balance,390000n);
  assert.deepEqual([...totals.replacedIds],[2,3]);
  assert.equal(rows[1].amount,150000n);
});

test('validation uses UTF-8 byte limits, not character counts',()=>{
  assert.doesNotThrow(()=>validateText('İkram','Etkinlik','Örnek Ltd.'));
  assert.throws(()=>validateText('   ','',''));
  assert.throws(()=>validateText('ş'.repeat(141),'',''));
  assert.throws(()=>validateText('İkram','a'.repeat(49),''));
});

test('CSV exports mark superseded records and neutralize formula injection',()=>{
  const r={id:1,kind:0,amount:100n,description:'=HYPERLINK("x")',category:'Diğer',counterparty:'Örnek; A.Ş.',recordedAt:1791795600,author:'0x1',replacesId:0};
  const csv=exportCSV([r,{...r,id:2,amount:200n,replacesId:1,description:'Düzeltildi'}]);
  assert.match(csv,/'=HYPERLINK/);assert.match(csv,/"Örnek; A.Ş."/);assert.match(csv,/"Düzeltildi"/);assert.match(csv,/"Geçerli"/);
});
