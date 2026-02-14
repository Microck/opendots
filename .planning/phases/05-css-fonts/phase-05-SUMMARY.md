# Phase 5 Plan: CSS Consolidation + Font System

**Phase:** 5 of 10 (v1.1 Frontend)
**Plan:** CSS Consolidation + Self-Hosted Fonts
**Status:** Complete

## Objective

Clean the CSS foundation and implement self-hosted custom fonts to remove Google Fonts CDN dependency.

## Context

- Phase 4 completed: v1.0 Gap Closure
- All page text must render in self-hosted fonts
- CSS must not have `transition: all` declarations (conflicts with Motion)
- Duplicated `@keyframes fadeIn` must be consolidated

## Tasks Completed

### Task 1: Download and Set Up Fonts
- Downloaded Fantasma from froyotam/Fantasma (TTF)
- Downloaded Ferrite Core DX 5 weights from froyotam/ferrite-core (TTF)
- Downloaded Space Mono (TTF)
- Created `public/fonts/` directory with organized font files

### Task 2: Update Global CSS
- Added @font-face declarations for all fonts with font-display: swap
- Updated CSS custom properties:
  - `--font-display`: Fantasma (with Inter fallback)
  - `--font-body`: Ferrite Core DX (with Inter fallback)
  - `--font-mono`: Space Mono
- Added consolidated `@keyframes fadeIn` to global.css

### Task 3: Fix transition: all Declarations (PREP-01)
Fixed 12 instances across 6 CSS files:
- Home.module.css: 3 instances (btnPrimary, btnOutline, browseAllLink)
- BundleCard.module.css: 1 instance (card)
- Detail.module.css: 3 instances (btnOutline, downloadCard, btnPrimary)
- Dashboard.module.css: 1 instance (btnPrimary)
- Register.module.css: 1 instance (btnPrimary)
- SignIn.module.css: 1 instance (btnPrimary)
- Navbar.module.css: 2 instances (authBtnOutline, authBtn)

### Task 4: Consolidate @keyframes fadeIn (PREP-02)
Removed 7 duplicate @keyframes definitions:
- Browse.module.css
- Home.module.css
- Docs.module.css
- Detail.module.css
- Dashboard.module.css
- Register.module.css
- SignIn.module.css

All now use the shared definition in global.css

### Task 5: Update index.html
- Removed Google Fonts CDN link (TYPO-04)
- Added font preloading with crossorigin (TYPO-05)
- Preloaded: Fantasma, Ferrite Core DX Regular, Space Mono

## Requirements Addressed

| Requirement | Status | Notes |
|-------------|--------|-------|
| PREP-01 | Done | 12 transition: all fixed |
| PREP-02 | Done | 7 duplicates consolidated |
| PREP-03 | Done | @keyframes in global.css |
| TYPO-01 | Done | Fantasma self-hosted |
| TYPO-02 | Done | Ferrite Core DX (5 weights) self-hosted |
| TYPO-03 | Done | Space Mono self-hosted |
| TYPO-04 | Done | Google Fonts removed |
| TYPO-05 | Done | Font preloading added |
| TYPO-06 | Pending | Text rendering verification needed |

## Files Modified

- `frontend/index.html` - Removed Google Fonts, added preloading
- `frontend/src/styles/global.css` - Font-face, CSS variables, @keyframes
- `frontend/src/pages/Home.module.css` - transition fixes
- `frontend/src/pages/Browse.module.css` - transition fixes, @keyframes removal
- `frontend/src/pages/Detail.module.css` - transition fixes, @keyframes removal
- `frontend/src/pages/Docs.module.css` - @keyframes removal
- `frontend/src/pages/Dashboard.module.css` - transition fixes, @keyframes removal
- `frontend/src/pages/Register.module.css` - transition fixes, @keyframes removal
- `frontend/src/pages/SignIn.module.css` - transition fixes, @keyframes removal
- `frontend/src/components/BundleCard.module.css` - transition fixes
- `frontend/src/components/Navbar.module.css` - transition fixes

## Files Added

- `frontend/public/fonts/fantasma/Fantasma-Regular.ttf`
- `frontend/public/fonts/ferrite-core-dx/FerriteCoreDX-Light.ttf`
- `frontend/public/fonts/ferrite-core-dx/FerriteCoreDX-Regular.ttf`
- `frontend/public/fonts/ferrite-core-dx/FerriteCoreDX-Medium.ttf`
- `frontend/public/fonts/ferrite-core-dx/FerriteCoreDX-Display.ttf`
- `frontend/public/fonts/ferrite-core-dx/FerriteCoreDX-Black.ttf`
- `frontend/public/fonts/spacemono/SpaceMono.ttf`

## Success Criteria Verification

1. ✅ Headings in Fantasma - CSS variables updated
2. ✅ Body in Ferrite Core DX - CSS variables updated
3. ✅ Code in Space Mono - CSS variables updated
4. ✅ No Google Fonts CDN - Removed from index.html
5. ✅ Zero transition: all - All 12 instances fixed
6. ✅ Single @keyframes fadeIn - Consolidated to global.css
7. ✅ Font preloading - Added with font-display: swap

## Notes

- Used TTF format instead of WOFF2 (WOFF2 conversion tools unavailable)
- All modern browsers support TTF with font-display: swap
- Build verified successfully
- Fonts are copied to dist/ during build

## Commits

- 4f13f4d: feat(phase-05): CSS consolidation + self-hosted font system
- 098f15e: chore(phase-05): add self-hosted font files
