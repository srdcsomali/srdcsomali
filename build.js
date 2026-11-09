// Netlify build: assembles pages from src/, copies static files, writes config.js from environment variables.
const fs = require('fs');
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable.'); process.exit(1); }
if (/service_role|sb_secret/.test(key)) { console.error('Refusing to build: use the PUBLISHABLE/anon key, never a secret key.'); process.exit(1); }
const NAV = [['home','/','Home'],['about','/about','About Us'],['services','/services','Our Services'],['expertise','/expertise','Our Expertise'],['sectors','/sectors','Sectors'],['management','/management','Management Team'],['projects','/projects','Projects'],['resources','/resources','Resources'],['opportunities','/opportunities','Opportunities'],['contact','/contact','Contact Us']];
const SV = [['humanitarian-development','Humanitarian and Development Consultancy'],['agriculture-food-security','Agriculture, Food Security and Livelihoods'],['meal','MEAL'],['research-assessments','Research, Surveys and Assessments'],['project-design-management','Project Design and Management'],['digital-data-gis','Digital Data, GIS and Information Management'],['training-capacity-building','Training and Capacity Building'],['business-institutional','Business and Institutional Consultancy']];
fs.rmSync('dist', { recursive: true, force: true }); fs.mkdirSync('dist');
fs.cpSync('src/static', 'dist', { recursive: true });
const layout = fs.readFileSync('src/layout.html', 'utf8');
const fnav = NAV.map(([, h, l]) => `<a href="${h}">${l}</a>`).join('');
const fsvc = SV.map(([s, t]) => `<a href="/services/${s}">${t}</a>`).join('');
const urls = [];
for (const f of fs.readdirSync('src/pages')) {
  const t = fs.readFileSync('src/pages/' + f, 'utf8');
  const m = t.match(/^<!--\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\w*)\s*-->\s*/);
  if (!m) throw new Error('Missing header comment in ' + f);
  const [body, js = ''] = t.slice(m[0].length).split('<!--JS-->');
  const nav = NAV.map(([k, h, l]) => `<a href="${h}"${k === m[3] ? ' class="on" aria-current="page"' : ''}>${l}</a>`).join('');
  const out = layout.replace(/{{TITLE}}/g, () => m[1]).replace(/{{DESC}}/g, () => m[2]).replace('{{NAV}}', () => nav).replace('{{FNAV}}', () => fnav).replace('{{FSVC}}', () => fsvc).replace('{{BODY}}', () => body).replace('{{JS}}', () => js);
  fs.writeFileSync('dist/' + f, out);
  if (!['404.html', 'service.html'].includes(f)) urls.push(f === 'index.html' ? '/' : '/' + f.replace('.html', ''));
}
SV.forEach(([s]) => urls.push('/services/' + s));
fs.writeFileSync('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(u => `<url><loc>https://www.srdcsomali.com${u}</loc></url>`).join('') + '</urlset>\n');
fs.writeFileSync('dist/config.js', 'window.SRDC_CONFIG=' + JSON.stringify({ url, key }) + ';');
console.log('Built', urls.length, 'pages for', url);
