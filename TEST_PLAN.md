# 🧪 Kapsamlı Test Planı - Kalk Uygulaması

## 📋 Test Senaryoları

### ✅ 1. UYGULAMA AÇIKKEN (Foreground - Active)

#### 1.1 Timer Başlatma
- [ ] Timer dial ile süre seçme (1-120 dakika)
- [ ] "Başlat" butonuna basma
- [ ] Timer'ın başladığını görsel olarak doğrulama (countdown, dial progress)
- [ ] AsyncStorage'a timer durumunun kaydedildiğini doğrulama

#### 1.2 Timer Çalışırken
- [ ] Countdown'un her saniye doğru şekilde azaldığını doğrulama
- [ ] Dial progress'in doğru şekilde güncellendiğini doğrulama
- [ ] Health message'in doğru şekilde gösterildiğini doğrulama
- [ ] **KRİTİK:** Uygulama açıkken bildirim gönderilmediğini doğrulama (log kontrolü)

#### 1.3 Timer Dolduğunda (Uygulama Açık)
- [ ] Alarm ekranının otomatik açıldığını doğrulama
- [ ] Alarm sesinin çaldığını doğrulama (ses açıksa)
- [ ] Titreşimin çalıştığını doğrulama (titreşim açıksa)
- [ ] **KRİTİK:** Tüm planlanmış bildirimlerin iptal edildiğini doğrulama (log kontrolü)
- [ ] Timer'ın durduğunu doğrulama (countdown 0)

#### 1.4 Timer Durdurma (Manuel)
- [ ] "Durdur" butonuna basma
- [ ] Timer'ın durduğunu doğrulama
- [ ] Interval'in temizlendiğini doğrulama (log kontrolü)
- [ ] AsyncStorage'dan timer durumunun silindiğini doğrulama

#### 1.5 Alarm Ekranı (Uygulama Açıkken)
- [ ] "Kalktım" butonuna basma
  - [ ] Alarm ekranının kapandığını doğrulama
  - [ ] Ses ve titreşimin durduğunu doğrulama
  - [ ] İstatistiklerin kaydedildiğini doğrulama
  - [ ] Timer'ın tamamen durduğunu doğrulama
  - [ ] ACTIVE_ALARM'ın temizlendiğini doğrulama
- [ ] "Ertele" butonuna basma (max erteleme sayısına kadar)
  - [ ] Alarm ekranının kapandığını doğrulama
  - [ ] Ses ve titreşimin durduğunu doğrulama
  - [ ] Yeni timer'ın başladığını doğrulama (erteleme süresi kadar)
  - [ ] Snooze count'un arttığını doğrulama
  - [ ] Max erteleme sayısına ulaşıldığında "Ertele" butonunun devre dışı olduğunu doğrulama

---

### ✅ 2. UYGULAMA ARKA PLANDA (Background)

#### 2.1 Timer Başlatma (Arka Plana Geçmeden Önce)
- [ ] Timer'ı başlat
- [ ] Uygulamayı arka plana al (home tuşu)
- [ ] **KRİTİK:** Interval'in durdurulduğunu doğrulama (log kontrolü - battery optimization)
- [ ] **KRİTİK:** Bildirimin planlandığını doğrulama (log kontrolü)
- [ ] Bildirim zamanının doğru hesaplandığını doğrulama (kalan süre kadar)

#### 2.2 Timer Çalışırken (Arka Planda)
- [ ] Timer'ın arka planda çalıştığını doğrulama (AsyncStorage kontrolü)
- [ ] **KRİTİK:** Bildirimin doğru zamanda geldiğini doğrulama (tam saniye hassasiyeti)
- [ ] Bildirim içeriğinin doğru olduğunu doğrulama (title, body, data)

#### 2.3 Timer Dolduğunda (Arka Planda)
- [ ] Bildirimin geldiğini doğrulama
- [ ] Bildirim sesinin çaldığını doğrulama
- [ ] Bildirim titreşiminin çalıştığını doğrulama (Android)
- [ ] ACTIVE_ALARM'ın kaydedildiğini doğrulama (AsyncStorage kontrolü)

#### 2.4 Bildirim Tıklama (Arka Planda)
- [ ] Bildirime tıklama
- [ ] Uygulamanın açıldığını doğrulama
- [ ] Alarm ekranının açıldığını doğrulama
- [ ] Ses ve titreşimin çalıştığını doğrulama
- [ ] ACTIVE_ALARM'ın temizlendiğini doğrulama

#### 2.5 Uygulamayı Ön Plana Getirme (Arka Planda Timer Çalışırken)
- [ ] Timer'ın çalıştığını doğrulama
- [ ] Kalan sürenin doğru hesaplandığını doğrulama (calculateRemainingTime)
- [ ] Countdown'un doğru gösterildiğini doğrulama
- [ ] **KRİTİK:** Tüm planlanmış bildirimlerin iptal edildiğini doğrulama (log kontrolü)
- [ ] Interval'in yeniden başlatıldığını doğrulama (log kontrolü)

