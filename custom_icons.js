const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const { TbAlertTriangle, TbFileText, TbUserCircle, TbScale, TbFlag3 } = require('react-icons/tb');

const icons = {
  ci_warning: TbAlertTriangle,
  ci_document: TbFileText,
  ci_person: TbUserCircle,
  ci_scale: TbScale,
  ci_flag: TbFlag3,
};

const outDir = path.join(__dirname, 'assets');

const COLORS = { white: '#FFFFFF', teal: '#0C6D61', orange: '#F26800', darkgreen: '#012D2B', mint: '#A3CCAB' };

async function run() {
  for (const [name, Icon] of Object.entries(icons)) {
    for (const [colorName, color] of Object.entries(COLORS)) {
      const svg = ReactDOMServer.renderToStaticMarkup(
        React.createElement(Icon, { size: 256, color, strokeWidth: 1.6 })
      );
      const buf = await sharp(Buffer.from(svg)).png().toBuffer();
      fs.writeFileSync(path.join(outDir, `${name}_${colorName}.png`), buf);
    }
  }
  console.log('done');
}
run();
