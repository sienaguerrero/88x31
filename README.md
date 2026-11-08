# 88x31 button maker

Make Y2K-style 88x31 web buttons in your browser, hosted at https://88x31.siena.codes.

Pick an example or start from scratch. Type two lines of text, choose a background, border, and icon, and save a PNG. Animated buttons (blink, twinkle, shine) save as GIFs. The page also writes the HTML to link your button from someone else's site.

Everything runs on the page. Nothing is uploaded.

## Run it locally

Plain HTML, CSS, and JS in `site/`, with no build step:

```bash
python3 -m http.server 4241 --directory site
```

Then open http://localhost:4241.

The fonts are system fonts (Verdana, Tahoma, Arial Black, and so on), so a phone without them falls back to its own sans-serif.

## How it draws

Each button is drawn pixel by pixel on an 88x31 canvas. The enlarged preview, the actual-size preview, and the saved file all come from the same canvas, so what you see is what you get. The GIF encoder in `site/gif.js` is copied from the [Sparkle GIF Maker](https://blinkie.siena.codes) and has no dependencies.

## Going live

1. Push to `main`. `.github/workflows/pages.yml` copies `site/` into `_site/` and deploys it to GitHub Pages.
2. In the repo settings, Pages source is "GitHub Actions" (`build_type=workflow`).
3. The custom domain is `88x31.siena.codes`. At Porkbun, add a CNAME record for `88x31` pointing to `sienaguerrero.github.io`.
4. Once GitHub issues the certificate, turn on "Enforce HTTPS".

If the certificate state stays empty for more than a few minutes, clear the custom domain and set it again. That kicks off a fresh certificate request.
