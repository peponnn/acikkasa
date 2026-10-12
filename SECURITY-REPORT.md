# AçıkKasa güvenlik kontrolü

Tarih: 12 Ekim 2026. Kapsam: mevcut prototipin kaynak kodu, yerel saldırı senaryoları, bağımlılıklar, cüzdan arayüzü ve yayımlanan dosyaların bütünlüğü. Bu rapor bağımsız denetim, formal doğrulama veya tüm olası saldırılara karşı güvence değildir.

## MetaMask uyarısı

Kullanıcı şu uyarıyı bildirdi: “Bu, kötü amaçlı olarak tanımlanmış. Bu siteyle etkileşimde bulunulmamasını öneriyoruz.” Bu bir **Malicious** sınıflandırmasıdır. Sebebi henüz belirlenmedi; testlerin geçmesi yanlış sınıflandırma olduğunu kanıtlamaz. Koruma kapatılmadı, uyarı atlanmadı ve başka alan adına taşınarak engel aşılmadı.

MetaMask'ın resmî yönlendirmesi: [güvenlik uyarıları ve manuel inceleme](https://support.metamask.io/configure/wallet/security-alerts). Site/URL uyarısı için destek incelemesi gerekir. Bildirim taslağı yerel `.local/metamask-review-request.txt` dosyasında hazırlanmıştır; gönderilmemiştir.

## Sonuçlar

| Kontrol | Sonuç ve kapsam |
| --- | --- |
| Otomatik testler | 25 test geçti, 0 başarısız, 0 atlanan. 13 mevcut + 12 yeni güvenlik testi. |
| Bağımlılık taraması | pnpm 11.25.0 ile `pnpm audit --json`: 0 bildirim; 46 geliştirme bağımlılığı, 5 opsiyonel bağımlılık. Bu sonuç tarama anındaki kayıtlarla sınırlıdır. |
| Yetki denetimi | Doğrudan yetkisiz kayıt, düzeltme, rol verme ve sahiplik devri çağrıları reddedildi. Normal yönetici sahipliği ele geçiremiyor. |
| Düzeltmeler | Başarısız, gerçekten mine edilen işlemler bütün kayıt durumunu geri aldı. 36 deterministik işlemde toplamlar ve eski içerikler korundu; rakip düzeltme dalları reddedildi. |
| Para ve token yetkileri | Sözleşmede payable/receive/fallback, approve, transfer, permit veya withdraw işlevi yok. Normal ETH gönderimi ve bilinmeyen selector yerel EVM'de reddedildi. Zorla ETH gönderilmesini önlediği iddia edilmez. |
| Cüzdan bağlantısı | Yerel EIP-1193 test sağlayıcısıyla hesap isteği ve Sepolia geçişi doğrulandı. Bağlantı sırasında imza, işlem, geniş izin veya anahtar çözme isteği gönderilmedi. |
| İşlem hedefi | Yerel yönetici işlemi yalnızca yapılandırılmış sözleşmeye, ETH değeri olmadan gönderildi. Gerçek kullanıcı cüzdanı bu testlerde kullanılmadı. |
| Hesap/ağ değişimi | Bağlanan hesap veya ağ değiştiğinde yazma öncesi kontrol işlemi reddetti. Zincirde yetki kontrolü ayrıca devam eder. |
| Zararlı metin | DOM yardımcısında HTML yerine textContent kullanımı; kaynakta HTML çalıştırma sink'lerinin yokluğu ve dış script URL'leri kontrol edildi. Bu, tüm tarayıcılarda dinamik XSS denetimi değildir. |
| CSV enjeksiyonu | Formül başlangıçları, tab/newline ve kontrol karakteri içeren saldırı girdileri etkisizleştirildi. Tırnak ve ayraç kaçışları kontrol edildi. |
| RPC verileri | Eksik kayıtlar, döngüler, yinelenen düzeltme dalları, tür değişimleri ve geçersiz miktar/zaman değerleri reddediliyor. RPC sağlayıcısına duyulan güven tamamen ortadan kalkmaz. |
| Yerel HTTP sunucusu | GET 200, HEAD boş gövde, POST 405 ve kodlanmış dizin dışına çıkma denemesi 403 olarak doğrulandı. Sunucu yalnızca 127.0.0.1'e bağlıdır. |
| Tarayıcı işlevi | Güvenlik politikasıyla yerel sayfa gerçek Sepolia kayıtlarını okuyabildi; 5.000 TL gelir, 1.500 TL gider ve 3.500 TL bakiye görüntülendi. Test sırasında konsol uyarı/hatası görülmedi. |

