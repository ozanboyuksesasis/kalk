# Kalk - Oturma Hatırlatıcı Uygulaması

Kalk, uzun süreli oturmalardan kaçınmak için tasarlanmış bir React Native uygulamasıdır. Özellikle kıl dönmesi ameliyatı sonrası iyileşme sürecinde ve genel sağlık için faydalıdır.

## Özellikler

- ⏰ **Yuvarlak Döner Düğme**: Walkman tarzı döner düğme ile kolay süre ayarlama (10 dakika artış/azalış)
- 🔔 **Akıllı Alarm**: Süre dolduğunda titreşim ve görsel uyarı
- ⏸️ **Erteleme**: Ayarlanabilir erteleme süresi ve maksimum erteleme sayısı
- 💚 **Sağlık Bilgilendirme**: Oturma süresine göre bilimsel dayanaklı sağlık mesajları
- 📱 **Cross-Platform**: iOS ve Android desteği
- 🎨 **Responsive Tasarım**: Tüm ekran boyutlarına uyumlu

## Windows'ta Kurulum ve Çalıştırma

### 1. Gerekli Araçları Kurun

#### Node.js Kurulumu
1. [Node.js resmi sitesinden](https://nodejs.org/) LTS sürümünü indirin
2. İndirilen `.msi` dosyasını çalıştırın ve kurulum sihirbazını takip edin
3. Kurulum sonrası PowerShell'i yeniden başlatın
4. Kurulumu doğrulayın:
   ```powershell
   node --version
   npm --version
   ```

#### Expo CLI Kurulumu
```powershell
npm install -g expo-cli
```

### 2. Android Geliştirme Ortamı (Android için)

#### Android Studio Kurulumu
1. [Android Studio'yu indirin](https://developer.android.com/studio)
2. Kurulum sırasında şu bileşenleri seçin:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
   - Performance (Intel HAXM) - eğer Intel işlemci kullanıyorsanız

#### Ortam Değişkenlerini Ayarlayın
1. Windows arama çubuğuna "Ortam Değişkenleri" yazın
2. "Ortam değişkenlerini düzenle" seçeneğini açın
3. Sistem değişkenlerine şunları ekleyin:
   - `ANDROID_HOME`: `C:\Users\<KullanıcıAdınız>\AppData\Local\Android\Sdk`
   - `PATH` değişkenine ekleyin: `%ANDROID_HOME%\platform-tools` ve `%ANDROID_HOME%\tools`

#### Android Emulator Oluşturma
1. Android Studio'yu açın
2. "More Actions" > "Virtual Device Manager"
3. "Create Device" butonuna tıklayın
4. Bir cihaz seçin (örn: Pixel 5)
5. Sistem görüntüsü seçin (API 33 veya üzeri önerilir)
6. "Finish" ile tamamlayın

### 3. iOS Geliştirme (Sadece Mac için)

**Not**: Windows'ta iOS geliştirme yapılamaz. iOS uygulamasını test etmek için:
- Mac bilgisayar kullanın, veya
- Expo Go uygulamasını iOS cihazınıza yükleyin (aşağıya bakın)

### 4. Projeyi Çalıştırma

#### Bağımlılıkları Yükleyin
```powershell
cd C:\codespace\ai\kalk
npm install
```

#### Uygulamayı Başlatın

**Seçenek 1: Expo Go ile (Önerilen - En Kolay)**
1. Telefonunuza [Expo Go](https://expo.dev/client) uygulamasını indirin:
   - [Android için Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS için App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Proje dizininde çalıştırın:
   ```powershell
   npm start
   ```
3. QR kodu telefonunuzla tarayın (Expo Go uygulaması içinden)

**Seçenek 2: Android Emulator ile**
1. Android Studio'dan bir emulator başlatın
2. Proje dizininde çalıştırın:
   ```powershell
   npm start
   ```
3. Başka bir terminalde:
   ```powershell
   npm run android
   ```

**Seçenek 3: Fiziksel Android Cihaz**
1. Telefonunuzda "Geliştirici Seçenekleri"ni açın:
   - Ayarlar > Telefon Hakkında > Yapı Numarası'na 7 kez dokunun
2. "USB Hata Ayıklama"nı açın
3. Telefonu USB ile bilgisayara bağlayın
4. Proje dizininde:
   ```powershell
   npm start
   npm run android
   ```

### 5. Geliştirme İpuçları

- **Hot Reload**: Kod değişiklikleriniz otomatik olarak uygulamaya yansır
- **Debugging**: Chrome'da `http://localhost:19000/debugger` adresini açarak debug yapabilirsiniz
- **Logs**: Terminal'de uygulama loglarını görebilirsiniz

## Kullanım

1. **Süre Ayarlama**: 
   - Yuvarlak düğmeyi sağa-sola çevirerek veya +/- butonlarını kullanarak süreyi ayarlayın
   - Her dönüş 10 dakika artırır/azaltır

2. **Zamanlayıcıyı Başlatma**: 
   - "Başlat" butonuna basın
   - Geri sayım başlar

3. **Alarm Geldiğinde**:
   - Telefon titreşir ve uyarı gösterir
   - "Ertele" ile belirli süre erteleyebilirsiniz
   - "Kalktım" ile alarmı kapatabilirsiniz

4. **Ayarlar**:
   - Sağ üstteki ⚙️ ikonuna tıklayın
   - Erteleme süresi ve maksimum erteleme sayısını ayarlayın

## Sağlık Bilgileri

Uygulama, oturma süresine göre bilimsel dayanaklı mesajlar gösterir:

- **≤30 dakika**: Harika! En sağlıklı oturma zamanı
- **31-40 dakika**: İyi! Hala sağlıklı bir süre
- **41-50 dakika**: Kabul edilebilir, ancak dikkatli olun
- **51-60 dakika**: Uzun süreli oturma, bel ağrısı riski artıyor
- **61-90 dakika**: Çok uzun süre! Bel ağrılarınız olursa şaşırmayın
- **>90 dakika**: Tehlikeli! Sağlık riskleri çok yüksek

## Teknik Detaylar

- **Framework**: React Native (Expo)
- **Platform**: iOS & Android
- **Minimum SDK**: Android 5.0 (API 21), iOS 11.0
- **Ana Kütüphaneler**:
  - expo-haptics: Titreşim desteği
  - expo-notifications: Bildirimler
  - react-native-reanimated: Animasyonlar
  - react-native-gesture-handler: Dokunma hareketleri
  - @react-native-async-storage/async-storage: Veri saklama

## Sorun Giderme

### "expo: command not found" hatası
```powershell
npm install -g expo-cli
```

### Android emulator başlamıyor
- Android Studio'dan emulator'ü manuel olarak başlatın
- HAXM'in kurulu olduğundan emin olun (Intel işlemciler için)

### Bağımlılık hataları
```powershell
npm install
# veya
npm install --legacy-peer-deps
```

### Metro bundler hataları
```powershell
npm start -- --reset-cache
```

## Lisans

Bu proje kişisel kullanım için geliştirilmiştir.

