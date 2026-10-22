# Hosting kilc.co.uk on Cloudflare Pages

kilc.co.uk is a static Astro site. It is hosted on **Cloudflare Pages** with Git integration: every push to `main` builds and publishes the site, and every pull request gets its own preview URL. The chat assistant runs as a Pages Function (`functions/api/chat.js`), so the site no longer depends on the Hetzner VPS.

## What lives where

| Piece | Where | Notes |
|---|---|---|
| Static pages (`dist/`) | Cloudflare Pages project `kilc-website` | Built by Cloudflare with `npm run build` |
| Security headers | `public/_headers` | Same headers nginx used to add |
| `/api/chat` | `functions/api/chat.js` | Same request/response as the old `chat-api/server.js`; prompts still come from `chat-api/prompt-*.js` |
| Which paths run a Function | `public/_routes.json` | Only `/api/*`; everything else is served as static files |
| Node version for builds | `.node-version` (20) | |
| Contact form | `platform.kilc.co.uk/api/contact` | Unchanged (XOS platform) |
| Analytics | `analytics.kilc.co.uk` (Umami) | Unchanged; keep its DNS record as it is |
| Email (Hostinger) | MX / SPF / DKIM / DMARC records | Unchanged; do not touch |

## One-time setup (Cloudflare dashboard)

1. **Create the project.** Workers & Pages → Create → Pages → *Connect to Git* → choose `lxbxbxb/kilc-website`. If the repo is not listed, allow the Cloudflare GitHub app access to it.
2. **Build settings.**
   - Project name: `kilc-website`
   - Production branch: `main`
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
3. **Chat assistant secrets.** In the project, go to Settings → Variables and Secrets. Add the following for both Production and Preview:
   - `OPENAI_API_KEY`, encrypted. This is required.
   - `OPENAI_BASE_URL`, if the assistant uses a non-OpenAI endpoint (e.g. Qwen / DashScope).
   - `OPENAI_MODEL` (default `qwen-turbo`).

   Use the same values as `~/kilc-website/chat-api/.env` on the VPS. If they are not to hand, use the LLM provider's dashboard. Then redeploy so the Function picks the variables up.
4. **Check the preview.** Open `https://kilc-website.pages.dev` and check:
   - home, about, contact and a Chinese page load;
   - the footer shows *KILC is a trading name of LITON LTD*;
   - the chat bubble answers.
5. **Move the domain.** In the Pages project, go to Custom domains → *Set up a custom domain* → `kilc.co.uk`. Cloudflare offers to replace the existing DNS record for `kilc.co.uk` (an A record to `157.90.116.169`) with a proxied CNAME to `kilc-website.pages.dev`. Accept. Leave every other DNS record alone, especially the MX and TXT records, and `analytics`, `platform` and `xos`.
6. **www → apex.**
   - Add `www.kilc.co.uk` as a second custom domain.
   - Then go to Rules → Redirect Rules → *Create rule*:
     - When incoming requests match: Hostname equals `www.kilc.co.uk`
     - Then: Dynamic redirect to `concat("https://kilc.co.uk", http.request.uri.path)`, status 301, preserve query string.

## After the move

- The VPS no longer serves kilc.co.uk. The `kilc-chat` pm2 process and the nginx vhost `kilc-website.conf` can be stopped once the Pages site has run cleanly for a few days.
- The GitHub secrets `HETZNER_SSH_HOST`, `HETZNER_SSH_USER` and `HETZNER_SSH_KEY` are no longer used by this repo's workflow.
- **Rollback:** point the `kilc.co.uk` DNS record back to `157.90.116.169`.

## Local testing of the Function

```bash
npm run build
printf 'OPENAI_API_KEY=...\nOPENAI_MODEL=qwen-turbo\n' > .dev.vars   # not committed
npx wrangler pages dev ./dist
```
