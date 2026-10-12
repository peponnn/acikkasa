# Doğrulama kayıtları

Tarih: 12 Ekim 2026. Yerel testler ile canlı Sepolia doğrulamaları aşağıda ayrı belirtilir.

## Derleme

Solidity 0.8.30, optimizer 200, viaIR true, EVM Paris ile AcikKasa derlendi. Deployment bytecode: 6489 bayt. ABI ve bytecode sözleşme kaynağından üretildi; hazır ethers.js 6.17.0 dağıtımı yerel vendor dizinine alındı.

## Otomatik testler

- `ledger.test.mjs`: Türkçe tutar girişi, kuruş hesaplaması, negatif bakiye, ardışık düzeltmeler, UTF-8 sınırları ve CSV formula injection kontrolü — 5 test geçti.
- `contract.test.mjs`: constructor, doğrudan yetkisiz çağrılar, event'ler, bakiye, düzeltme geçmişi, başarısız düzeltmenin geri alınması, yetki iptali, iki aşamalı devir, sayfalama ve sınırlar — 7 test geçti.
- `chain.test.mjs`: gerçek frontend okuma modülü ile yerel RPC'den kayıtlar, düzeltmeler ve işlem hash'lerinin okunması; cüzdansız yeniden bağlantı — 1 test geçti.

Toplam: 13 test. Sözleşme ve okuma entegrasyonu yerel Ganache üzerinde çalıştırıldı. Yerel test ağı Sepolia chain ID'sini kullanarak frontend ağ kontrolünü de denedi; bu ağ gerçek Sepolia değildir. Testte üretim config.js'i değiştirilmedi.

## Tarayıcı

- Açık defterin 5.000 TL / 1.500 TL / 3.500 TL salt okunur örneklerini göstermesi kontrol edildi.
- Gelir/gider filtresi, sonuçsuz arama, kayıt ayrıntısı ve örneklerde gerçek explorer linki bulunmaması kontrol edildi.
- 390 piksel mobil viewport'ta açık defter incelendi; yatay taşma görülmedi. Bu, fiziksel telefon testi değildir.
- Yönetim panelinin kurulum beklerken yazmayı kapatması ve MetaMask olmayan tarayıcıda açıklayıcı hata vermesi kontrol edildi.
- JavaScript sözdizimi, yerel sayfa dosyaları ve Sepolia ayarları kontrol edildi.

## Canlı Sepolia

- Sözleşme: `0xd04337e7929625E1d0762Ae025cd637747d42c4a`, chain ID 11155111.
- Kurulum bloğu 11899258: önceki blokta kod yok, bu blokta kod var.
- Başarılı kurulum işlemi: `0x52d70ca5ed8834df8eb7038e3b5d9a7811365e58bc54124a85891f1bb5e6b2fe` (receipt status 1).
- Zincirdeki runtime bytecode, aynı kaynak ve derleme ayarlarıyla üretilen kodla birebir eşleşti. Keccak256: `0xa6fbf6091a537226679964724781a41f69942d0ba5a23981b9d6f407a70cc1fe`.
- Sahip ve yetkili yönetici: `0x2F46E8D1510606Ac7C1217DFF710dCc3356D00d5`.
- 11899283 numaralı blokta ilk kontrol: 0 kayıt, 0 kuruş gelir, 0 kuruş gider. Bunlar kontrol anındaki değerlerdir.
- Uygulamanın gerçek `readLedger()` modülü 11899290 numaralı blokta cüzdansız Sepolia okumasını tamamladı; boş kayıt listesi ve sıfır toplamlar sözleşmeyle tutarlıydı, bağlantı uyarısı yoktu.
- İndirilen config.js çalıştırılmadı; yapılandırma veri olarak okunup doğrulandı. Uygulamanın mevcut güvenilir RPC ayarları korundu.

## Henüz doğrulanmayanlar

MetaMask ile gerçek ağda kayıt/düzeltme ve fiziksel telefon testi. Etherscan üzerinde kaynak kod yayımlama/doğrulaması yapılmadı.

GitHub teslim reposu: https://github.com/peponnn/acikkasa. İlk kaynak yüklemesindeki 35 dosya yerel sürümle SHA256 üzerinden birebir karşılaştırıldı. Sonraki yapılandırma güncellemesi ayrıca kontrol edilir.
