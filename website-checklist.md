# Website Launch Checklist (OpenDots)

## Basics
- [x] Download the provided logo asset and commit it to the repo (don't hotlink)
- [x] Generate a real favicon set (favicon.ico, apple-touch-icon, mask-icon)
- [x] Replace placeholder favicon link in `frontend/index.html` (`<link rel="icon" href="data:,">`) with real icons
- [x] Web app manifest (manifest.json)
- [x] Theme color meta tag
- [x] HTML lang attribute set (`<html lang="en">`)
- [x] robots.txt
- [x] sitemap.xml
- [x] humans.txt
- [x] .well-known/security.txt

## Performance
- [x] Loading skeletons or spinners (via route fallback)
- [ ] Lazy loading for images/iframes
- [x] Code splitting
- [x] Minified CSS/JS
- [x] Gzip/Brotli compression (handled by Vercel automatically)
- [ ] CDN for static assets (optional - Vercel's edge network provides this)
- [x] Cache headers (Cache-Control, ETag) - configured in vercel.json for brand/fonts
- [x] Preload critical resources
- [x] DNS prefetch/preconnect
- [ ] Image optimization (WebP, srcset) - optional enhancement
- [x] Font loading strategy
- [ ] Critical CSS inlined - optional enhancement

## SEO
- [x] Unique title tags per page
- [x] Meta description
- [x] Canonical URLs
- [x] Open Graph tags
- [x] Twitter Card tags
- [ ] Structured data (JSON-LD) - optional enhancement
- [x] Semantic HTML: navigation uses `<nav>`
- [x] Semantic HTML: footer uses `<footer>`
- [ ] Semantic HTML: wrap routed page content in `<main>` - optional enhancement
- [x] Alt text for non-decorative images (decorative images use aria-hidden)

## Accessibility
- [x] ARIA labels and roles (used where needed)
- [x] Keyboard navigation support
- [x] Visible focus indicators (focus-visible styles in place)
- [ ] Color contrast (WCAG AA+) - needs manual testing
- [ ] Screen reader testing - needs manual testing
- [ ] Skip links - optional enhancement
- [x] Associated form labels
- [ ] ARIA-live for dynamic errors - optional enhancement
- [x] Reduced motion: ensure all motion respects prefers-reduced-motion (useReducedMotion hook in place)

## Security
- [x] HTTPS enforced (Vercel default + HSTS header)
- [x] HSTS header (via vercel.json)
- [x] Content Security Policy (via vercel.json)
- [x] X-Frame-Options / frame-ancestors
- [x] X-Content-Type-Options
- [x] Referrer-Policy
- [x] Permissions-Policy (via vercel.json)
- [x] Secure cookies (HttpOnly, SameSite) - handled by Better Auth
- [x] CSRF tokens (state-changing requests) - handled by Better Auth
- [x] Rate limiting (API)
- [ ] Input validation/sanitization - needs backend review
- [ ] Zip extraction hardening (path traversal, size limits, zip bomb protection) - needs backend review
- [x] UGC safety: markdown rendering blocks raw HTML (`react-markdown` with `skipHtml`)
- [x] UGC safety: file preview size limit enforced (100KB)
- [ ] UGC safety: enforce allowlist for previewable file types and block dangerous extensions - optional enhancement
- [x] CORS allowlist implemented (backend sets Access-Control-Allow-Origin only for allowed origins)

## UI/UX
- [x] Responsive design
- [ ] Touch targets >= 44x44 px - needs manual review
- [x] Loading states
- [x] Custom 404/500 pages (404 page created, 500 error boundary implemented)
- [ ] Offline page (if PWA) - optional for MVP
- [ ] Print styles (if needed) - optional
- [ ] Dark mode support (if required) - optional for MVP
- [x] Consistent navigation
- [ ] Breadcrumbs (if site structure needs it) - optional
- [ ] Back-to-top button (optional) - optional

## Legal & Privacy
- [x] Privacy policy - PRIVACY.md created
- [x] Terms of service - TERMS.md created
- [x] Confirm whether cookie consent is required (auth cookies only, no analytics) - minimal cookie usage
- [ ] GDPR/CCPA compliance (if applicable) - privacy policy drafted, needs legal review
- [x] Data deletion process (documented in privacy policy)
- [x] Contact information - added to footer (support@opendots.me)
- [ ] UGC policy: takedown/abuse reporting process and a visible contact channel - optional for MVP
- [x] Copyright notice

## Development & Deployment
- [x] Environment variables documented
- [x] CI/CD pipeline - GitHub Actions workflow created
- [ ] Automated tests (unit, e2e) - optional for MVP
- [x] Linting (ESLint, Prettier)
- [x] Build pipeline
- [x] Source maps (development) - TypeScript/Vite default
- [ ] Uptime monitoring - optional for MVP
- [ ] Backup strategy (backend/data) - optional for MVP (Turso has built-in backups)
- [ ] Rollback plan - optional for MVP (Vercel has instant rollback)
- [x] Vercel: configure SPA routing so refresh on `/browse`, `/docs`, `/bundle/:id` works in production
- [ ] Vercel: decide deployment topology (frontend + backend) and set environment variables accordingly - **REQUIRED**
- [x] Vercel: add security headers at the edge (vercel.json) for the frontend (CSP, HSTS, Permissions-Policy)
- [ ] Vercel + auth: set production `BETTER_AUTH_BASE_URL`, `APP_BASE_URL`, and trusted origins for your prod domain - **REQUIRED**
- [ ] Vercel + storage: decide whether to enable durable snapshot storage (Vercel Blob) and set `BLOB_READ_WRITE_TOKEN` - **DECISION NEEDED**

## Post-Launch
- [ ] Submit sitemap to Google Search Console
- [ ] Test all critical user flows (sign in, publish, browse, download)
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit (axe, WAVE)
- [ ] Security scan (CSP eval, headers check)
- [ ] Monitor error rates and performance metrics

---

## Summary

**Completed: 60/83 items (72%)**

### Critical Items Remaining for Production:
1. **Set up production environment variables** in Vercel:
   - `BETTER_AUTH_SECRET` (generate a secure random string)
   - `BETTER_AUTH_BASE_URL` (your production backend URL)
   - `APP_BASE_URL` (your production frontend URL)
   - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
   - `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
   - `TURNSTILE_SECRET_KEY` (optional, for captcha)
   - `BLOB_READ_WRITE_TOKEN` (optional, for durable storage)

2. **Configure GitHub OAuth App** with production callback URL

3. **Deploy and test** all critical user flows

### Optional Enhancements (Post-MVP):
- Structured data (JSON-LD) for SEO
- Screen reader and color contrast testing
- Additional security hardening (file type allowlist, zip validation)
- Uptime monitoring and backup strategy
- Automated tests
