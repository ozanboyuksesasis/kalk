// Süreyi formatla (üstteki açıklayıcı yazı için)
export const formatTime = (minutes, t) => {
  // Güvenlik kontrolü - her zaman string döndür
  try {
    const safeMinutes = Number(minutes);
    if (isNaN(safeMinutes) || safeMinutes < 0 || minutes === null || minutes === undefined) {
      return t ? `0 ${t('timer.secondsShort')} ${t('timer.afterStandUp')}` : '0 sn sonra kalk';
    }
    
    // Eğer dakika değeri ondalıklıysa (örn: 0.5 = 30 saniye)
    if (safeMinutes < 1) {
      const seconds = Math.floor(safeMinutes * 60);
      return t ? `${seconds} ${t('timer.secondsShort')} ${t('timer.afterStandUp')}` : `${seconds} sn sonra kalk`;
    } else if (safeMinutes < 60) {
      const mins = Math.floor(safeMinutes);
      const secs = Math.floor((safeMinutes - mins) * 60);
      if (secs > 0) {
        return t ? `${mins} ${t('timer.minutesShort')} ${secs} ${t('timer.secondsShort')} ${t('timer.afterStandUp')}` : `${mins} dk ${secs} sn sonra kalk`;
      }
      return t ? `${mins} ${t('timer.minutesShort')} ${t('timer.afterStandUp')}` : `${mins} dk sonra kalk`;
    } else {
      const hours = Math.floor(safeMinutes / 60);
      const mins = Math.floor(safeMinutes % 60);
      if (mins === 0) {
        return t ? `${hours} ${t('timer.hoursShort')} ${t('timer.afterStandUp')}` : `${hours} saat sonra kalk`;
      }
      return t ? `${hours} ${t('timer.hoursShort')} ${mins} ${t('timer.minutesShort')} ${t('timer.afterStandUp')}` : `${hours} saat ${mins} dk sonra kalk`;
    }
  } catch (error) {
    return t ? `0 ${t('timer.secondsShort')} ${t('timer.afterStandUp')}` : '0 sn sonra kalk';
  }
};

// Geri sayım için ayrıntılı format (saat/dk/sn)
export const formatCountdown = (totalSeconds, t) => {
  // Güvenlik kontrolü - her zaman string döndür
  try {
    const safeSeconds = Number(totalSeconds);
    if (isNaN(safeSeconds) || safeSeconds < 0 || totalSeconds === null || totalSeconds === undefined) {
      return t ? `0 ${t('timer.secondsShort')}` : '0 sn';
    }

    const totalSecondsInt = Math.floor(safeSeconds);
    const hours = Math.floor(totalSecondsInt / 3600);
    const minutes = Math.floor((totalSecondsInt % 3600) / 60);
    const seconds = totalSecondsInt % 60;

    const parts = [];
    if (hours > 0) parts.push(String(hours) + (t ? ` ${t('timer.hoursShort')}` : ' saat'));
    if (minutes > 0) parts.push(String(minutes) + (t ? ` ${t('timer.minutesShort')}` : ' dk'));
    parts.push(String(seconds) + (t ? ` ${t('timer.secondsShort')}` : ' sn'));

    const result = parts.join(' ');
    return result || (t ? `0 ${t('timer.secondsShort')}` : '0 sn');
  } catch (error) {
    return t ? `0 ${t('timer.secondsShort')}` : '0 sn';
  }
};

