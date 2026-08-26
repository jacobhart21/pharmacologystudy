# DoseLab

DoseLab is a browser-based dosage-calculation practice tool. It generates fresh problems in the same families as the supplied worksheets and reveals a worked solution after a correct answer, an exhausted attempt limit, or a skip.

## Practice included

- Dose and stock-volume calculations
- Percentage strength and amount-in-volume calculations
- Legacy ratio-strength conversion practice with a safety note
- Forward and reverse dilution using `V₁C₁ = V₂C₂`
- mg/g and lb/kg conversions
- Multi-step weight-based volume calculations
- Configurable attempts, session scoring, and light or Dracula themes

This project is for education and skills practice only. It is not clinical decision support.

## Run locally

Use Node.js 22 or newer and pnpm:

```bash
pnpm install
pnpm dev
```

## Publish with GitHub Pages

The included workflow builds a fully static copy with relative asset paths, so it works as a GitHub Pages project site under a repository subpath.

1. Push the project to a GitHub repository with `main` as the default branch.
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`, or run the **Deploy DoseLab to GitHub Pages** workflow manually.

To test the same static output locally:

```bash
pnpm build:github-pages
```

The static files are written to `github-pages-dist/`.
