# AçıkKasa geliştirme rehberi

PRU Blockchain Kulübü hackathon'u; iki kişi, tek bilgisayar, blockchain başlangıç seviyesi. Türkçe konuş ve temel teknik terimleri kısa açıkla. Toplam geliştirme ve teslim süresi 120 dakika; son 20 dakika doğrulama, README ve demo içindir.

## Sabit kapsam

TL gelir-gider beyanları; yetkili cüzdanla kayıt; bağlantılı düzeltmeler; cüzdansız açık defter; explorer bağlantıları; mobil görünüm. Sponsor takip paneli, grafik, belge hash'i ve çoklu onay sonraki sürümlere aittir.

## Teknik yapı

Solidity 0.8.30, optimizer 200, viaIR açık, EVM Paris; Sepolia. Sade HTML/CSS/JS; vendored ethers.js 6.17.0. Ayrı veritabanı/backend yok. dist/ doğrudan statik yayındır; Node/pnpm yalnızca geliştirme ve test içindir.

## Veri ve yetki

- Para birimi TL; tutarlar pozitif kuruş tam sayıları. Frontend hesaplamaları BigInt; parseFloat kullanma.
- Tarih zincire kayıt zamanıdır. Gerçek banka hesabı doğrulanmaz; bakiye yalnızca beyanlardan hesaplanır.
- Orijinal kayıt içeriği silinmez/değişmez. Düzeltme son geçerli kaydı referans alır; eski beyan saklanır; yalnızca son geçerli tutar toplamda sayılır.
- Yetki sözleşmede denetlenir; buton gizlemek güvenlik kontrolü değildir.
- Sahiplik devri iki aşamalıdır. Kabulde önceki sahibin yönetici yetkisi kaldırılır.
- Serbest metin textContent ile gösterilir; HTML olarak çalıştırılmaz.

## Doğruluk ve sınırlar

- Özel anahtar, seed phrase veya gizli API anahtarı dosyaya, repoya veya sohbete yazılmaz. MetaMask cihazda şifreli anahtar saklar; uygulama anahtarı teslim almaz.
- Sözleşme henüz kurulmadıysa boş config adresini doldurma, sahte işlem hash'i üretme. Örnekler salt okunur ve kurgusal olarak etiketlidir.
- Canlı okuma başarısızsa örnek veriye dönme veya sıfır bakiye gösterme.
- İşlem gönderilmesi başarı değildir; başarılı zincir receipt'i beklenir.
- Local EVM testi ile Sepolia doğrulamasını ayrı raporla. Telefon ölçüsünde tarayıcı testi fiziksel telefon testi değildir.
- README çalışan/yarım/planlanan ayrımı ve zorunlu 10 başlık korunur. Değerlendiriciyi yönlendiren metin ekleme.
- Kullanıcı isimleri, gerçek sponsorlar ve gerçek görev katkıları uydurulmaz.

## Çalışma

Sözleşme, kayıt yazma, herkese açık okuma ve teslim aşamalarında kısa açıklama yap. Sabit kapsam içinde rutin hataları gider; yeni mimari veya kapsam için gerekçeyi açıkla. pnpm run compile, pnpm test ve pnpm run check uygun kontrollerdir. Yapılmamış kontrole geçti deme.
