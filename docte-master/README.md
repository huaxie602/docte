# 牙医仪器检修用户端

这是一个基于 `uni-app + Vue 3` 的微信小程序前端，面向牙医仪器维修场景，主要给客户使用，用于报修、查进度、查包裹、看政策和联系客服。

## 重要提示：前端进度与交接边界

当前 `master` 已经完成“小程序最新版前端 + 原 uniCloud 后台”的融合：

- 旧版小程序前端已经替换为最新版用户端前端。
- 原仓库中的 `uniCloud-alipay/` 后台代码、数据库结构和索引说明已保留。
- 前端页面、交互、路由、底部导航、地址管理页、用户中心页和首页业务模块已整理完成。
- 已执行 `npm run check`，微信小程序生产构建通过。
- 后台同学接手后，重点不是继续替换前端，而是按接口清单补齐后端数据、状态流转和云环境配置。

当前前端进度可以按下面理解：

| 模块 | 前端进度 | 后端需要关注 |
| --- | --- | --- |
| 微信手机号登录 | 页面已接入，走 `cicada-client-user.loginWithWechat({ code })` 云对象 | 配置 `WX_APPID`、`WX_SECRET`，确认 `token + userInfo` 返回 |
| 报修提交 | 页面、表单校验、图片/视频上传入口已完成 | 实现 `/repair/submit`，保存工单和产品明细 |
| 维修进度 | 列表、详情、状态展示已完成 | 实现 `/repair/list`、`/repair/detail`，返回状态和时间线 |
| 包裹查询 | 查询入口和结果展示已完成 | 实现 `/package/query`，维护快递单号签收和处理状态 |
| 政策/客服 | 展示入口已完成 | 实现政策、客服和联系方式接口 |
| 地址/投诉/发票/产品 | 前端入口和部分本地体验逻辑已预留 | 可分阶段补接口，详见 `后端对接任务清单.md` |

请后台同学优先阅读：

- `后端对接任务清单.md`
- `api/content.js`
- `pages/index/index.vue`
- `pages/login/index.vue`
- `uniCloud-alipay/cloudfunctions/cicada-client-user/index.obj.js`
- `uniCloud-alipay/database/INDEXES.md`

## 交接说明

- 前端主流程现在以 `api/content.js` 的 HTTP 接口为主。
- 登录页目前仍保留 `uniCloud.importObject('cicada-client-user')` 的云对象调用方式。
- `api/auth.js`、`api/repair.js` 属于旧版兼容接口，后续可以逐步统一。
- 后端同学主要关注 `api/content.js` 里的接口，以及 `pages/login/index.vue` 的登录返回结构。

## 项目运行

环境要求：

- Node.js `>= 20.19.0`
- 微信开发者工具
- HBuilderX（可选）

安装依赖：

```bash
npm install
```

本地配置接口地址：

```bash
cp .env.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

默认接口地址见 `utils/request.js`，优先读取 `VITE_API_BASE_URL`。

开发运行：

```bash
npm run dev:mp-weixin
```

生产构建：

```bash
npm run build:mp-weixin
```

交接检查：

```bash
npm run check
```

输出目录：

- 开发版：`unpackage/dist/dev/mp-weixin`
- 生产版：`unpackage/dist/build/mp-weixin`

## 页面入口

`pages.json` 当前已注册页面：

- `pages/index/index`
- `pages/login/index`
- `pages/company/index`
- `pages/mine/index`
- `pages/address/index`

## 主要目录

```text
api/                    接口封装
pages/                  页面
store/                  状态管理
utils/                  请求和云函数封装
config/                 图片和资源配置
static/                 静态资源
uniCloud-alipay/        uniCloud 后端
cloudfunctions/         旧版云函数兼容目录
unpackage/              编译输出
```

## 请求约定

- HTTP 统一返回：`{ code, message, data }`
- `code = 0` 表示成功
- 请求头自动带 `Authorization: Bearer {token}`
- 遇到 `401 / 1004 / 100401`，前端会清理登录态

## 当前后端对接重点

### 登录

- 登录页使用 `cicada-client-user`
- 需要返回 `token` 和 `userInfo`
- 若要统一成 HTTP，也可以改成 `/auth/login`、`/auth/wechat-login`

### 首页主流程

当前前端主要使用这些接口：

- `POST /repair/submit`
- `GET /repair/list`
- `GET /repair/detail`
- `GET /package/query`
- `POST /upload/image`
- `POST /upload/video`
- `GET /common/contact`
- `GET /common/customer-service`
- `GET /policy/warranty`
- `GET /policy/fee`

说明：当前微信手机号登录已统一走 `cicada-client-user.loginWithWechat({ code })` 云对象。若后端后续希望登录也改成 HTTP，再补 `/auth/login` 或 `/auth/wechat-login` 并同步改前端登录调用。

### 微信支付

报价确认后，小程序维修详情页的主按钮会走 `cicada-client-order.createWechatPayPayment` 创建微信 JSAPI 预支付单，然后通过 `uni.requestPayment` 拉起支付。支付完成后，前端会调用 `syncWechatPayPayment`，服务端再向微信支付查单，只有微信返回 `SUCCESS` 且金额一致时才把工单写成 `payment_status=paid`。

企业客户仍可走线下对公转账，备用入口会调用 `uploadPaymentProof`，订单会写成 `payment_status=uploaded` 和 `payment_method=offline_transfer`，后台再人工核销。

上线前需要在 uniCloud 的 `cicada-client-order` 云函数环境变量中配置微信支付参数：

- `WX_PAY_APPID`
- `WX_PAY_MCH_ID`
- `WX_PAY_SERIAL_NO`
- `WX_PAY_NOTIFY_URL`
- `WX_PAY_PRIVATE_KEY` 或 `WX_PAY_PRIVATE_KEY_BASE64`
- `WX_PAY_API_V3_KEY`

其中 `WX_PAY_NOTIFY_URL` 需要配置成 URL 化后的 `cicada-client-order/wechatPayNotify` 地址；否则前端主动同步仍可确认支付，但微信异步通知兜底不会生效。

### 交互预留

前端还预留了这些能力，后端接入后可完善：

- 发票申请与列表
- 收货地址管理
- 投诉建议
- 产品列表
- 故障知识库
- 管理后台相关接口

## 后端补充建议

- 优先确认 `uniCloud-alipay/database/INDEXES.md` 里的索引是否已创建。
- 微信登录云对象需要在 uniCloud 环境变量中配置 `WX_APPID` 和 `WX_SECRET`，不要把 AppSecret 写进代码。
- `config/cicada-assets.js` 里的图片链接需要替换成可访问的 CDN 地址。
- 如果登录方式要统一，建议先确认前端登录页是否继续保留云对象方式。

## 相关文件

- `api/content.js`
- `api/auth.js`
- `api/repair.js`
- `pages/login/index.vue`
- `utils/request.js`
- `utils/cloud.js`
- `uniCloud-alipay/database/INDEXES.md`
- `后端对接任务清单.md`
