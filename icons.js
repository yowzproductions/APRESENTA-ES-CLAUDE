const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const {
  FaTruckMoving, FaHandshake, FaCogs, FaExclamationTriangle,
  FaWarehouse, FaChartLine, FaClipboardCheck, FaFlagCheckered,
  FaBoxOpen, FaFileContract, FaUserTie, FaTools, FaBalanceScale,
  FaShieldAlt, FaCalendarAlt, FaArrowRight, FaWrench
} = require('react-icons/fa');

const icons = {
  truck: FaTruckMoving,
  handshake: FaHandshake,
  cogs: FaCogs,
  warning: FaExclamationTriangle,
  warehouse: FaWarehouse,
  chart: FaChartLine,
  clipboard: FaClipboardCheck,
  flag: FaFlagCheckered,
  box: FaBoxOpen,
  contract: FaFileContract,
  usertie: FaUserTie,
  tools: FaTools,
  balance: FaBalanceScale,
  shield: FaShieldAlt,
  calendar: FaCalendarAlt,
  arrow: FaArrowRight,
  wrench: FaWrench,
};

const outDir = path.join(__dirname, 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function run() {
  for (const [name, Icon] of Object.entries(icons)) {
    for (const [colorName, color] of Object.entries({ white: '#FFFFFF', teal: '#0C6D61', orange: '#F26800', darkgreen: '#012D2B' })) {
      const svg = ReactDOMServer.renderToStaticMarkup(
        React.createElement(Icon, { size: 256, color })
      );
      const buf = await sharp(Buffer.from(svg)).png().toBuffer();
      fs.writeFileSync(path.join(outDir, `${name}_${colorName}.png`), buf);
    }
  }
  console.log('done');
}
run();