## Giderilen bulgular

- Geliştirme zincirindeki ilk tarama 5 bildirim gösterdi: tmp için 2, ws için 3. tmp'nin ilk önerilen yamasında ek bir bildirim görüldü; son sürümler **tmp 0.2.7** ve **ws 8.21.0** ile son tarama temiz çıktı. Overrides pnpm-workspace.yaml içinde, sürümler lockfile'da sabittir. Opsiyonel native build scriptleri açıkça kapalıdır.
- Kötü biçimli RPC düzeltme geçmişine doğrulama eklendi; arayüzün döngüye girmesi önlenir.
- CSV çıktısında formül kontrolünü aşabilecek kontrol karakterleri temizleniyor.
- Harici bağlantılar HTTPS ile sınırlı; URL içinde kullanıcı adı/parola reddediliyor.
- Aşırı uzun tutar girişi sayısal dönüşümden önce reddediliyor.
- HTML'e CSP ve no-referrer politikası eklendi. `_headers`, uyumlu hostingler için MIME, framing, HSTS, izin ve CSP başlıklarını tanımlar; yerel sunucuda çalıştıkları doğrulandı. **Sites hosting'in `_headers` dosyasını HTTP başlıklarına uyguladığı varsayılmaz.** HTML meta CSP, script kaynaklarını aynı origin ile sınırlar; Cloudflare'ın eklediği inline script nedeniyle inline scriptlere izin verir ve tam XSS önlemi değildir. Meta CSP frame-ancestors uygulayamaz.
- Yerel sunucu yalnızca GET/HEAD kabul eder; gerçek dosya yolunun yayın dizininde kaldığını ayrıca kontrol eder.

## Sözleşme ve compiler kontrolü

Sözleşme adresi: [0xd04337e7929625E1d0762Ae025cd637747d42c4a](https://sepolia.etherscan.io/address/0xd04337e7929625E1d0762Ae025cd637747d42c4a). Zincirdeki runtime kodu Solidity 0.8.30, optimizer 200, viaIR true, EVM Paris ile kaynak koddan üretilen kodla birebir karşılaştırıldı. Bu, Etherscan kaynak doğrulaması değildir.

Resmî [Solidity hata listesinde](https://github.com/ethereum/solidity/blob/develop/docs/bugs.json) 0.8.30 sürümünü kapsayan 7 kayıt incelendi. Kaynakta named-parameter require/custom-error çağrısı, mutual recursion, custom storage layout, inheritance veya transient storage yok. Evmasm-only hata viaIR ile; Cancun gerektiren hata Paris hedefiyle uygulanmaz. Storage-end taşması için özel yerleşim yok; bu teorik uç durum formal olarak ispatlanmadı. Kullanılan desenlerde listelenen hataları tetikleyen bir yol tespit edilmedi. Compiler sürümü ve kurulu sözleşme bu çalışma sırasında değiştirilmedi.

## Yayın bütünlüğü ve sınırlar

Yayın öncesi, mevcut sitedeki 12 JS/config/CSS/SVG/lisans dosyası yerel dosyalarla SHA256 üzerinden aynı çıktı. Üç HTML sayfasındaki tek fark Cloudflare challenge-platform scriptiydi; bu script çıkarıldığında HTML de birebir eşleşti. Cloudflare davranışı [resmî belgede](https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/) açıklanır. Bu gözlem tek başına MetaMask uyarısının sebebini göstermez.

Bu testlerde canlı zincire saldırı işlemi gönderilmedi ve MetaMask'ta koruma aşılmadı. Slither, sembolik yürütme, bağımsız denetçi incelemesi, fiziksel cihaz testi ve gerçek MetaMask kötü amaçlı site sınıflandırmasını kaldırma tamamlanmış değildir. Kullanıcıdan özel anahtar veya kurtarma kelimesi alınmadı.
