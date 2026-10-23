# Mahmoud Sallam: Portfolio

A static single-page portfolio in a dark "Liquid Glass" style. It is plain HTML, CSS and JavaScript, with no build step, no framework and no npm.

```
index.html   page markup and all content
style.css    design tokens (top of file) and styles
main.js      reveal, nav, project filters, tilt, certificates and lightbox
chat.js      chat widget (talks to the MS-chatbot API)
assets/      profile photo, favicon, CV, certificates/web/*.webp
```

## Run locally

Use either command:

```bash
python -m http.server 3000      # needs Python installed
npx serve -l 3000 .             # needs Node installed
```

Then open http://localhost:3000.

## Add a project card

Cards live in `div.projects-grid` in `index.html`. **The page shows them in DOM order, so put the newest card first.** Nothing sorts the cards automatically.

```html
<div class="glass-card project-card animate-on-scroll tilt-card" data-tags="apps" data-stagger="0">
  <span class="card-spotlight" aria-hidden="true"></span>
  <span class="project-icon"><i class="fa-solid fa-robot" aria-hidden="true"></i></span>
  <p class="project-meta">Nov 2026 · App</p>
  <h3>Project title</h3>
  <p>Two-line description.</p>
  <div class="project-tags"><span class="tag">C</span><span class="tag">Linux</span></div>
  <a class="project-link" href="https://github.com/Urfavbr0wnboi/REPO" target="_blank" rel="noopener">
    <i class="fa-brands fa-github" aria-hidden="true"></i> GitHub
  </a>
</div>
```

**Stagger rule:** `data-stagger` must be unique and contiguous, numbered `0, 1, 2 … N-1` from top to bottom. When you add a card at the top, it becomes `0`, and you add 1 to every other card's value.

- `data-tags` is the filter key. It must match a pill's `data-filter`, such as `apps`, `audio` or `systems`. To add a new category, add another `button.filter-pill` with that `data-filter`.
- Use only **free** Font Awesome 6.5.1 icons (`fa-solid`, `fa-brands`). A Pro-only icon renders as an empty box.
- On "All", the grid shows 6 cards on desktop and 3 on mobile. The "Show More" button appears on its own once there are more cards than that.

## Add a certificate

1. Convert the scan to WebP, about 1600 px wide at quality around 80 (100–300 KB). Save it in `assets/certificates/web/`. For example:
   ```bash
   npx sharp-cli -i scan.png -o assets/certificates/web/ --format webp --quality 80 resize 1600
   ```
   Don't commit raw PNG or PDF scans. Keep them in `assets/certificates/raw/`, which is gitignored.
2. Add a card inside `div.certs-grid`, then delete the `.certs-empty` TODO block:
   ```html
   <button class="glass cert-card animate-on-scroll" type="button" data-stagger="0"
           data-full="assets/certificates/web/name.webp">
     <div class="cert-thumb skeleton">
       <img src="assets/certificates/web/name.webp" alt="" loading="lazy" width="1600" height="1200">
     </div>
     <div class="cert-info"><h3>Certificate title</h3><span>Issuer · Mon 2026</span></div>
   </button>
   ```
   `main.js` counts the cards for you. It updates the hero stat tile, which replaces the "events" tile once there is at least 1 certificate, and the "Show N More" label.

## Chat widget

`chat.js` plus section 20 of `style.css` add the "Ask about Mahmoud" assistant. It calls the chatbot API in `MS-chatbot-main/`, whose README covers running and deploying it.

- The API address lives in `data-api` on `<div id="chat-island">` in `index.html`. It is `http://localhost:8000` for local testing. Change it to the deployed API URL before publishing.
- The site's domain must be listed in the API's `ALLOWED_ORIGINS`, or the browser blocks the request.
- What the bot knows comes from `MS-chatbot-main/background.md`, not from this page. Update both when you add a project or certificate.

## Deploy to Cloudflare Pages

1. Push this folder to a GitHub repository. `.gitignore` keeps `CLAUDE.md`, `.claude/`, notes and the LinkedIn PDF out of it. **Pages serves every tracked file**, so check `git status` before you push.
2. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
3. Use these build settings: framework preset **None**, an **empty** build command, and output directory **`/`**.
4. After the first deploy, open **Custom domains → Set up a domain** and add your domain, such as `mahmoudsallam.dev`. If the domain's DNS is on Cloudflare, the record is created for you. Otherwise, add the CNAME record it shows you.
5. Share the custom domain, not the `*.pages.dev` address.
