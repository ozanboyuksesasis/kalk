// Süreyi formatla (üstteki açıklayıcı yazı için)
export const formatTime = (minutes) => {
  // Güvenlik kontrolü - her zaman string döndür
  try {
    const safeMinutes = Number(minutes);
    if (isNaN(safeMinutes) || safeMinutes < 0 || minutes === null || minutes === undefined) {
      return '0 sn sonra kalk';
    }
    
    // Eğer dakika değeri ondalıklıysa (örn: 0.5 = 30 saniye)
    if (safeMinutes < 1) {
      const seconds = Math.floor(safeMinutes * 60);
      return String(seconds) + ' sn sonra kalk';
    } else if (safeMinutes < 60) {
      const mins = Math.floor(safeMinutes);
      const secs = Math.floor((safeMinutes - mins) * 60);
      if (secs > 0) {
        return String(mins) + ' dk ' + String(secs) + ' sn sonra kalk';
      }
      return String(mins) + ' dk sonra kalk';
    } else {
      const hours = Math.floor(safeMinutes / 60);
      const mins = Math.floor(safeMinutes % 60);
      if (mins === 0) {
        return String(hours) + ' saat sonra kalk';
      }
      return String(hours) + ' saat ' + String(mins) + ' dk sonra kalk';
    }
  } catch (error) {
    return '0 sn sonra kalk';
  }
};

// Geri sayım için ayrıntılı format (saat/dk/sn)
export const formatCountdown = (totalSeconds) => {
  // Güvenlik kontrolü - her zaman string döndür
  try {
    const safeSeconds = Number(totalSeconds);
    if (isNaN(safeSeconds) || safeSeconds < 0 || totalSeconds === null || totalSeconds === undefined) {
      return '0 sn';
    }

    const totalSecondsInt = Math.floor(safeSeconds);
    const hours = Math.floor(totalSecondsInt / 3600);
    const minutes = Math.floor((totalSecondsInt % 3600) / 60);
    const seconds = totalSecondsInt % 60;

    const parts = [];
    if (hours > 0) parts.push(String(hours) + ' saat');
    if (minutes > 0) parts.push(String(minutes) + ' dk');
    parts.push(String(seconds) + ' sn');

    const result = parts.join(' ');
    return result || '0 sn';
  } catch (error) {
    return '0 sn';
  }
};

