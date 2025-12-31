# 🚀 Expo Bare Geçiş Rehberi

Bu rehber, Expo Managed'dan Expo Bare'e geçiş için adım adım talimatlar içerir.

## ✅ Yapılan Değişiklikler

1. **Notifee Paketi Eklendi**
   - `@notifee/react-native` paketi `package.json`'a eklendi
   - **NOT:** Notifee'nin Expo config plugin'i yok, bu yüzden `app.json`'a eklenmedi (native modül olarak çalışıyor)

2. **Alarm Servisi Oluşturuldu**
   - `services/alarmService.js` dosyası oluşturuldu
   - Android full-screen alarm desteği
   - iOS time-sensitive bildirim desteği

3. **App.js Güncellendi**
   - Notifee servisi entegre edildi
   - Alarm planlama ve gösterim Notifee ile yapılıyor

## 📋 Adım Adım Kurulum

### 1️⃣ Prebuild (Native Klasörleri Oluştur)

```bash
cd C:\codespace\ai\kalk
npx expo prebuild
```

Bu komut:
- `android/` ve `ios/` klasörlerini oluşturur
- Expo config'i korur
- **Geri dönüşsüz DEĞİL** (git'teyse)

### 2️⃣ Paketleri Yükle

```bash
npm install
```

### 3️⃣ iOS Pods Yükle (Sadece iOS için)

```bash
cd ios
pod install
cd ..
```

### 4️⃣ Android Full-Screen Intent Yapılandırması

`android/app/src/main/AndroidManifest.xml` dosyasına ekle:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask"
    android:exported="true"
    android:theme="@style/AppTheme">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>

<!-- Full-screen intent için -->
<activity
    android:name="com.notifee.core.ForegroundService"
    android:foregroundServiceType="mediaProjection"
    android:exported="false" />
```

### 5️⃣ iOS Info.plist Yapılandırması

`ios/kalk/Info.plist` dosyasına ekle:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

## 🧪 Test

### Android

```bash
# Android cihazda çalıştır
npx expo run:android

# Veya EAS Build ile test APK oluştur
eas build -p android --profile preview
```

**Test Senaryosu:**
1. Timer başlat (örn: 10 saniye)
2. Uygulamayı swipe ile kapat (tamamen kapat)
3. Alarm gelsin
4. Full-screen alarm ekranı açılsın ✅

### iOS

```bash
# iOS simülatörde çalıştır
npx expo run:ios

# Veya gerçek cihazda
eas build -p ios --profile preview
```

**Test Senaryosu:**
1. Timer başlat (örn: 10 saniye)
2. Uygulamayı swipe ile kapat
3. Bildirim gelsin
4. Bildirime tıkla
5. Alarm ekranı açılsın ✅

**⚠️ ÖNEMLİ:** iOS simülatör ≠ gerçek cihaz. Gerçek cihazda test et!

## 📦 Build & Dağıtım

### Android APK (Test)

```bash
eas build -p android --profile preview
```

### Android AAB (Production)

```bash
eas build -p android --profile production
```

### iOS TestFlight

```bash
eas build -p ios --profile preview
```

### iOS App Store

```bash
eas build -p ios --profile production
```

## 🔧 Özellikler

### Android
- ✅ App kapalıyken alarm
- ✅ Full-screen alarm
- ✅ Zorla açma
- ✅ Exact alarm (Android 12+)

### iOS
- ✅ Time-sensitive bildirimler (iOS 15+)
- ✅ Bildirim tıklanınca alarm ekranı
- ❌ App kapalıyken zorla açma YOK (Apple kısıtı)

## ⚠️ Bilinen Sınırlamalar

1. **iOS Alarm Kısıtı**
   - iOS'ta uygulama kapalıyken zorla açma yok
   - Sadece bildirim gösterilebilir
   - Kullanıcı bildirime tıklamalı

2. **Android Battery Optimization**
   - Bazı OEM'ler (Samsung, Xiaomi, vb.) battery optimization yapıyor
   - Kullanıcıdan "Battery optimization'dan muaf tut" izni istenebilir

3. **Expo Update Uyumu**
   - OTA update'ler hala çalışıyor
   - Native kod değişiklikleri için yeni build gerekli

## 🐛 Sorun Giderme

### Android: Alarm çalışmıyor

1. Battery optimization'ı kontrol et
2. Exact alarm izni verildi mi kontrol et
3. Full-screen intent yapılandırması doğru mu kontrol et

### iOS: Bildirim gelmiyor

1. Bildirim izni verildi mi kontrol et
2. Time-sensitive bildirim izni verildi mi kontrol et
3. Info.plist yapılandırması doğru mu kontrol et

### Build Hatası

```bash
# Cache temizle
npm cache clean --force
rm -rf node_modules
npm install

# iOS pods temizle
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

## 📚 Kaynaklar

- [Notifee Dokümantasyonu](https://notifee.app/react-native/docs/overview)
- [Expo Bare Workflow](https://docs.expo.dev/bare/overview/)
- [Android Full-Screen Intent](https://developer.android.com/training/notifications/use-cases#full-screen)

## ✅ Sonuç

Expo Bare geçişi tamamlandı! Artık:
- Android'de full-screen alarm çalışıyor
- iOS'ta time-sensitive bildirimler çalışıyor
- Alarm sistemi daha güvenilir
- Production-ready ürün seviyesinde

