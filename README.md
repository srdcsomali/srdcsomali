# SRDC website: repository and deployment guide (GitHub + Netlify + Supabase)

## Repository layout
- `src/layout.html`: shared header (navigation), footer, floating WhatsApp button.
- `src/pages/*.html`: one file per page (home, about, services, service, expertise, sectors, management, projects, resources, opportunities, contact, 404).
- `src/static/`: `css/style.css`, `js/common.js`, `admin.html` (dashboard), `logo.png`, `robots.txt`.
- `build.js`: assembles the pages into `dist/`, writes `config.js` from environment variables, generates `sitemap.xml`.
- `netlify.toml`: build settings, redirects (`/services/<name>` and `/admin`), security headers.
- `srdc_schema.sql` and `migrations/`: database setup (already applied to your Supabase project; kept for backup and reference).

No real URL, key or password is stored in any file. Netlify writes `config.js` at build time from `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Deploy
1. On GitHub, delete the OLD root files `index.html`, `admin.html`, `logo.png`, `robots.txt` (and `sitemap.xml` if present), then upload this whole folder structure (the `src` folder, `build.js`, `netlify.toml`, `README.md`, `.gitignore`, `srdc_schema.sql`, `migrations`). Commit to the main branch.
2. Netlify keeps the existing settings (build command `node build.js`, publish directory `dist`) and the existing environment variables. Do not change them. Both variables stay UNTICKED for "Contains secret values" (or use `SECRETS_SCAN_OMIT_PATHS = dist/config.js`).
3. Trigger deploy > "Clear cache and deploy site".

## Supabase settings (dashboard)
- Authentication > Sign In / Providers: "Allow new users to sign up" OFF.
- Authentication > URL Configuration: Site URL = your live address. Redirect URLs must include `<address>/admin` and `<address>/admin.html` (password reset returns there).
- Super administrator: srdcsomali@gmail.com has the `super_admin` role. To reset the password: sign-in page > "Forgot password", or Supabase > Authentication > Users > the user > "Send password recovery". Never put passwords in files.

## After deploying: checklist
1. Open each menu page; the active page is highlighted; mobile Menu works.
2. /services: open each of the 8 services; the Inquire button pre-fills the contact form.
3. /admin: sign in; add a management profile (photo, position, department, biography, areas of responsibility); use Preview; set Published and Active, tick "Management team member"; Save. It must appear on /management and the home page. Switch to Draft or untick Active: it must disappear.
4. Departments and Sectors: rename or add one; Settings: change the WhatsApp number and confirm the floating button and Contact page use it.
5. Send the contact form; see it under Inquiries.
6. Test with an editor and a viewer account (Supabase > Authentication > Users > Add user, then set the role in Administrators).

## Notes
- Staff profiles are public only when status = published AND active AND (management OR directory). Today only "management" is used. For a future full directory, tick "Include in the full staff directory" on profiles and add a directory page; nobody else is shown publicly until then.
- Service pages for new services added in the dashboard work automatically; the footer links and sitemap list the original eight until the next code update.
- Photos: JPG, PNG or WebP, max 3 MB, stored in the `site-media` bucket under `staff/`.
- Not included: inquiry email notifications, stronger anti-spam (e.g. Cloudflare Turnstile), in-dashboard admin invitations, SEO and locations modules, a public staff directory page, real photography.
