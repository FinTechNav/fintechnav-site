# FinTechNav sites and apps

Source for the [FinTechNav biography site](https://fintechnav.com/) and [RedDay AI stock dashboard](https://fintechnav.com/stock/), hosted on Netlify. Heavy Pour Wine applications live in separate repositories.

## Supported source

- `index.html`, `privacy-policy.html`, `js/`, `styles/`, `sections/`, `content/`, `logos/`: public biography site and contact form.
- `stock/`: private stock dashboard shell, bundled Identity client and local preview server.
- `server/stock/`, `netlify/functions/`: server-enforced owner authentication, private brokerage storage and guarded APIs; contact mail uses Nodemailer with Zoho SMTP.
- `scripts/build-site.mjs`, `netlify.toml`: explicit public asset allowlist and hosting configuration. The registered Schwab callback project uses a separate minimal relay build.
- `.github/`: pinned security/build/dependency workflows and protected PR delivery.
- `artifacts/`: reviewed engineering decisions and validation records. Personal research, screenshots, drafts and recovery backups stay in ignored `artifacts/local/`.

Legacy HPW demos, unused preview assets, Apache configuration and duplicate research files have been archived locally. Existing career-history references remain part of the biography.

## Development

Use the latest Node 22 patch (minimum 22.13):

```sh
nvm use
npm ci --ignore-scripts
npm run build
npm run validate
npm run test:security
npm run dev:stock
```

The preview serves built files on loopback. Private stock authentication requires a deployed Netlify runtime; no local authentication bypass is provided. The biography's unbundled JSX/data scripts require their existing load order.

Copy `.env.example` only when needed for local contact testing. Runtime secrets belong in Netlify or the designated secret manager and must never be committed. See [the stock app documentation](stock/README.md) for authentication, callback and order-safety details.

## Delivery and contribution

Open a PR into protected `main`. Up-to-date branches, resolved conversations and all eight required checks are enforced; squash merging triggers Netlify production deployment. Dependabot minor/patch auto-merge is guarded by the same protections. CI generates the dependency SBOM as a workflow artifact.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [the engineering records](artifacts/INDEX.md), and [LICENSE](LICENSE).
