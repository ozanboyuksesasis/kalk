# Windows'ta Kalk Uygulamasını Çalıştırma Rehberi

Bu rehber, Windows bilgisayarınızda Kalk uygulamasını çalıştırmak için gereken tüm adımları içerir.

## 📋 İçindekiler

1. [Gerekli Araçlar](#gerekli-araçlar)
2. [Kurulum Adımları](#kurulum-adımları)
3. [Uygulamayı Çalıştırma](#uygulamayı-çalıştırma)
4. [Sorun Giderme](#sorun-giderme)

---

## 🔧 Gerekli Araçlar

### 1. Node.js (Zorunlu)

**Adım 1: İndirme**
- [Node.js resmi sitesine](https://nodejs.org/) gidin
- "LTS" (Long Term Support) sürümünü indirin (önerilen: v18.x veya üzeri)
- `.msi` dosyasını indirin

**Adım 2: Kurulum**
1. İndirilen `.msi` dosyasını çalıştırın
2. "Next" butonlarına tıklayarak ilerleyin
3. Kurulum seçeneklerinde "Automatically install the necessary tools" seçeneğini işaretleyin
4. Kurulumu tamamlayın

**Adım 3: Doğrulama**
PowerShell'i açın ve şu komutları çalıştırın:
```powershell
node --version
npm --version
```
Her iki komut da bir versiyon numarası göstermelidir (örn: v18.17.0, 9.6.7)

---

### 2. Expo CLI (Zorunlu)

PowerShell'de şu komutu çalıştırın:
```powershell
npm install -g expo-cli
```

Kurulumu doğrulayın:
```powershell
expo --version
```

---

### 3. Android Studio (Sadece Android Emulator için)

**Not**: Eğer sadece fiziksel telefon kullanacaksanız veya Expo Go kullanacaksanız, bu adımı atlayabilirsiniz.

**Adım 1: İndirme**
- [Android Studio resmi sitesine](https://developer.android.com/studio) gidin
- "Download Android Studio" butonuna tıklayın
- İndirme başlayacaktır (yaklaşık 1 GB)

**Adım 2: Kurulum**
1. İndirilen `.exe` dosyasını çalıştırın
2. Kurulum sihirbazını takip edin
3. Kurulum türü seçerken "Standard" seçin
4. Kurulum tamamlandığında Android Studio'yu açın

**Adım 3: SDK Kurulumu**
1. Android Studio açıldığında "More Actions" > "SDK Manager" seçin
2. "SDK Platforms" sekmesinde:
   - Android 13.0 (Tiramisu) - API Level 33 veya üzeri seçin
3. "SDK Tools" sekmesinde şunların seçili olduğundan emin olun:
   - Android SDK Build-Tools
   - Android SDK Platform-Tools
   - Android Emulator
   - Intel x86 Emulator Accelerator (HAXM installer) - Intel işlemciler için
4. "Apply" ve "OK" butonlarına tıklayın
5. Kurulum tamamlanana kadar bekleyin

**Adım 4: Ortam Değişkenlerini Ayarlama**
1. Windows arama çubuğuna "Ortam Değişkenleri" yazın
2. "Ortam değişkenlerini düzenle" seçeneğini açın
3. "Sistem değişkenleri" bölümünde "Yeni" butonuna tıklayın
4. Değişken adı: `ANDROID_HOME`
5. Değişken değeri: `C:\Users\<KullanıcıAdınız>\AppData\Local\Android\Sdk`
   - **Not**: `<KullanıcıAdınız>` yerine kendi kullanıcı adınızı yazın
   - Alternatif olarak, Android Studio'da SDK yolunu kontrol edebilirsiniz: File > Settings > Appearance & Behavior > System Settings > Android SDK
6. "Tamam" butonuna tıklayın
7. `Path` değişkenini bulun ve "Düzenle" butonuna tıklayın
8. "Yeni" butonuna tıklayın ve şunu ekleyin: `%ANDROID_HOME%\platform-tools`
9. Tekrar "Yeni" butonuna tıklayın ve şunu ekleyin: `%ANDROID_HOME%\tools`
10. Tüm pencereleri "Tamam" ile kapatın
11. **PowerShell'i kapatıp yeniden açın** (değişikliklerin etkili olması için)

**Adım 5: Emulator Oluşturma**
1. Android Studio'da "More Actions" > "Virtual Device Manager" seçin
2. "Create Device" butonuna tıklayın
3. Bir cihaz seçin (örn: Pixel 5, Pixel 6)
4. "Next" butonuna tıklayın
5. Sistem görüntüsü seçin (API 33 veya üzeri önerilir)
   - Eğer yoksa, "Download" butonuna tıklayarak indirin
6. "Next" ve "Finish" butonlarına tıklayın

---

## 🚀 Kurulum Adımları

### Proje Bağımlılıklarını Yükleme

1. PowerShell'i açın
2. Proje dizinine gidin:
   ```powershell
   cd C:\codespace\ai\kalk
   ```
3. Bağımlılıkları yükleyin:
   ```powershell
   npm install
   ```
   Bu işlem birkaç dakika sürebilir.

---

## 📱 Uygulamayı Çalıştırma

### Yöntem 1: Expo Go ile (En Kolay - Önerilen)

Bu yöntem fiziksel telefonunuzu kullanır ve en kolay yöntemdir.

**Adım 1: Expo Go Uygulamasını İndirin**
- **Android**: [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS**: [App Store](https://apps.apple.com/app/expo-go/id982107779)

**Adım 2: Uygulamayı Başlatın**
PowerShell'de proje dizininde:
```powershell
npm start
```

**Adım 3: QR Kodu Tarayın**
1. Terminal'de bir QR kod görünecektir
2. Android için: Expo Go uygulamasını açın ve "Scan QR code" seçeneğini kullanın
3. iOS için: Kamera uygulamasını açın ve QR kodu tarayın, açılan bildirime tıklayın
4. Uygulama telefonunuzda açılacaktır

**Not**: Bilgisayarınız ve telefonunuz aynı Wi-Fi ağında olmalıdır.

---

### Yöntem 2: Android Emulator ile

**Adım 1: Emulator'ü Başlatın**
1. Android Studio'yu açın
2. "More Actions" > "Virtual Device Manager" seçin
3. Oluşturduğunuz emulator'ün yanındaki ▶️ (Play) butonuna tıklayın
4. Emulator açılana kadar bekleyin (ilk açılışta birkaç dakika sürebilir)

**Adım 2: Uygulamayı Başlatın**
PowerShell'de proje dizininde:
```powershell
npm start
```

Başka bir PowerShell penceresi açın ve:
```powershell
cd C:\codespace\ai\kalk
npm run android
```

Uygulama emulator'de otomatik olarak açılacaktır.

---

### Yöntem 3: Fiziksel Android Cihaz (USB ile)

**Adım 1: USB Hata Ayıklamayı Aktifleştirin**
1. Telefonunuzda: Ayarlar > Telefon Hakkında
2. "Yapı Numarası"na 7 kez dokunun
3. "Geliştirici seçenekleri" açılacaktır
4. Ayarlar > Sistem > Geliştirici Seçenekleri
5. "USB Hata Ayıklama"nı açın

**Adım 2: Telefonu Bağlayın**
1. Telefonu USB kablosu ile bilgisayara bağlayın
2. Telefonda "USB hata ayıklamaya izin ver" bildirimine "İzin Ver" deyin

**Adım 3: Cihazı Kontrol Edin**
PowerShell'de:
```powershell
adb devices
```
Telefonunuz listede görünmelidir.

**Adım 4: Uygulamayı Başlatın**
```powershell
npm start
```

Başka bir PowerShell penceresi açın:
```powershell
cd C:\codespace\ai\kalk
npm run android
```

---

## 🔍 Sorun Giderme

### "node: command not found" hatası
- Node.js'in kurulu olduğundan emin olun
- PowerShell'i kapatıp yeniden açın
- Node.js kurulum yolunun PATH'te olduğunu kontrol edin

### "expo: command not found" hatası
```powershell
npm install -g expo-cli
```

### "ANDROID_HOME is not set" hatası
- Ortam değişkenlerini doğru ayarladığınızdan emin olun
- PowerShell'i kapatıp yeniden açın
- SDK yolunun doğru olduğunu kontrol edin

### Emulator başlamıyor
- Android Studio'dan emulator'ü manuel olarak başlatın
- HAXM'in kurulu olduğundan emin olun (Intel işlemciler için)
- BIOS'ta Virtualization Technology (VT-x) aktif olmalı

### "Metro bundler" hataları
```powershell
npm start -- --reset-cache
```

### Bağımlılık hataları
```powershell
npm install --legacy-peer-deps
```

### QR kod görünmüyor
- Terminal penceresini büyütün
- `npm start` komutunu tekrar çalıştırın

### Telefonda uygulama açılmıyor
- Bilgisayar ve telefon aynı Wi-Fi ağında olmalı
- Firewall'ın Expo'ya izin verdiğinden emin olun
- Expo Go uygulamasının güncel olduğundan emin olun

### Port zaten kullanılıyor hatası
```powershell
# Port 8081'i kullanan işlemi bulun ve sonlandırın
netstat -ano | findstr :8081
taskkill /PID <PID_NUMARASI> /F
```

---

## ✅ Kurulum Kontrol Listesi

Kurulumun başarılı olduğunu kontrol etmek için:

- [ ] `node --version` komutu çalışıyor
- [ ] `npm --version` komutu çalışıyor
- [ ] `expo --version` komutu çalışıyor
- [ ] `npm install` hatasız tamamlandı
- [ ] `npm start` komutu çalışıyor ve QR kod görünüyor
- [ ] Expo Go uygulaması telefonunuzda kurulu
- [ ] QR kod tarandığında uygulama açılıyor

---

## 📞 Yardım

Sorun yaşıyorsanız:
1. Hata mesajını tam olarak okuyun
2. Google'da hata mesajını arayın
3. [Expo dokümantasyonunu](https://docs.expo.dev/) kontrol edin
4. [React Native dokümantasyonunu](https://reactnative.dev/docs/getting-started) kontrol edin

---

**İyi geliştirmeler! 🚀**

