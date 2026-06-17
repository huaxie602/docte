# Repository Guidelines

## Project Structure & Module Organization

This repository contains a uni-app/Vue 3 WeChat mini program plus admin and cloud resources. The root holds shared config such as `package.json`, `pages.json`, `manifest.json`, `App.vue`, `main.js`, and launch checks in `scripts/`. The fuller mini-program implementation lives in `docte-master/`, with `pages/` for screens, `components/` for reusable UI, `api/` for API wrappers, `store/` for state, `utils/` for helpers, `static/` and `cdn-assets/` for assets, and `uniCloud*/` for cloud functions and database schemas. The PC admin console is in `pc-admin/src/`. Build output goes to `unpackage/` and should not be committed.

## Build, Test, and Development Commands

Root mini-program commands:

```bash
npm install
npm run dev:mp-weixin
npm run build:mp-weixin
npm run check
```

For the admin console:

```bash
cd pc-admin
npm install
npm run dev
npm run build
```

Useful admin checks include `npm run check:urls`, `npm run check:security`, `npm run check:errors`, and `npm run check:subscription`.

## Coding Style & Naming Conventions

Use Vue 3 single-file components for UI and JavaScript modules for logic. Keep page folders lowercase and route-oriented, for example `pages/index/index.vue`. Name cloud functions and database collections with existing `cicada-*` and `cicada_*` patterns. Prefer small API modules under `api/` and shared helpers under `utils/`. Keep secrets out of source; copy `.env.example` to `.env.local` for local configuration.

## Testing Guidelines

There is no dedicated unit-test suite yet. Treat `npm run check` and production builds as the minimum regression gate for mini-program changes. For admin changes, run the relevant `pc-admin` checks and `npm run build`. When changing order, payment, subscription, or cloud-function behavior, validate the matching uniCloud schema/function files and record any manual WeChat Developer Tools checks.

## Commit & Pull Request Guidelines

Git history uses short imperative messages, often with prefixes such as `feat:`, `fix:`, or `merge:`. Keep commits focused and mention the affected area when useful, for example `fix: repair order payment sync`. Pull requests should include a clear summary, linked issue or task, test/build commands run, screenshots for UI changes, and notes for any environment variables, cloud indexes, or deployment steps.

## Security & Configuration Tips

Never commit `.env`, `.env.local`, `project.private.config.json`, payment keys, `WX_SECRET`, or generated preview QR images. Verify uniCloud indexes and WeChat payment/subscription template IDs before release.
