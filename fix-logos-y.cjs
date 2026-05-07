const fs = require('fs');
const path = require('path');
const dir = 'core/src/templates';

// Card is 350x200, logo is 60x24
// Only adjust Y axis - push towards top/bottom edge
// Top logos (y <= 20): move to y=6
// Bottom logos (y >= 150): move to y=170 (170+24=194, 6px from bottom)

const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let changed = 0;

for (const file of files) {
  const fp = path.join(dir, file);
  const spec = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const logo = spec.elements && spec.elements.find(e => e.id === 'logo');
  if (!logo) continue;

  const oy = logo.y;

  if (logo.y <= 20) {
    // Near top edge - push to 6px from top
    logo.y = 6;
  } else if (logo.y >= 150) {
    // Near bottom edge - push to 6px from bottom (200-24-6=170)
    logo.y = 170;
  }
  // Middle y positions left alone

  if (logo.y !== oy) {
    fs.writeFileSync(fp, JSON.stringify(spec, null, 2) + '\n');
    console.log(file + ': y ' + oy + ' -> ' + logo.y);
    changed++;
  }
}
console.log('\nUpdated ' + changed + ' templates (y-axis only)');
