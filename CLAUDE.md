# CLAUDE.md — Developer Instructions for Claude Code

## Project Overview

**KILC Website** is a live Astro 5 static site (kilc.co.uk) with 45 pages, TypeScript, Tailwind CSS, and English + Chinese i18n.

- **Framework**: Astro 5 (static generation)
- **Styling**: Tailwind CSS 3.4.19 with custom brand tokens
- **i18n**: English (default `/en/*`) and Chinese (`/zh/*`) with alternate slugs
- **Analytics**: Umami (analytics.kilc.co.uk, consent-gated via CookieBanner.astro)
- **Chat API**: Node.js server (`chat-api/`) with LLM-powered assistant, deployed via pm2 on VPS
- **Status**: Production live

## Key Architecture

### Brand Colors (Tailwind Tokens)

Located in `tailwind.config.mjs` under `theme.extend.colors.brand`:

```
primary:   #C5A059 (gold/bronze)
secondary: #A8854A (deeper bronze)
dark:      #1C1A17 (near-black)
accent:    #C5A059 (gold/bronze)
light:     #F8F6F2 (warm off-white)
text:      #1C1A17 (body)
footer:    #E5E7EB (light slate gray)
```

Changes require testing all 45 pages locally before committing.

### i18n System

- **Files**: `src/i18n/en.json`, `src/i18n/zh.json`, `src/i18n/utils.ts`
- **Function**: `t(locale, 'key.path')` for nested translation lookup
- **Alternate Slugs**: ZH pages may have different URLs (e.g., `/global-market-navigation` → `/zh/global-market-strategy`)
- **Mapping**: See `zhSlugMap` and `enSlugMap` in `src/i18n/utils.ts`. Only pages whose ZH slug differs from the EN slug need entries — pages with identical slugs use the default fallback (`/zh` + EN path).
- **SEO**: Hreflang links in BaseLayout.astro via `getAlternateUrl()` which normalizes trailing slashes before slug map lookup

### Core Layouts & Components

- **BaseLayout.astro**: Master layout with hreflang tags, full SEO head (OG, Twitter Cards, JSON-LD, RSS discovery), and CookieBanner. Props: `title`, `description`, `ogImage`, `ogType` (`'website'|'article'`), `articleMeta` (blog posts), `jsonLd` (page-specific structured data)
- **Global Styles**: `src/styles/global.css` (Tailwind directives + custom utilities)
- **Font**: `system-ui` primary, `Noto Sans SC` for Chinese glyphs (self-hosted woff2 in `/fonts/`)
- **ChatWidget.astro**: Floating chat bubble on all pages; sends multi-turn conversation history to `/api/chat`; renders markdown links `[text](/url)` as clickable `<a>` tags (DOM-based, XSS-safe, internal-only URL regex). Links display in brand gold (`#C5A059`) via inline style (Tailwind-purge-safe). Malformed LLM artifacts like `[](/)` and `[text]()` are stripped before rendering.
- **CookieBanner.astro**: GDPR cookie consent banner; gates Umami analytics behind user consent (`localStorage` key `kilc_cookie_consent_v1`). Footer "Cookie Settings" button re-shows the banner via `kilc:reset-consent` CustomEvent

### Chat API (`chat-api/`)

An LLM-powered assistant (now served by the Pages Function `functions/api/chat.js`; `chat-api/server.js` is the former VPS version) for KILC services guidance. The system prompt positions KILC as an international legal consultancy (London, Dubai, KL) with 7 service areas + Guardian Shield programme. CTA is conditional (only when the user has a specific professional need), not forced on every response.

- **Files**: `chat-api/server.js` (HTTP server), `chat-api/prompt.js` (system prompts EN/ZH)
- **Endpoint**: `POST /api/chat` — accepts `{ messages: [{role, content}...], locale }` (multi-turn) or legacy `{ message: "...", locale }` (single-turn)
- **LLM**: OpenAI-compatible API (configured via env vars on VPS; default model: `qwen-turbo`)
- **Rate limit**: 20 requests/IP/minute (in-memory)
- **Validation**: Max 10 messages, each max 500 chars, roles must be `user` or `assistant`
- **Env vars** (Cloudflare Pages project settings; previously `~/kilc-website/chat-api/.env` on the VPS):
  - `OPENAI_API_KEY` — Required
  - `OPENAI_BASE_URL` — Custom endpoint (optional)
  - `OPENAI_MODEL` — Model name (default: `qwen-turbo`)

## Development Workflow

### Before Coding

Always run type generation before TypeScript checks:

```bash
npx astro sync    # Generate .astro/ types
npx tsc --noEmit  # Type check (must succeed before commit)
```

### Code Changes

1. **Pages**: Add `.astro` files to `src/pages/` — Astro auto-routes by filename
2. **Components**: Extract reusable Astro components to `src/components/`
3. **Styling**: Use Tailwind classes; add custom utilities to `global.css` if needed
4. **i18n**: Add translation keys to `en.json` and `zh.json`

### Before Commit

```bash
npm run build          # Full production build (validates all pages)
npx astro sync && npx tsc --noEmit  # Type safety
git status            # Verify expected changes
```

**Never commit** if `npm run build` or `tsc` fail.

## What NOT to Touch

### Sacred Files (Design/DNS/Secrets)

- `tailwind.config.mjs` — Brand colors are production-locked; contact design team if changes needed
- `.github/workflows/deploy.yml` — Build check; any changes require review
- Cloudflare DNS records (DKIM, SPF, DMARC) — Maintained externally; will break email
- `src/components/CookieBanner.astro` — Umami Website ID and consent logic; changes affect analytics tracking

### Hostinger Email

- MX records unchanged on Cloudflare
- Do not modify email forwarding rules
- DKIM/SPF/DMARC records managed via Cloudflare — breaking these breaks email

