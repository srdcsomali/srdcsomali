// Netlify build for the SRDC website.
// Works with the pages/layout/assets at the repository ROOT (or inside src/, or in a "site" subfolder).
// It never needs src/static. Output goes to dist/.
const fs = require('fs'), path = require('path');

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable.'); process.exit(1); }
if (/service_role|sb_secret/.test(key)) { console.error('Refusing to build: use the PUBLISHABLE/anon key, never a secret key.'); process.exit(1); }

const NAV = [['home','/','Home'],['about','/about','About Us'],['services','/services','Our Services'],['expertise','/expertise','Our Expertise'],['sectors','/sectors','Sectors'],['management','/management','Management Team'],['projects','/projects','Projects'],['resources','/resources','Resources'],['opportunities','/opportunities','Opportunities'],['contact','/contact','Contact Us']];
const SV = [['humanitarian-development','Humanitarian and Development Consultancy'],['agriculture-food-security','Agriculture, Food Security and Livelihoods'],['meal','MEAL'],['research-assessments','Research, Surveys and Assessments'],['project-design-management','Project Design and Management'],['digital-data-gis','Digital Data, GIS and Information Management'],['training-capacity-building','Training and Capacity Building'],['business-institutional','Business and Institutional Consultancy']];

// ---- locate the layout, base folder, pages and static folders --------------------------------
const exists = p => fs.existsSync(p);
const isDir = p => exists(p) && fs.statSync(p).isDirectory();
const LAYOUTS = ['src/layout.html', 'layout.html'];
let BASE = ['.', 'site'].find(b => LAYOUTS.some(l => exists(path.join(b, l))));
if (BASE === undefined) {
  console.error('Cannot find layout.html (looked in ., src/, site/, site/src/). Files in repository root:\n  ' + fs.readdirSync('.').join('\n  '));
  process.exit(1);
}
const at = (...p) => path.join(BASE, ...p);
const layoutFile = LAYOUTS.map(l => at(l)).find(exists);
const HEADER = /^<!--\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\w*)\s*-->\s*/;

// page files: any .html with the "<!-- title | description | nav -->" first line, in pages/ folders or the base folder
const pageDirs = [at('src', 'pages'), at('pages'), BASE].filter(isDir);
const pages = new Map();
for (const d of new Set(pageDirs)) {
  for (const f of fs.readdirSync(d)) {
    if (!f.endsWith('.html') || path.join(d, f) === layoutFile) continue;
    const t = fs.readFileSync(path.join(d, f), 'utf8');
    if (HEADER.test(t) && !pages.has(f)) pages.set(f, t);
  }
}
if (!pages.size) { console.error('No page files found (pages start with a "<!-- title | description | nav -->" line).'); process.exit(1); }

// ---- assemble dist/ ------------------------------------------------------------------------
fs.rmSync('dist', { recursive: true, force: true }); fs.mkdirSync('dist');

// 1) web assets found in the base folder (css/, js/, images, logo, admin.html, robots.txt ...); never source/config files
const ALLOWED = new Set(['.css', '.js', '.html', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.txt', '.xml', '.json', '.pdf', '.woff', '.woff2', '.webmanifest']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.github', 'migrations', 'src', 'pages', 'static', 'public', 'site']);
const SKIP_FILES = new Set(['build.js', 'netlify.toml', 'package.json', 'package-lock.json', 'config.js', 'layout.html', 'README.md']);
(function walk(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name), out = path.join('dist', rel, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name) && !e.name.startsWith('.')) walk(full, path.join(rel, e.name)); continue; }
    if (SKIP_FILES.has(e.name) || e.name.startsWith('.') || !ALLOWED.has(path.extname(e.name).toLowerCase())) continue;
    if (e.name.endsWith('.html') && pages.has(e.name) && rel === '') continue;   // built pages are generated below
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.copyFileSync(full, out);
  }
})(BASE, '');

// 2) optional static folders (src/static, static, public) override anything copied above
for (const s of [at('src', 'static'), at('static'), at('public')]) if (isDir(s)) fs.cpSync(s, 'dist', { recursive: true });

// 2b) normalise asset locations: pages link to /css/style.css, /js/common.js and /logo.png,
//     so if the repository keeps these files elsewhere (e.g. style.css and common.js in the root) copy them there
function findInDist(test) { let hit = null; (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (hit) return; const p = path.join(d, e.name); if (e.isDirectory()) w(p); else if (test(e.name)) hit = p; } })('dist'); return hit; }
function ensure(dest, test, label) {
  const d = path.join('dist', dest);
  if (exists(d)) return;
  const src = findInDist(test);
  if (src) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(src, d); console.log(`Placed ${label} (${path.relative('dist', src)}) at dist/${dest}`); }
}
ensure('css/style.css', n => n === 'style.css', 'style.css');
ensure('js/common.js', n => n === 'common.js', 'common.js');
ensure('logo.png', n => n === 'logo.png', 'logo');
ensure('logo.png', n => /logo.*\.(png|jpe?g|webp)$/i.test(n), 'logo (alternative file name)');

// 3) pages from the layout
const layout = fs.readFileSync(layoutFile, 'utf8');
const fnav = NAV.map(([, h, l]) => `<a href="${h}">${l}</a>`).join('');
const fsvc = SV.map(([s, t]) => `<a href="/services/${s}">${t}</a>`).join('');
const urls = [];
for (const [f, t] of pages) {
  const m = t.match(HEADER);
  const [body, js = ''] = t.slice(m[0].length).split('<!--JS-->');
  const nav = NAV.map(([k, h, l]) => `<a href="${h}"${k === m[3] ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('');
  const out = layout.replace(/{{TITLE}}/g, () => m[1]).replace(/{{DESC}}/g, () => m[2]).replace('{{NAV}}', () => nav).replace('{{FNAV}}', () => fnav).replace('{{FSVC}}', () => fsvc).replace('{{BODY}}', () => body).replace('{{JS}}', () => js);
  fs.writeFileSync('dist/' + f, out);
  if (!['404.html', 'service.html'].includes(f)) urls.push(f === 'index.html' ? '/' : '/' + f.replace('.html', ''));
}
SV.forEach(([s]) => urls.push('/services/' + s));
fs.writeFileSync('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(u => `<url><loc>https://www.srdcsomali.com${u}</loc></url>`).join('') + '</urlset>\n');

// 4) config.js from Netlify environment variables (never committed)
fs.writeFileSync('dist/config.js', 'window.SRDC_CONFIG=' + JSON.stringify({ url, key }) + ';');

// 5) sanity check: required files must exist
const need = ['index.html', 'admin.html', 'service.html', 'css/style.css', 'js/common.js', 'logo.png', 'config.js'];
const missing = need.filter(f => !exists(path.join('dist', f)));
if (missing.length) { console.error('Build incomplete. Missing in dist/: ' + missing.join(', ') + '\nUpload the missing files to the repository.'); process.exit(1); }
console.log(`Built ${pages.size} pages (layout: ${layoutFile}, base: ${BASE}) for ${url}`);
