# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This repo holds three things that ship together against one uniCloud backend:

- **Root (`./`)** — the active uni-app + Vue 3 mini program (WeChat). This is what `npm run dev:mp-weixin` builds.
- **`pc-admin/`** — Vue 3 + Vite + Element Plus + Pinia admin dashboard. Subdirectory, not a sibling repo.
- **`docte-master/`** — a historical/merged copy of the mini program **plus the canonical uniCloud backend** (`docte-master/uniCloud-alipay/`). Cloud functions and DB schemas live here; the root mini program calls them.
- **`scripts/`** — root-level launch-readiness checks (`check-goal-local.mjs`, `check-launch-readiness-features.mjs`, `check-no-sms-login.mjs`, `check-order-workflow.mjs`).
- **`deliverables/`**, **`unpackage/`** — build/handoff artifacts, don't commit changes manually.

Backend domain split (under `docte-master/uniCloud-alipay/cloudfunctions/`):
- Client-facing: `cicada-client-user`, `cicada-client-order`, `cicada-client-public`
- Admin: `cicada-admin-sys`, `cicada-admin-order`, `cicada-admin-kb`
- Maintenance: `cicada-maintenance`
- Shared: `common/`

The mini program currently calls cloud functions via uniCloud objects (e.g. `cicada-client-user.loginWithWechat({ code })`). The PC admin calls them via cloud function URL化 (HTTP) — admin functions must have URL化 enabled and the URLs configured in `pc-admin/src/config/api.js`.

## Commands

Requires Node `>=20.19.0`.

**Mini program (root):**
```bash
npm install
cp .env.example .env.local       # PowerShell: Copy-Item .env.example .env.local
npm run dev:mp-weixin            # outputs to unpackage/dist/dev/mp-weixin
npm run build:mp-weixin          # outputs to unpackage/dist/build/mp-weixin
npm run check                    # currently aliases build:mp-weixin
```
Then open `unpackage/dist/dev/mp-weixin` in WeChat DevTools (AppID `wxb764380b85d5b475`). There is no `dev:h5` script — only mp-weixin is wired up.

**PC admin (`pc-admin/`):**
```bash
cd pc-admin
npm install
cp .env.example .env.local       # sets VITE_API_BASE_URL
npm run dev                      # Vite dev server
npm run build
npm run mock                     # local-mock-server.mjs for offline UI work
npm run check:urls               # verify admin URL化 endpoints reachable
npm run check:security           # security config audit
npm run check:errors             # request error parser coverage
npm run check:subscription       # subscribe message template config
npm run check:launch             # delegates to ../scripts/check-launch-readiness-features.mjs
```

**uniCloud (HBuilderX-driven):** right-click a function under `docte-master/uniCloud-alipay/cloudfunctions/<name>/` → Upload and deploy. View logs in HBuilderX → uniCloud panel or https://unicloud.dcloud.net.cn. uniCloud provider is **Alipay Cloud** (the folder is `uniCloud-alipay/`, not `uniCloud-aliyun/`).

## Required external configuration

These are **not** in this repo. They must be set before features will work end-to-end. Treat their absence as the most likely cause of "it works locally but breaks in real env":

**uniCloud env vars on `cicada-client-order`** — WeChat JSAPI Pay:
- `WX_PAY_APPID`, `WX_PAY_MCH_ID`, `WX_PAY_SERIAL_NO`
- `WX_PAY_NOTIFY_URL` (the URL化 address of `cicada-client-order/wechatPayNotify`)
- `WX_PAY_PRIVATE_KEY` or `WX_PAY_PRIVATE_KEY_BASE64`
- `WX_PAY_API_V3_KEY` (32 bytes)

**uniCloud env vars for WeChat login + subscribe messages**:
- `WX_APPID`, `WX_SECRET`
- Template IDs (either `WX_SUBSCRIBE_TEMPLATE_*` or `WECHAT_SUBSCRIBE_TEMPLATE_*` prefix accepted): `REPAIR_SUBMITTED`, `ORDER_RECEIVED`, `QUOTE_ISSUED`, `PAYMENT_CONFIRMED`, `ORDER_SHIPPED`, `ORDER_COMPLETED`. Templates are sent with fields `thing1 / character_string2 / phrase3 / time4 / thing5`; if the configured WeChat template uses different fields, update `buildSubscriptionData` in both `cicada-admin-order` and `cicada-client-order`.

**Database indexes** — must be created manually in the uniCloud console before production. Canonical list: `docte-master/uniCloud-alipay/database/INDEXES.md` and `INDEX_TASK.md`. Non-negotiable:
- `cicada_orders.order_no` UNIQUE (duplicate order numbers will corrupt billing)
- `cicada_orders.user_id + create_time` (user list paging)
- `cicada_orders.status + create_time` (admin filter)
- `cicada_rate_limits.key` UNIQUE (login + submit throttling)