## Deployment Details

kilc.co.uk is hosted on **Cloudflare Pages** (project `kilc-website`, Git integration). Full setup and rollback steps: `docs/CLOUDFLARE_PAGES.md`.

- **Production**: every push to `main` is built by Cloudflare (`npm run build`, output `dist`, Node from `.node-version`) and published to kilc.co.uk
- **Previews**: every pull request gets a `*.kilc-website.pages.dev` preview URL
- **GitHub Actions** (`.github/workflows/deploy.yml`): build and type-check only (`astro sync` → `tsc --noEmit` → `npm run build`); it no longer deploys
- **Chat API**: `functions/api/chat.js` (Pages Function, `/api/chat`). Secrets `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` are set in the Pages project settings. Prompts stay in `chat-api/prompt-en.js` / `prompt-zh.js`
- **Headers / routing**: `public/_headers` (security headers, asset caching); `public/_routes.json` limits Functions to `/api/*`
- **www → apex**: Cloudflare Redirect Rule (see the doc)

The former Hetzner VPS setup (`nginx/kilc-website.conf`, `chat-api/server.js`, pm2) is kept only for rollback.

## i18n Guidelines

### Adding a New Translation

1. Add key to both `en.json` and `zh.json` (same structure)
2. Use in component: `t(locale, 'section.key')`
3. For alternate ZH slug, update `zhSlugMap` in `utils.ts`
4. Verify hreflang links work in browser devtools

### Alternate Slug Example

```typescript
// Only pages where ZH slug differs from EN slug need entries
const zhSlugMap: Record<string, string> = {
  "/global-market-navigation": "/zh/global-market-strategy",
  "/immigration": "/zh/immigration-advisory",
  "/criminal": "/zh/criminal-defence",
  "/estate-investment": "/zh/real-estate-investment-protection",
  "/contact": "/zh/contact-us",
};
```

- EN page at `/page-name` maps to ZH at `/zh/page-slug-in-chinese`
- Pages with identical slugs (e.g., `/programme` → `/zh/programme`) do NOT need entries — the default fallback handles them
- `getAlternateUrl()` normalizes trailing slashes before lookup

## Common Tasks

### Add a Blog Post

Blog posts live in `src/content/blog/en/` as `.md` files. Required frontmatter:

```yaml
---
title: "Post title"
slug: "custom-url-name"      # optional — defaults to filename
date: "2026-01-01"
author: "Author name"        # optional
coverImage: "/images/..."    # optional
tags: ["Tag One", "Tag Two"] # optional
excerpt: "Card summary (1–2 sentences)."
featured: false              # true = pinned to top of /blogs
---
```

- EN: `src/content/blog/en/` → `/blogs` (CMS: **Blog Posts (English)**)
- ZH: `src/content/blog/zh/` → `/zh/blogs` (CMS: **Blog Posts (Chinese)**)
- Posts per locale are independent — no need to mirror across languages
- EN posts are auto-included in the RSS feed at `/rss.xml` (sorted newest-first)
- Blog detail pages automatically get `og:type=article`, `article:*` meta, and BlogPosting JSON-LD — no extra work needed beyond frontmatter

### Add a New Page

```bash
# Create EN page
touch src/pages/new-page.astro

# Add translations
# → Edit src/i18n/en.json and src/i18n/zh.json

# Add to nav/menus in components (e.g., Header.astro)

# Test locally
npm run dev

# Build & deploy
npm run build
git add . && git commit -m "feat: add new-page" && git push
```

### Update Analytics

Umami is consent-gated via `src/components/CookieBanner.astro`. The script is dynamically injected only after the user accepts analytics cookies. **Do not modify Website ID** (c3272e3b-c8cc-4770-9fa0-55f10d8a162c) unless instructed. To force all users to re-consent (e.g. after a cookie policy change), bump the version suffix in `CONSENT_KEY` (e.g. `_v1` → `_v2`).

### Adjust Brand Colors

Edit `tailwind.config.mjs` under `theme.extend.colors.brand`. Rebuild and test all 45 pages locally before committing.

## Troubleshooting

### Build Fails

```bash
npx astro sync  # Regenerate types
npm run build   # Try again
```

### Type Errors

```bash
npx tsc --noEmit  # Detailed error messages
```

### i18n Links Broken

Check `src/i18n/utils.ts`:
- Does `getLocaleFromUrl()` detect locale correctly?
- Does `getAlternateUrl()` map alternate slugs?
- Are hreflang links in BaseLayout.astro pointing to correct paths?

### Email Not Sending

Do not modify Cloudflare DNS. Contact email provider (Hostinger) if MX records need updating.

## Related Documentation

- See `README.md` for quick-start and setup
- Astro docs: https://docs.astro.build
- Tailwind docs: https://tailwindcss.com
- Chat API (`chat-api/`) is a standalone Node.js server deployed alongside the static site

## Contacts & Handoff

- Production domain: kilc.co.uk (Cloudflare)
- Analytics: https://analytics.kilc.co.uk (Umami)
- Hosting: Cloudflare Pages (`kilc-website`); former VPS host Hetzner (157.90.116.169) kept for rollback
- Email: Hostinger (MX records on Cloudflare)
- Deploy key: ~/.ssh/kilc_hetzner (local development only)

---

**Last Updated**: March 5, 2026 (Chat prompt rewrite: international positioning, conditional CTA, 7 services + Guardian Shield; ChatWidget: gold link color, malformed markdown stripping, hardened URL regex; Hreflang fix: BaseLayout uses getAlternateUrl() with trailing-slash normalization; Dead code cleanup: removed 6 unused fonts, 17 unused images, stale CMS policy collections, redundant slug map entries)