---

### ✅ 3. UYGULAMA KAPALI (Killed State)

#### 3.1 Timer Başlatma (Kapatmadan Önce)
- [ ] Timer'ı başlat
- [ ] Uygulamayı tamamen kapat (swipe away)
- [ ] **KRİTİK:** Bildirimin planlandığını doğrulama (log kontrolü)
- [ ] Bildirim zamanının doğru hesaplandığını doğrulama

#### 3.2 Timer Çalışırken (Kapalı)
- [ ] Timer'ın kapalıyken çalıştığını doğrulama (AsyncStorage kontrolü)
- [ ] **KRİTİK:** Bildirimin doğru zamanda geldiğini doğrulama (tam saniye hassasiyeti)
- [ ] Bildirim içeriğinin doğru olduğunu doğrulama

#### 3.3 Timer Dolduğunda (Kapalı)
- [ ] Bildirimin geldiğini doğrulama
- [ ] Bildirim sesinin çaldığını doğrulama
- [ ] Bildirim titreşiminin çalıştığını doğrulama (Android)
- [ ] ACTIVE_ALARM'ın kaydedildiğini doğrulama (AsyncStorage kontrolü)

#### 3.4 Bildirim Tıklama (Kapalı)
- [ ] Bildirime tıklama
- [ ] Uygulamanın açıldığını doğrulama
- [ ] Alarm ekranının açıldığını doğrulama
- [ ] Ses ve titreşimin çalıştığını doğrulama
- [ ] ACTIVE_ALARM'ın temizlendiğini doğrulama
- [ ] **KRİTİK:** getInitialNotification veya getLastNotificationResponseAsync ile yakalandığını doğrulama (log kontrolü)

#### 3.5 Uygulamayı Açma (Kapalı - Timer Çalışırken)
- [ ] Uygulamayı normal şekilde açma (bildirime tıklamadan)
- [ ] Timer durumunun restore edildiğini doğrulama
- [ ] Kalan sürenin doğru hesaplandığını doğrulama
- [ ] Countdown'un doğru gösterildiğini doğrulama
- [ ] **KRİTİK:** Timer dolmuşsa alarm ekranının açıldığını doğrulama

---

### ✅ 4. PLATFORM SPESİFİK TESTLER

#### 4.1 Android
- [ ] Bildirim channel'ının oluşturulduğunu doğrulama
- [ ] Full-screen intent'in çalıştığını doğrulama (Android 10+)
- [ ] Titreşim pattern'inin çalıştığını doğrulama
- [ ] Exact alarm permission'ının çalıştığını doğrulama (Android 12+)
- [ ] Bildirim sesinin çaldığını doğrulama

#### 4.2 iOS
- [ ] Time-sensitive notification'ın çalıştığını doğrulama (iOS 15+)
- [ ] Haptic feedback'in çalıştığını doğrulama
- [ ] Bildirim badge'inin gösterildiğini doğrulama
- [ ] Bildirim sesinin çaldığını doğrulama
- [ ] Critical alert permission'ının çalıştığını doğrulama (eğer kullanılıyorsa)

---

### ✅ 5. EDGE CASES VE HATA DURUMLARI

#### 5.1 Race Conditions
- [ ] Alarm ekranının 2 kez açılmadığını doğrulama (isAlarmRef kontrolü)
- [ ] ACTIVE_ALARM'ın 2 kez işlenmediğini doğrulama
- [ ] Interval'in 2 kez başlatılmadığını doğrulama

#### 5.2 Zaman Hesaplama
- [ ] calculateRemainingTime fonksiyonunun tutarlı çalıştığını doğrulama
- [ ] Uygulama arka plana geçip ön plana geldiğinde zamanın doğru hesaplandığını doğrulama
- [ ] Uygulama kapatılıp açıldığında zamanın doğru hesaplandığını doğrulama
- [ ] Saniye sayımının tutarlı olduğunu doğrulama (1 saniye = 1000ms)

#### 5.3 AsyncStorage Senkronizasyonu
- [ ] Timer durumunun doğru kaydedildiğini doğrulama
- [ ] Timer durumunun doğru restore edildiğini doğrulama
- [ ] ACTIVE_ALARM'ın doğru kaydedildiğini ve temizlendiğini doğrulama
- [ ] İstatistiklerin doğru kaydedildiğini doğrulama

#### 5.4 Bildirim İptal Etme
- [ ] Uygulama açıkken tüm bildirimlerin iptal edildiğini doğrulama
- [ ] Timer durdurulduğunda bildirimlerin iptal edildiğini doğrulama
- [ ] "Kalktım" butonuna basıldığında bildirimlerin iptal edildiğini doğrulama

