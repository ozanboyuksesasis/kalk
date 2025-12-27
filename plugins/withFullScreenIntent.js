// Expo config plugin - Artık kullanılmıyor, sadece placeholder
const { withAndroidManifest } = require('@expo/config-plugins');

const withFullScreenIntent = (config) => {
  return withAndroidManifest(config, async (config) => {
    // Artık native modül yok, sadece notification kullanıyoruz
    return config;
  });
};

module.exports = withFullScreenIntent;

