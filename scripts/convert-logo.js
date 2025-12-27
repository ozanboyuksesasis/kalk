const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/logo.svg');
const assetsDir = path.join(__dirname, '../assets');

// SVG'yi PNG'ye dönüştür
async function convertLogo() {
  try {
    // Ana icon (1024x1024)
    await sharp(svgPath)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    console.log('✅ icon.png oluşturuldu (1024x1024)');

    // Adaptive icon (1024x1024) - Android için
    await sharp(svgPath)
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    console.log('✅ adaptive-icon.png oluşturuldu (1024x1024)');

    // Splash screen (1242x2436) - iOS için
    await sharp(svgPath)
      .resize(1242, 2436, {
        fit: 'contain',
        background: { r: 33, g: 150, b: 243 } // #2196F3
      })
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));
    console.log('✅ splash.png oluşturuldu (1242x2436)');

    console.log('\n🎉 Tüm logo dosyaları başarıyla oluşturuldu!');
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.log('\n💡 Alternatif: SVG dosyasını online bir araçla PNG\'ye dönüştürebilirsin:');
    console.log('   https://cloudconvert.com/svg-to-png');
  }
}

convertLogo();