For composite indexes in the web console, add **all** fields inside one panel before saving — saving per-field creates multiple single-field indexes instead.

## Architecture notes that aren't obvious from grepping

**Response envelope.** Everything (HTTP and cloud functions) returns `{ code, message, data }`. `code === 0` is success; `401 / 1004 / 100401` all mean re-auth — the client treats them identically (clears token, routes to login). Don't invent new auth-failure codes.

**Token handling.** Mini program stores token in `uni.getStorageSync('token')`; `utils/cloud.js` injects it into every `callCloudFunction()` call. PC admin stores in `localStorage`; the axios interceptor in `pc-admin/src/utils/request.js` adds `Authorization: Bearer <token>`.

**Login is currently cloud-object based, not HTTP.** `cicada-client-user.loginWithWechat({ code })` returns `{ token, userInfo }`. If you migrate to HTTP `/auth/login` or `/auth/wechat-login`, update the login page, `api/` wrappers, and backend return shape together — half-migrations have bitten this project.

**Payment confirmation is server-pulled, not push-trusted.** Mini program calls `createWechatPayPayment` → `uni.requestPayment` → on resolve, calls `syncWechatPayPayment`. The server queries WeChat (`SUCCESS` + amount match) before writing `payment_status=paid`. The async `wechatPayNotify` URL is a backup, not the source of truth. Don't write `paid` from the client side.

**Offline corporate transfer path** sets `payment_status=uploaded` + `payment_method=offline_transfer` and waits for admin reconciliation — it never auto-flips to `paid`.

**Subscribe-message authorization is opportunistic.** Authorization prompts fire at submit/quote-view/payment/transfer-upload. Failures and denials must not block the main flow; results are logged to `cicada_subscription_logs`.

**`docte-master/` is dual-purpose.** It holds the canonical uniCloud backend (deploy from here) **and** a parallel snapshot of front-end pages/api for reference. The root is the active mini-program client. If you find divergence between root and `docte-master/` front-end code, the root wins for the mini program; treat `docte-master/` front-end files as reference, not deployment target.

**`navigationStyle: "custom"`** is set on every page in `pages.json` — pages render their own nav bar; don't expect the system bar.

**User roles.** `client` (mini program), `engineer` and `admin` (PC admin). Role checks happen in cloud functions, not just in the UI.

## Adding things

- **New mini-program page**: create `pages/<area>/<name>.vue`, then register in `pages.json` with `"navigationStyle": "custom"`.
- **New PC admin page**: create `pc-admin/src/views/<Name>.vue` and add a route in `pc-admin/src/router/` with `meta: { requiresAuth: true }`.
- **New cloud function**: create `docte-master/uniCloud-alipay/cloudfunctions/<name>/index.obj.js` exporting `async` methods, deploy via HBuilderX. If it's an admin function called from PC admin, also enable URL化 and add the URL to `pc-admin/src/config/api.js`.
- **New collection**: schema at `docte-master/uniCloud-alipay/database/<cicada_xxx>.schema.json`, optional `cicada_xxx.init_data.json`, then add required indexes to `INDEX_TASK.md` / `INDEXES.md` and create them in the console.

## Production acceptance checklist

Run these end-to-end against the real environment in order — earlier items gate later ones:

1. **Login** — WeChat OAuth succeeds, `token` + `userInfo` persist, expired token re-auths cleanly.
2. **Submit repair** — multi-product order with images, video, purchase proof, ship-out + return logistics writes a complete row.
3. **Order list** — mini program shows progress; admin pagination + filters match; status and timeline agree across both.
4. **Package query** — courier number returns sign/inbound/return events; phone-last-4 privacy check enforced.
5. **Quote** — admin publishes quote; client sees and confirms it.
6. **WeChat Pay** — initiate → pay → server queries WeChat → `payment_status=paid` written. Full chain, not just one leg.
7. **Offline transfer** — client uploads proof; admin reconciles; status flips correctly.
8. **Invoice** — client submits invoice request; admin updates issuance status; client sees the update after refresh.
9. **Subscribe messages** — authorize/deny/send-success/send-fail all leave the main flow uninterrupted; results in `cicada_subscription_logs`.
10. **Admin queues** — pending-receive / pending-quote / pending-reconcile / pending-invoice / pending-return counts match what filters return.

## Related docs

- `README.md` — Chinese-language overview, acceptance checklist
- `INDEX_TASK.md`, `docte-master/uniCloud-alipay/database/INDEXES.md` — index specifications
- `DEPLOY_GOAL.md` — deployment objectives
- `pc-admin/README.md`, `pc-admin/配置指南.md` — admin setup
- `docte-master/后端对接任务清单.md` — backend integration checklist
- `系统分析报告.md` — system analysis
