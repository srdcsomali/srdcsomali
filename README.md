SRDC website: deployment guide (GitHub + Netlify + Supabase)
Files: index.html (public site), admin.html (dashboard), logo.png, build.js, netlify.toml, robots.txt, sitemap.xml.
No secrets are stored in these files. Netlify writes config.js at build time from two environment variables.
1. Upload to GitHub
Open your empty repository on github.com > "uploading an existing file".
Drag in ALL files from this folder (not the folder itself, not config.js or dist). Commit to the main branch.
2. Deploy on Netlify
Netlify > Add new site > Import an existing project > GitHub > choose the repository.
Build settings are read from netlify.toml (command: node build.js, publish: dist). Leave them.
Before deploying: Site configuration > Environment variables > add
SUPABASE_URL = https://YOUR-PROJECT-REF.supabase.co (Supabase > Project Settings > API)
SUPABASE_ANON_KEY = your publishable key (starts with sb_publishable_). NEVER the secret/service_role key; the build refuses it.
Both values are public by design (they ship to every visitor's browser; Row Level Security protects the data). Leave "Contains secret values" UNTICKED for SUPABASE_URL and SUPABASE_ANON_KEY. If you do mark them secret, Netlify's scanner will find them in the generated dist/config.js and fail the build; in that case add SECRETS_SCAN_OMIT_PATHS = dist/config.js (this skips only that one generated file; scanning stays on for everything else). Never put real values in README.md or any committed file.
Deploy. You get a free https://<name>.netlify.app address. Admin login: https://<name>.netlify.app/admin.html
3. Supabase settings (dashboard, one time)
Authentication > Sign In / Providers: turn OFF "Allow new users to sign up".
Authentication > URL Configuration: Site URL = your Netlify address (later https://www.srdcsomali.com); add Redirect URLs: <your address>/admin.html (for password reset).
Add admins: Authentication > Users > Add user (tick Auto Confirm), then set their role in the dashboard > Administrators.
Supabase's built-in email is heavily rate-limited; for reliable reset emails add a custom SMTP provider later.
4. Test checklist (after deploying)
Open /admin.html, sign in as srdcsomali@gmail.com. Wrong password must show "Invalid email or password."
Services: edit a service, set to draft: it must disappear from the public site after a refresh; set to published: it returns.
Add a news item and a publication with a PDF upload, publish; confirm they appear under Resources and the PDF downloads.
Add a project and an opportunity; confirm filters, closing date and Apply button.
Send the contact form from the public site; it must appear in Admin > Inquiries. Subscribe to the newsletter; it must appear in Subscribers.
Media: upload to internal-docs, use Open (signed link, 5 minutes). Visitors must not be able to open internal-docs files.
Create a test editor and viewer (Add user), set roles, and confirm: editor cannot delete or see Administrators; viewer cannot see Inquiries or edit.
5. Connect srdcsomali.com (after testing)
Netlify > Domain management > Add custom domain > srdcsomali.com. At Hostinger DNS add the records Netlify shows (usually an A record for the root and a CNAME for www). HTTPS is automatic. Then update the Supabase Site URL.
6. Backups
Free Supabase projects have no automatic backups. Regularly export: Supabase > Database > Backups / or SQL Editor > export tables; and download files from Storage. Keep copies of srdc_schema.sql and this repository.
Known limits
Inquiry email notifications, anti-spam beyond the hidden field and database limits (e.g. Cloudflare Turnstile), in-dashboard admin invitations, SEO settings module, locations module and individual service pages are not included yet.
