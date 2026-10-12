// Read-only sample data. These are NOT real transactions or sponsor claims.
// No fictional tx hash or explorer link is attached to sample records.
export const DEMO_RECORDS = Object.freeze([
  { id: 1, kind: 0, amount: 500000n, description: 'İlk etkinliğimiz için sponsorluk desteği', category: 'Sponsorluk', counterparty: 'Örnek Teknoloji A.Ş.', recordedAt: 1791795600, author: '0x0000000000000000000000000000000000000001', replacesId: 0, txHash: null },
  { id: 2, kind: 1, amount: 150000n, description: 'Tanışma etkinliği · ikram gideri', category: 'Etkinlik', counterparty: 'Örnek İkram Ltd.', recordedAt: 1791882000, author: '0x0000000000000000000000000000000000000001', replacesId: 0, txHash: null }
]);
