/**
 * PWA Icon Generator Script
 * 
 * This script generates PNG icons from the SVG source for better PWA compatibility.
 * Run with: node scripts/generate-icons.js
 * 
 * Requirements:
 *   npm install sharp
 * 
 * Alternatively, you can use online tools like:
 *   - https://realfavicongenerator.net/
 *   - https://maskable.app/editor
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
try {
  const sharp = require('sharp');
  
  const sizes = [192, 512];
  const inputSvg = path.join(__dirname, '../public/pwa-512x512.svg');
  const outputDir = path.join(__dirname, '../public');
  
  async function generateIcons() {
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `pwa-${size}x${size}.png`);
      
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated: pwa-${size}x${size}.png`);
    }
    
    // Generate Apple Touch Icon (180x180)
    const applePath = path.join(outputDir, 'apple-touch-icon.png');
    await sharp(inputSvg)
      .resize(180, 180)
      .png()
      .toFile(applePath);
    
    console.log('Generated: apple-touch-icon.png');
    console.log('\nDone! PNG icons have been generated.');
  }
  
  generateIcons().catch(console.error);
  
} catch (e) {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    PWA Icon Generator                          ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  To generate PNG icons from SVG, install sharp:                ║
║                                                                ║
║    npm install -D sharp                                        ║
║    node scripts/generate-icons.js                              ║
║                                                                ║
║  Or use online tools:                                          ║
║  • https://realfavicongenerator.net/                          ║
║  • https://maskable.app/editor                                ║
║                                                                ║
║  The app will work with SVG icons, but PNG provides            ║
║  better compatibility with older browsers.                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
`);
}

