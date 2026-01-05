const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/logo/logo.svg');
const assetsDir = path.join(__dirname, '../assets/logo');

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
    // Önce mavi arka plan oluştur
    const splashWidth = 1242;
    const splashHeight = 2436;
    const logoSize = 800; // Logo boyutu (daha büyük, border olmaması için)
    
    // Mavi arka plan oluştur
    const background = sharp({
      create: {
        width: splashWidth,
        height: splashHeight,
        channels: 3,
        background: { r: 33, g: 150, b: 243 } // #2196F3
      }
    });
    
    // Logo'yu resize et (transparent background ile)
    const logo = await sharp(svgPath)
      .resize(logoSize, logoSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
      })
      .png()
      .toBuffer();
    
    // Logo'yu merkeze yerleştir
    const logoX = Math.floor((splashWidth - logoSize) / 2);
    const logoY = Math.floor((splashHeight - logoSize) / 2);
    
    await background
      .composite([{
        input: logo,
        left: logoX,
        top: logoY
      }])
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));
    console.log('✅ splash.png oluşturuldu (1242x2436, border yok)');
    
    // Android splash screen logo'ları için farklı boyutlarda oluştur
    const androidSizes = [
      { name: 'hdpi', size: 240 },
      { name: 'mdpi', size: 180 },
      { name: 'xhdpi', size: 320 },
      { name: 'xxhdpi', size: 480 },
      { name: 'xxxhdpi', size: 640 }
    ];
    
    for (const { name, size } of androidSizes) {
      const androidLogo = await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
        })
        .png()
        .toBuffer();
      
      const androidDir = path.join(__dirname, '../android/app/src/main/res/drawable-' + name);
      if (!fs.existsSync(androidDir)) {
        fs.mkdirSync(androidDir, { recursive: true });
      }
      
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
        }
      })
      .composite([{
        input: androidLogo,
        left: 0,
        top: 0
      }])
      .png()
      .toFile(path.join(androidDir, 'splashscreen_logo.png'));
      
      console.log(`✅ Android ${name} splashscreen_logo.png oluşturuldu (${size}x${size})`);
    }

    console.log('\n🎉 Tüm logo dosyaları başarıyla oluşturuldu!');
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.log('\n💡 Alternatif: SVG dosyasını online bir araçla PNG\'ye dönüştürebilirsin:');
    console.log('   https://cloudconvert.com/svg-to-png');
  }
}

convertLogo();

