// Sağlık mesajları (tıbbi & ergonomik kurallara dayalı)
// Kaynak: Ergonomi rehberleri, ofis sağlığı çalışmaları, kas-iskelet sistemi araştırmaları
// NOT: Bu mesajlar alarm kurma aşamasında gösterilir, henüz oturma başlamamıştır
export const getHealthMessage = (minutes) => {
  // Güvenlik kontrolü - her zaman geçerli bir obje döndür
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes < 0) {
    return { message: 'Süre ayarlanmamış', color: '#999' };
  }
  
  // 0-20 dakika: Güvenli bölge
  if (minutes <= 20) {
    return { message: 'Harika! En sağlıklı oturma süresi seçildi', color: '#4CAF50' };
  } 
  // 20-30 dakika: Güvenli ama hareket önerilir
  // Kas-iskelet sistemi mikro zorlanmaları başlar, kan dolaşımı yavaşlar
  else if (minutes <= 30) {
    return { message: 'Kas-iskelet sistemi mikro zorlanmaları başlar, kan dolaşımı yavaşlar. Kısa bir esneme iyi gelir.', color: '#8BC34A' };
  } 
  // 30-40 dakika: Hala güvenli ama dikkatli olunmalı
  else if (minutes <= 40) {
    return { message: 'Sağlıklı bir süre seçtin. Hareket etmeyi unutma.', color: '#9CCC65' };
  } 
  // 40-45 dakika: ⭐ ÖNERİLEN ALARM NOKTASI
  // Ergonomi rehberleri ve ofis sağlığı çalışmalarına göre sağlıklı sınır
  // Bel, boyun ve omuz kaslarında yük artışı riski
  else if (minutes <= 45) {
    return { message: 'Bel, boyun ve omuz kaslarında yük artışı riski.', color: '#FFC107' };
  } 
  // 45-60 dakika: Dikkat edilmesi gereken eşik yaklaşıyor
  else if (minutes < 60) {
    return { message: 'Bel ve boyun kaslarında yük artışı riski. Dikkatli olunmalı.', color: '#FF9800' };
  } 
  // 60 dakika (1 saat): ⚠️ Dikkat edilmesi gereken eşik
  // Duruş bozukluğu riski, bel fıtığı riskinde artış, metabolizma yavaşlar
  else if (minutes <= 60) {
    return { message: 'Duruş bozukluğu riski, bel fıtığı riskinde artış, metabolizma yavaşlar.', color: '#FF5722' };
  } 
  // 60-90 dakika: Riskli bölge
  // Kan akışı ciddi şekilde azalır, bel disklerine binen yük artar, boyun düzleşmesi riski
  else if (minutes <= 90) {
    return { message: 'Kan akışı ciddi şekilde azalır, bel disklerine binen yük artar, boyun düzleşmesi riski.', color: '#F44336' };
  } 
  // 90-120 dakika: Çok riskli
  else if (minutes < 120) {
    return { message: 'Kan akışı ciddi şekilde azalır, bel disklerine binen yük artar, boyun düzleşmesi riski.', color: '#D32F2F' };
  } 
  // 120+ dakika (2 saat): 🚨 Tıbben önerilmez
  // Kalp-damar hastalıkları riski, Tip 2 diyabet riski, kronik bel ağrısı, varis ve pıhtı riski
  else {
    return { message: 'Kalp-damar hastalıkları riski, Tip 2 diyabet riski, kronik bel ağrısı, varis ve pıhtı riski. Tıbben önerilmez.', color: '#B71C1C' };
  }
};

