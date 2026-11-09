// Netlify build: copies the site to dist/ and writes config.js from environment variables.
const fs = require('fs');
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable.'); process.exit(1); }
if (/service_role|sb_secret/.test(key)) { console.error('Refusing to build: use the PUBLISHABLE/anon key, never a secret key.'); process.exit(1); }
fs.rmSync('dist', { recursive: true, force: true }); fs.mkdirSync('dist');
for (const f of ['index.html','admin.html','logo.png','robots.txt','sitemap.xml']) fs.copyFileSync(f, 'dist/' + f);
fs.writeFileSync('dist/config.js', 'window.SRDC_CONFIG=' + JSON.stringify({ url, key }) + ';');
console.log('Built dist/ for', url);
