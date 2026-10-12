export const MAX_AMOUNT = 1_000_000_000_000_000n;

// The form accepts Turkish decimals, with optional correctly grouped thousands.
export function parseTL(input) {
  let value = String(input).trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) {
    throw new Error('Tutarı 1500 veya 1.500,50 biçiminde girin. En fazla iki ondalık basamak kullanın.');
  }
  value = value.replaceAll('.', '');
  const [whole, fraction = ''] = value.split(',');
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (amount <= 0n || amount > MAX_AMOUNT) throw new Error('Tutar sıfırdan büyük ve en fazla 10 trilyon TL olmalı.');
  return amount;
}

export function formatTL(amount) {
  const value = BigInt(amount);
  const sign = value < 0n ? '−' : '';
  const abs = value < 0n ? -value : value;
  return `${sign}${(abs / 100n).toLocaleString('tr-TR')},${String(abs % 100n).padStart(2, '0')} ₺`;
}

export function amountInput(amount) {
  const value = BigInt(amount);
  return `${value / 100n},${String(value % 100n).padStart(2, '0')}`;
}

export function validateText(description, category, counterparty) {
  const encoder = new TextEncoder();
  const fields = [[description, 280, 'Açıklama'], [category, 48, 'Kategori'], [counterparty, 120, 'Kurum adı']];
  if (!description.trim()) throw new Error('Açıklama gerekli.');
  for (const [value, max, label] of fields) {
    if (encoder.encode(value).length > max) throw new Error(`${label} çok uzun (en fazla ${max} UTF-8 baytı).`);
  }
}

export function summarize(records) {
  const replacedIds = new Set(records.filter(r => r.replacesId !== 0).map(r => r.replacesId));
  let income = 0n, expense = 0n;
  for (const r of records) {
    if (replacedIds.has(r.id)) continue;
    if (r.kind === 0) income += BigInt(r.amount);
    else expense += BigInt(r.amount);
  }
  return { income, expense, balance: income - expense, replacedIds };
}

export function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '—';
}

export function formatDate(timestamp) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Istanbul'
  }).format(new Date(Number(timestamp) * 1000));
}

export function exportCSV(records) {
  const totals = summarize(records);
  const cell = v => {
    let text = String(v);
    // Prevent spreadsheet formula injection in exported free-text fields.
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [['ID','Tür','Tutar (kuruş)','Açıklama','Kategori','Kurum','Kayıt zamanı (UTC)','Kaydeden','Yerine geçtiği kayıt','Durum']];
  for (const r of records) rows.push([r.id, r.kind === 0 ? 'Gelir' : 'Gider', r.amount, r.description,
    r.category, r.counterparty, new Date(Number(r.recordedAt) * 1000).toISOString(), r.author,
    r.replacesId || '', totals.replacedIds.has(r.id) ? 'Düzeltildi' : 'Geçerli']);
  return '\uFEFF' + rows.map(row => row.map(cell).join(';')).join('\r\n');
}
