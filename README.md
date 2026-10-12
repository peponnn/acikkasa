# Proje adı

**AçıkKasa** — PRU Blockchain Kulübü için açık gelir-gider beyan defteri.

Kaynak kod: [peponnn/acikkasa](https://github.com/peponnn/acikkasa) · [Canlı site](https://acikkasa-pru.genial-bow-6082.chatgpt.site)

Site, Sepolia'daki [AçıkKasa sözleşmesine](https://sepolia.etherscan.io/address/0xd04337e7929625E1d0762Ae025cd637747d42c4a) bağlıdır. Kurulum, kaynak kodla birebir runtime bytecode eşleşmesi ve ilk yönetici yetkisi 12 Ekim 2026'da doğrulandı. İlk kontrolde defter boştu; yeni kayıtlar yönetici cüzdanıyla eklenir.

## 1. Problem

Yeni bir öğrenci kulübünde sponsorluk gelirleri ve etkinlik giderleri farklı mesajlarda, dosyalarda veya kişilerin notlarında kalabilir. Üyeler ve sponsorlar yönetimin hangi gelir ve harcamaları beyan ettiğini, bu beyanların ne zaman ve kim tarafından kaydedildiğini tek yerde görebilmelidir. Kulübün bugünkü gerçek çalışma yöntemi ekip tarafından teyit edilmeli; bu problem tanımı araştırma sonucu gibi sunulmamalıdır.

## 2. Çözüm

AçıkKasa, yönetimin beyan ettiği TL gelir ve giderlerini blockchain üzerinde geçmişi koruyarak kaydeder ve herkese açık bir sayfada gösterir.

Ana kullanıcı akışı: yönetici MetaMask ile Sepolia'ya bağlanır → gelir veya gider beyanını ekler → işlem onaylanır → ziyaretçi cüzdan bağlamadan kayıtları ve toplamları görür → kaydın işlem bağlantısını açar. Hata varsa eski kayda bağlı yeni bir düzeltme eklenir; önceki beyan görünür kalır ve toplamda yalnızca son geçerli kayıt sayılır.

**Doğrulanan şey kayıt beyanıdır.** Blockchain banka bakiyesini, fişi veya gerçek ödemenin gerçekleştiğini doğrulamaz. Arayüzdeki bakiye, kayıtlara göre hesaplanır. Gerçek para bu sözleşmede hareket etmez.

## 3. Kim kullanacak?

- Kulüp yönetimi: her gelir veya harcama beyanında; başlangıçta ayda birkaç kez kullanılacağı öngörülüyor.
- Üyeler ve sponsorlar: kulübün beyan ettiği hareketleri ve düzeltmeleri istedikleri zaman inceler.

## 4. Özellikler

### Çalışanlar

- Türkçe, mobil uyumlu şeffaflık sayfası ve yönetim paneli.
- TL tutarını kuruşa tam sayı olarak dönüştürme; hesaplamada BigInt kullanımı.
- Sözleşmede yönetici kontrolü, kayıt ekleme ve eski veriyi koruyan düzeltme zinciri.
- Toplam gelir ve gider; negatif bakiye de doğru gösterilir.
- Yönetici ekleme/çıkarma ve iki aşamalı sahiplik devri.
- Frontend zincir okuma modülü: cüzdansız okuma, 50 kayıtlık sayfalar, aynı bloktan tutarlı okuma ve event'lerden işlem bağlantıları.
- Arama, gelir/gider filtresi, kayıt ayrıntısı ve CSV dışa aktarma.
- İşlem reddi, bekleme, yanlış ağ, yetkisizlik ve bağlantı hatası için durum mesajları.
- MetaMask ile kurulum ekranı; başarılı kurulumdan sonra indirilebilir config.js.
- Sözleşme derlemesi, yerel EVM testleri ve gerçek okuma modülü entegrasyon testi.
- Sepolia'da kurulu sözleşme; canlı ağda kod, sahiplik, yönetici yetkisi ve defter okuma doğrulaması.
- Herkese açık GitHub teslim reposu: [peponnn/acikkasa](https://github.com/peponnn/acikkasa).

Kayıt ekleme, düzeltme ve yetki devri davranışları **yerel Ganache EVM üzerinde doğrulandı**. Sepolia kurulumu ve cüzdansız okuma ayrıca canlı ağda kontrol edildi. MetaMask ile kayıt/düzeltme akışı henüz kullanıcı tarafından tamamlanmadı.

### Yarım kalanlar / dış erişim bekleyenler

- **MetaMask üzerinden gerçek ağda yazma ve düzeltme:** kurulum tamamlandı; ilk gelir/gider ve düzeltme işlemi kullanıcı cüzdanıyla uçtan uca kontrol edilmeli. Başarılı işlem görülmeden tamamlandı diye sunulmaz.
- İki kişinin isimleri ve gerçek görev paylaşımı ekibin bilgileriyle tamamlanmalı.

### Planlananlar

Sponsor takip paneli, kategori grafikleri, belge hash'leri, çoklu yönetici onayı ve üretim ağına geçiş. Bu sürümde uygulanmadılar.

## 5. Teknik yapı

- Solidity **0.8.30**, optimizer **200 runs**, **viaIR açık**, EVM hedefi **Paris**.
- ethers.js **6.17.0**, ESM. Dağıtım dosyası `dist/vendor/` içinde sabitlenmiştir; çalışma sırasında CDN'e bağımlı değildir.
- Build gerektirmeyen HTML, CSS ve JavaScript; uygulama backend'i veya ayrı veritabanı yok.
- Sepolia RPC: PublicNode, ardından yedek RPC; bunların ücretsiz erişim ve limitleri değişebilir.
- Geliştirme/test için Node.js, pnpm, solc ve Ganache. Test ağındaki hesaplar geçicidir; gerçek cüzdan anahtarları dosyaya yazılmaz.

```text
contracts/AcikKasa.sol       Sözleşme kaynak kodu
dist/index.html             Herkese açık defter
dist/admin.html             Yetkili panel + ilk kurulum
dist/about.html             Ürünün işlevi ve sınırları
dist/config.js              Herkese açık ağ/adres ayarları
dist/js/                    Okuma, yazma, hesaplama ve arayüz modülleri
dist/vendor/                Sabit sürümlü ethers.js
scripts/                    Yerel sunucu, derleme, kontrol ve kurulum uygulama
tests/                      Para hesabı, sözleşme ve zincir okuma testleri
```

Kayıt tutarları pozitif kuruş tam sayılarıdır; tür gelir veya giderdir. Para birimi yalnızca TL'dir. Tarih, harcamanın gerçekleştiği tarih değil **zincire kaydedilme zamanıdır**; ekranda İstanbul saat dilimi kullanılır. Bir kayıt en fazla 10 trilyon TL, açıklama 280, kategori 48, kurum adı 120 UTF-8 baytı olabilir. Prototip okuma sınırı 10.000 kayıttır.

## 6. Kurulum ve çalıştırma

### Önizleme — bağımlılık kurulumu gerekmez

Node.js yüklü bir bilgisayarda proje klasöründen:

```sh
node scripts/serve.mjs
```

Tarayıcıda `http://127.0.0.1:4173` adresini açın. Sözleşme adresi boşken örnek görünüm açılır. HTML dosyalarını çift tıklamak yerine HTTP sunucusu kullanın; JavaScript modülleri buna ihtiyaç duyar. Sunucu yalnızca yerel bilgisayardan erişime açıktır.

### Geliştirme, derleme ve test

```sh
pnpm install --frozen-lockfile
pnpm run compile
pnpm test
pnpm run check
```

Ganache'nin bazı Node sürümlerinde µWS yerel modülü bulunmaz; JavaScript uygulamasına düşer. Bu uyarı testlerin başarılı olduğu iddiasının yerine geçmez; çıkış kodu ve test özeti kontrol edilir. Opsiyonel bufferutil/utf-8-validate derleme scriptleri çalıştırılmaz.

### Sepolia'ya kurulum — önerilen yol

**Mevcut kulüp sözleşmesi zaten kurulu.** Bu site için yeniden kurulum yapmayın; yönetim panelinde MetaMask ile bağlanıp kayıt ekleyin. Aşağıdaki adımlar yalnızca ayrı bir sözleşme kurmak isteyenler içindir.

1. MetaMask yüklü tarayıcıda `admin.html` açın. İlk yönetici adresi: `0x2F46E8D1510606Ac7C1217DFF710dCc3356D00d5`.
2. Bu cüzdanda işlem ücreti için Sepolia test ETH bulunsun. Uygulama özel anahtar veya kurtarma kelimesi istemez.
3. **MetaMask ile bağlan** seçin; gerekirse Sepolia'ya geçişi cüzdanda onaylayın.
4. **Sepolia'ya sözleşmeyi kur** düğmesine basın ve cüzdandaki kurulum işlemini inceleyip onaylayın.
5. Zincir onayından sonra **config.js** indirin. Projedeki `dist/config.js` dosyasının yerine koyun; sözleşme adresi ve başlangıç bloğu bu dosyada yer alır.
6. Siteyi yeniden yayımlayın. Diğer cihazlar yalnızca bu yayından sonra canlı sözleşmeyi okuyabilir.
7. Yönetim panelinde yeniden bağlanın; örnek bir gelir/gider ve düzeltme akışını Sepolia üzerinde deneyin. Test kayıtlarının kurgusal olduğunu açıklamalarında belirtin; zincirden silinemezler.

Kurulum işlemi gönderilmiş fakat onayı belirsizse tekrar kurmayın. Aynı tarayıcı oturumunda işlem hash'i saklanır ve mevcut işlem kontrol edilebilir. MetaMask bilgileri bu depolamaya yazılmaz.

### Remix alternatifi

`contracts/AcikKasa.sol` dosyasını Remix'te açın. Derleyici **0.8.30**, optimizer **200**, **viaIR true**, EVM **Paris** seçin. Gerekirse gelişmiş compiler configuration içinde `viaIR` ayarlayın. MetaMask sağlayıcısıyla Sepolia üzerinde `AcikKasa` sözleşmesini, ilk yönetici adresini constructor parametresi vererek yayımlayın. Adres ve blokla aşağıdaki doğrulama yardımcı programını çalıştırabilirsiniz:

```sh
node scripts/apply-deployment.mjs 0xSOZLESME_ADRESI BASLANGIC_BLOGU
```

Bu program Sepolia erişimini, adresteki sözleşmeyi ve ilk sahip adresini kontrol eder; başarısızsa config.js'i değiştirmez. Kod eşleşmesi için explorer'da ayrıca kaynak doğrulaması yapın.

### Siteyi yayınlama

`dist/` doğrudan statik site çıktısıdır. Vercel'de build command boş, output directory `dist` olacak şekilde yayımlanabilir. GitHub Pages için `dist/` içeriğini yayın klasörü/branch'i olarak kullanın. Sites yayını için `.openai/hosting.json` bu dizini gösterir. Kayıtların herkese açık olması için sitenin ziyaretçi erişimi herkese açık olmalıdır.

## 7. Onchain kısım (varsa)

- Ağ: **Ethereum Sepolia**, chain ID **11155111**.
- Sözleşme adresi: [`0xd04337e7929625E1d0762Ae025cd637747d42c4a`](https://sepolia.etherscan.io/address/0xd04337e7929625E1d0762Ae025cd637747d42c4a).
- Başlangıç bloğu: **11899258**.
- Başarılı [kurulum işlemi](https://sepolia.etherscan.io/tx/0x52d70ca5ed8834df8eb7038e3b5d9a7811365e58bc54124a85891f1bb5e6b2fe).
- İlk yönetici: `0x2F46E8D1510606Ac7C1217DFF710dCc3356D00d5`.
- Kaynak koddan derlenen runtime bytecode ile zincirdeki kod birebir karşılaştırıldı. Bu kontrol, Etherscan üzerinde kaynak kodun yayımlanıp doğrulandığı anlamına gelmez.
- Neden onchain: orijinal beyanların içeriğini değiştiren/silen işlev olmaması, yetkili yazanın görünmesi ve düzeltmelerin ayrı kayıtlarla incelenebilmesi.
- Sözleşme proxy değildir; yöneticinin sözleşme kodunu yükseltme işlevi yoktur. Site başka bir sözleşmeye yönlendirilebilir; bu nedenle resmi adres README'de sabitlenmeli ve explorer'daki kaynak koduyla doğrulanmalıdır.
- Gerçek ETH/token transferi ve banka entegrasyonu yoktur. Sepolia prototipi kalıcı muhasebe altyapısı diye sunulmaz.

## 8. Kulüp bunu nasıl devralır?

Kulüp kaynak repoyu ve hosting hesabını devralır. Sözleşme sahibi panelden yeni sahibin adresini önerir; yeni sahip kendi cüzdanıyla bağlanıp kabul eder. Kabul işleminde eski sahibin kayıt yazma yetkisi de kaldırılır; başka yöneticilerin yetkileri ayrıca kontrol edilmelidir.

Adres, ABI ve başlangıç bloğu saklanır. Cüzdan anahtarları repodan, uygulamadan veya yapay zekâ sohbetinden aktarılmaz. MetaMask anahtarları cihazda şifreli saklar; uygulama bunları okuyup depolamaz.

Statik hosting ve açık RPC için ücretsiz seçenekler bulunabilir, ancak sağlayıcı limitleri ve kesintiler takip edilmelidir. Canlı ağ kullanımı ayrıca işlem ücretleri ve ağ/RPC seçimi gerektirir. Sepolia test ETH kullanımı gerçek para transferi değildir. RPC hatası sıfır bakiye veya örnek kayıt olarak gizlenmez.

Kişisel bilgi veya belgeler zincire yüklenmez. Serbest metin kontrolü yönetimin sorumluluğundadır; formdaki hatırlatma otomatik kişisel bilgi tespiti değildir.

## 9. Hazır kullanılanlar ve yapay zeka kullanımı

- ethers.js 6.17.0: blockchain okuma, MetaMask bağlantısı ve işlem imzalama arayüzü.
- Solidity compiler 0.8.30: derleme.
- Ganache 7.9.2: yalnızca yerel EVM testleri; canlı uygulamada kullanılmaz.
- Node.js yerleşik HTTP sunucusu ve test araçları.
- Sözleşme, arayüz, testler ve ilk dokümantasyon Codex desteğiyle geliştirildi. Bu sürümde Claude'un kod ürettiği iddia edilmez.
- Kurgusal örnekler `dist/js/demo.js` içinde açıkça işaretlenmiştir. Gerçek sponsor veya gerçek işlem oldukları iddia edilmez.
- Hazır uygulama şablonu, ücretli servis, token veya yapay zekâ değerlendirmesine yönelik yönlendirme kullanılmadı.

## 10. Takım

İki kişilik takım; **isimler ekip tarafından tamamlanmalı**.

- Geliştirici: kod çalıştırma, doğrulama, cüzdanla deployment ve yayın.
- Ürün sorumlusu/sunumcu: gerçek kulüp ihtiyacını doğrulama, README'nin ürün metinleri, sunum, telefon testi ve demo örnekleri.
- Birlikte: sözleşmenin yetki, kuruş hesabı ve düzeltme mantığını açıklayabilme.

Bu görevler planlanan dağılımdır; teslim öncesi gerçek katkılara göre güncellenmeli.