#### 5.5 Ses ve Titreşim
- [ ] Ses kapalıyken ses çalmadığını doğrulama
- [ ] Titreşim kapalıyken titreşim çalmadığını doğrulama
- [ ] Alarm sesinin doğru çaldığını doğrulama (seçilen ses)
- [ ] Ses ve titreşimin "Kalktım" veya "Ertele" butonuna basıldığında durduğunu doğrulama

---

### ✅ 6. PERFORMANS VE BATTERY

#### 6.1 Battery Optimization
- [ ] Arka planda interval'in durdurulduğunu doğrulama
- [ ] Ön plana geldiğinde interval'in yeniden başlatıldığını doğrulama
- [ ] Gereksiz re-render'ların olmadığını doğrulama (React DevTools)

#### 6.2 Memory Leaks
- [ ] Interval'lerin doğru temizlendiğini doğrulama
- [ ] Timeout'ların doğru temizlendiğini doğrulama
- [ ] Event listener'ların doğru temizlendiğini doğrulama

---

## 🔍 Test Adımları

### Test 1: Uygulama Açıkken Timer
1. Uygulamayı aç
2. Timer dial ile 5 dakika seç
3. "Başlat" butonuna bas
4. Countdown'un azaldığını doğrulama
5. 5 dakika bekle (veya test için süreyi kısalt)
6. Alarm ekranının açıldığını doğrulama
7. "Kalktım" butonuna bas
8. Timer'ın durduğunu doğrulama

### Test 2: Arka Plana Geçiş
1. Timer'ı başlat (5 dakika)
2. Uygulamayı arka plana al
3. Log'ları kontrol et: "Uygulama arka plana geçti, bildirim güncelleniyor..."
4. 5 dakika bekle (veya test için süreyi kısalt)
5. Bildirimin geldiğini doğrulama
6. Bildirime tıkla
7. Alarm ekranının açıldığını doğrulama

### Test 3: Uygulama Kapatma
1. Timer'ı başlat (5 dakika)
2. Uygulamayı tamamen kapat (swipe away)
3. 5 dakika bekle (veya test için süreyi kısalt)
4. Bildirimin geldiğini doğrulama
5. Bildirime tıkla
6. Uygulamanın açıldığını ve alarm ekranının gösterildiğini doğrulama

### Test 4: Zaman Hesaplama
1. Timer'ı başlat (10 dakika)
2. 2 dakika bekle
3. Uygulamayı arka plana al
4. 3 dakika bekle
5. Uygulamayı ön plana getir
6. Kalan sürenin yaklaşık 5 dakika olduğunu doğrulama

### Test 5: Erteleme
1. Timer'ı başlat (1 dakika)
2. Alarm ekranı açıldığında "Ertele" butonuna bas
3. Yeni timer'ın başladığını doğrulama (erteleme süresi kadar)
4. Snooze count'un arttığını doğrulama
5. Max erteleme sayısına ulaşıldığında "Ertele" butonunun devre dışı olduğunu doğrulama

---

## 📝 Log Kontrol Listesi

Test sırasında şu log'ları kontrol et:

### ✅ Başarılı Senaryolar
- `✅ Timer başlatıldı`
- `✅ Bildirim planlandı`
- `✅ Uygulama arka plana geçti, bildirim güncelleniyor...`
- `✅ Uygulama açıldı, tüm planlanmış bildirimler iptal edildi`
- `🚨 Alarm tetikleniyor...`
- `✅ ACTIVE_ALARM temizlendi`

### ❌ Hata Senaryoları
- `❌ Bildirim iptal hatası` - OLMAMALI
- `❌ Alarm zaten açık, tekrar tetiklenmiyor` - Normal (race condition önleme)
- `⚠️ Alarm zaten açık, atlanıyor` - Normal (race condition önleme)

---

## 🐛 Bilinen Sorunlar ve Çözümler

### Sorun 1: Bildirim Uygulama Açıkken Geliyor
**Çözüm:** `updateTimer` içinde `appState === 'active'` kontrolü var, tüm bildirimler iptal ediliyor.

### Sorun 2: Alarm Ekranı 2 Kez Açılıyor
**Çözüm:** `isAlarmRef.current` kontrolü ile race condition önleniyor.

### Sorun 3: Zaman Hesaplama Tutarsız
**Çözüm:** `calculateRemainingTime` fonksiyonu tek merkezden zaman hesaplıyor.

---

## ✅ Test Sonuçları

Test tarihi: _______________
Test eden: _______________
Platform: Android / iOS / Her İkisi

### Genel Sonuç
- [ ] ✅ Tüm testler başarılı
- [ ] ⚠️ Bazı testler başarısız (detaylar aşağıda)
- [ ] ❌ Çoğu test başarısız

### Başarısız Testler
1. _______________________________
2. _______________________________
3. _______________________________

### Notlar
_______________________________________________
_______________________________________________
_______________________________________________

