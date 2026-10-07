# rmngl.github.com

Company site for **RMNGL** (Remingle). Vite + TypeScript static build, deployed to GitHub Pages.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Pushes to `main` run [.github/workflows/deploy.yml](.github/workflows/deploy.yml). Enable **GitHub Pages** in the repo settings with source **GitHub Actions** (not “Deploy from a branch” on `/`).

### Custom domain (`rmngl.com`)

`public/CNAME` is copied into `dist` on build. In GitHub **Settings → Pages**, set the custom domain and (recommended) **Enforce HTTPS**.

If the site loads as plain HTML with no styles, open DevTools → Network: the page is probably serving **source** `index.html` with `/src/main.ts` (404 or wrong MIME) instead of `/assets/*.css`. Fix: set Pages source to **GitHub Actions**, then re-run the deploy workflow.
