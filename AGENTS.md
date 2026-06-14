# AGENTS.md

This file gives Codex working guidance for this repository.

## Project Overview

This repository contains a dental equipment repair management system with two frontends and a shared uniCloud backend.

- **Mini Program**: `docte-master/`
  - uni-app + Vue 3.
  - Primary target is WeChat Mini Program.
  - Used by customers to submit repair orders, track progress, view guides, and manage account/order information.
  - Calls cloud functions through `uniCloud.callFunction()`.
- **PC Admin Dashboard**: `pc-admin/`
  - Vue 3 + Vite + Element Plus + Pinia.
  - Used by admins and engineers to manage orders, feedback, knowledge base, users, and settings.
  - Calls URL-enabled uniCloud functions through axios.
- **Shared Backend**: `docte-master/uniCloud-alipay/`
  - uniCloud cloud functions and database schemas.
  - Main collections use the `cicada_` prefix.

## Key Directories

- `docte-master/pages/`: mini-program pages.
- `docte-master/api/`: mini-program API wrappers.
- `docte-master/store/`: mini-program state.
- `docte-master/utils/`: mini-program request/cloud helpers.
- `docte-master/config/cicada-assets.js`: shared mini-program brand/media asset mapping.
- `docte-master/uniCloud-alipay/cloudfunctions/`: backend cloud functions.
- `docte-master/uniCloud-alipay/database/`: database schemas, indexes, and test data.
- `pc-admin/src/views/`: admin dashboard pages.
- `pc-admin/src/api/`: admin HTTP API wrappers.
- `pc-admin/src/config/api.js`: admin cloud function URL configuration.
- `pc-admin/src/utils/request.js`: axios wrapper and auth/error handling.
- `pc-admin/src/router/`: admin dashboard routes.
- `pc-admin/src/components/`: reusable admin UI components.

## Backend Cloud Functions

Important cloud function groups:

- `cicada-client-user`: client authentication and profile.
- `cicada-client-order`: client order creation and order operations.
- `cicada-client-public`: public guide and knowledge-base content.
- `cicada-admin-order`: admin order list, detail, workflow, payment, invoice, and todo operations.
- `cicada-admin-kb`: admin fault knowledge-base management.
- `cicada-admin-sys`: admin login, staff, feedback, guides, and settings.
- `cicada-maintenance`: background maintenance jobs.

## Database Collections

Common collections:

- `cicada_users`
- `cicada_orders`
- `cicada_order_items`
- `cicada_user_devices`
- `cicada_addresses`
- `cicada_fault_kb`
- `cicada_product_categories`
- `cicada_feedbacks`
- `cicada_guides`
- `cicada_settings`
- `cicada_rate_limits`

Indexes for production must be created manually in the uniCloud console. Keep `docte-master/uniCloud-alipay/database/INDEXES.md` updated when query patterns change.

## Development Commands

Mini Program:

```bash
cd docte-master
npm run check
```

PC Admin:

```bash
cd pc-admin
npm run dev
npm run build
npm run check:errors
npm run check:security
```

Root verification:

```bash
node scripts/check-order-workflow.mjs
node scripts/check-goal-local.mjs
node scripts/check-no-sms-login.mjs
```

## Runtime Notes

- Mini Program auth stores token through `uni.getStorageSync('token')`; `utils/cloud.js` injects it into cloud calls.
- PC Admin auth stores `adminToken` in `localStorage`; `src/utils/request.js` injects it into the `Authorization` header.
- API success convention is `code: 0`; unauthorized responses use `code: 401`.
- User roles are `client`, `engineer`, and `admin`.
- WeChat AppID is configured in `docte-master/manifest.json`.
- uniCloud provider directory is `docte-master/uniCloud-alipay`.

## Implementation Conventions

- Prefer existing API wrapper patterns instead of calling cloud functions directly from pages/views.
- Preserve order workflow state checks when changing `cicada-admin-order`.
- Keep admin list and todo queries paginated or indexed; avoid unbounded full collection scans.
- Do not commit generated output such as `node_modules`, `unpackage`, `dist`, temporary logs, or screenshots.
- If rendered PC UI changes, verify with a running Vite dev server and a browser smoke test.
