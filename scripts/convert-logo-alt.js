const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets/logo-alternative');
const versions = ['v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v11', 'v12', 'v13', 'v14', 'v15', 'v16', 'v17', 'v18', 'v19', 'v20', 'v21', 'v22', 'v23', 'v24', 'v25', 'v26', 'v27', 'v28', 'v29', 'v30', 'v31', 'v32'];

// Her versiyon için PNG oluştur
async function convertLogos() {
  for (const version of versions) {
    const svgPath = path.join(assetsDir, `logo-${version}.svg`);
    const outputDir = path.join(assetsDir, version);
    
    // Klasör oluştur
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    try {
      // Icon (1024x1024)
      await sharp(svgPath)
        .resize(1024, 1024)
        .png()
        .toFile(path.join(outputDir, 'icon.png'));
      console.log(`✅ ${version}/icon.png oluşturuldu (1024x1024)`);

      // Adaptive icon (1024x1024)
      await sharp(svgPath)
        .resize(1024, 1024)
        .png()
        .toFile(path.join(outputDir, 'adaptive-icon.png'));
      console.log(`✅ ${version}/adaptive-icon.png oluşturuldu (1024x1024)`);

      // Splash screen (1242x2436)
      await sharp(svgPath)
        .resize(1242, 2436, {
          fit: 'contain',
          background: { r: 33, g: 150, b: 243 } // #2196F3
        })
        .png()
        .toFile(path.join(outputDir, 'splash.png'));
      console.log(`✅ ${version}/splash.png oluşturuldu (1242x2436)`);
    } catch (error) {
      console.error(`❌ ${version} için hata:`, error.message);
    }
  }
  
  console.log('\n🎉 Tüm alternatif logo dosyaları başarıyla oluşturuldu!');
  console.log('\n📁 Dosyalar:');
  console.log('   - assets/logo-alternative/v2/ (Halka içinde yürüyen insan)');
  console.log('   - assets/logo-alternative/v3/ (Yürüyen insan + timer + ok)');
  console.log('   - assets/logo-alternative/v4/ (Oval timer + yürüyen insan)');
}

convertLogos();

