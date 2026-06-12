# 牙医仪器维修小程序

这是一个面向牙科/医疗仪器售后维修场景的 `uni-app + Vue 3` 微信小程序项目。用户可以在小程序中提交报修、上传凭证、查看维修进度、查询包裹、申请发票、查看政策说明并联系客服。

当前仓库同时保留了小程序前台、uniCloud 后端资源和 PC 管理后台相关目录，方便前后台协同交接。

## 当前状态

- 根目录是当前小程序主工程，可直接运行微信小程序构建脚本。
- `docte-master/` 保留了一套历史/融合后的前台与 uniCloud 资源，可作为业务代码和云函数参考。
- `pc-admin/` 是 Vue 3 + Vite + Element Plus 的后台管理端，用于工单、用户、知识库、发票和系统配置管理。
- `uniCloud-alipay/` 相关目录包含云函数、数据库 schema、初始化数据、索引说明和维护脚本。
- 当前重点不是继续替换前台页面，而是补齐真实环境配置、接口联调、数据索引、支付、订阅消息和完整验收。

## 技术栈

- 小程序前台：uni-app、Vue 3、微信小程序
- 后台管理：Vue 3、Vite、Element Plus、Pinia
- 后端：uniCloud 云函数、云数据库
- 支付：微信 JSAPI 支付
- 通知：微信订阅消息

## 快速开始

环境要求：

- Node.js `>= 20.19.0`
- 微信开发者工具
- HBuilderX，可选，用于 uniCloud 部署和小程序调试

安装依赖：

```bash
npm install
```

复制本地环境配置：

```bash
cp .env.example .env.local
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env.local
```

开发运行微信小程序：

```bash
npm run dev:mp-weixin
```

生产构建：

```bash
npm run build:mp-weixin
```

本地检查：

```bash
npm run check
```

构建输出目录：

- 开发版：`unpackage/dist/dev/mp-weixin`
- 生产版：`unpackage/dist/build/mp-weixin`

## 主要目录

```text
api/                         小程序接口封装
pages/                       小程序页面
store/                       前台状态管理
utils/                       请求、云函数和通用工具
config/                      图片、品牌资源和运行配置
static/                      静态资源
uniCloud-alipay/             uniCloud 云函数、数据库 schema 和初始化数据
docte-master/                历史/融合后的前台与 uniCloud 资源参考
pc-admin/                    PC 后台管理端
scripts/                     本地检查脚本
unpackage/                   小程序编译输出，不建议提交
```

## 页面入口

`pages.json` 当前注册的小程序页面：

- `pages/index/index`：首页与主要业务入口
- `pages/login/index`：微信登录
- `pages/company/index`：企业/品牌介绍
- `pages/mine/index`：个人中心
- `pages/address/index`：收货地址管理

## 核心业务模块

| 模块 | 前台能力 | 后台/云端关注点 |
| --- | --- | --- |
| 微信登录 | 通过微信登录获取用户身份和 token | 配置 `WX_APPID`、`WX_SECRET`，确保返回 `token` 和 `userInfo` |
| 报修提交 | 填写寄出信息、回寄信息、产品信息、故障描述、图片/视频凭证 | 保存工单和产品明细，校验必填项，处理上传文件 |
| 维修进度 | 展示工单列表、状态流转、报价、付款、发票状态 | 维护工单状态机、时间线、报价和付款状态 |
| 包裹查询 | 使用快递单号查询签收、入库和回寄进度 | 维护物流单号、签收记录、隐私查询规则 |
| 报价与支付 | 用户确认报价后发起微信支付，也支持线下转账凭证 | 配置微信支付参数，服务端查单确认后再写入已支付 |
| 发票申请 | 用户对符合条件的工单提交发票抬头、税号、邮箱 | 后台审核和更新开票状态 |
| 投诉建议 | 用户提交问题反馈和联系方式 | 后台处理反馈并维护处理状态 |
| 政策/客服 | 展示保修政策、收费政策、联系方式和客服入口 | 后台维护公共内容和客服配置 |

## 接口约定

HTTP 接口统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

约定说明：

- `code = 0` 表示成功。
- 非 `0` 表示失败，前台会展示 `message` 或兜底错误提示。
- 请求头自动携带 `Authorization: Bearer {token}`。
- 遇到 `401 / 1004 / 100401` 时，前台会清理登录态并引导重新登录。

前台主要使用的业务接口包括：

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

登录当前仍以 `cicada-client-user.loginWithWechat({ code })` 云对象方式为主。如果后续要统一成 HTTP 登录，建议先确认前台登录页和后台返回结构，再同步调整 `/auth/login` 或 `/auth/wechat-login`。

## uniCloud 后端

主要云函数：

- `cicada-client-user`：用户登录、用户资料
- `cicada-client-order`：用户侧工单、报价、支付、发票、包裹查询
- `cicada-client-public`：公共内容、政策、故障知识等
- `cicada-admin-order`：后台工单管理、状态流转、批量导入、报价、付款核销
- `cicada-admin-kb`：后台知识库管理
- `cicada-admin-sys`：后台登录、员工、设置、指南文件
- `cicada-maintenance`：维护和数据修复任务

核心数据库集合：

- `cicada_users`
- `cicada_orders`
- `cicada_order_items`
- `cicada_addresses`
- `cicada_user_devices`
- `cicada_fault_kb`
- `cicada_product_categories`
- `cicada_feedbacks`
- `cicada_guides`
- `cicada_settings`
- `cicada_rate_limits`
- `cicada_subscription_logs`

上线前必须在 uniCloud 控制台创建数据库索引，尤其是：

- `cicada_orders.order_no` 唯一索引，防止工单号重复。
- `cicada_orders.user_id + create_time`，用于用户工单倒序查询。
- `cicada_orders.status + create_time`，用于后台状态筛选。
- `cicada_rate_limits.key` 唯一索引，用于登录和提交频控。

详细索引以 `uniCloud-alipay/database/INDEXES.md` 为准。

## 微信支付配置

报价确认后，小程序会调用 `cicada-client-order.createWechatPayPayment` 创建微信 JSAPI 预支付单，再通过 `uni.requestPayment` 拉起支付。支付完成后，前台调用 `syncWechatPayPayment`，服务端会向微信查单，只有微信返回 `SUCCESS` 且金额一致时，才会把工单写为 `payment_status=paid`。

企业客户也可以走线下对公转账。用户上传付款凭证后，工单会写为：

- `payment_status=uploaded`
- `payment_method=offline_transfer`

随后由后台人工核销。

上线前需要在 `cicada-client-order` 云函数环境变量中配置：

- `WX_PAY_APPID`
- `WX_PAY_MCH_ID`
- `WX_PAY_SERIAL_NO`
- `WX_PAY_NOTIFY_URL`
- `WX_PAY_PRIVATE_KEY` 或 `WX_PAY_PRIVATE_KEY_BASE64`
- `WX_PAY_API_V3_KEY`

`WX_PAY_NOTIFY_URL` 应配置为 URL 化后的 `cicada-client-order/wechatPayNotify` 地址。即使异步通知未生效，前台主动同步仍可确认支付，但生产环境建议同时配置异步通知兜底。

## 订阅消息配置

小程序会在报修提交、查看进度、确认报价、支付、上传对公转账凭证等关键节点前请求订阅消息授权。后台状态变化、报价发布、付款核销、微信支付到账、回寄发货等场景会尝试发送订阅消息，并将结果记录到 `cicada_subscription_logs`。

上线前需要配置：

- `WX_APPID`
- `WX_SECRET`
- `WX_SUBSCRIBE_TEMPLATE_REPAIR_SUBMITTED`
- `WX_SUBSCRIBE_TEMPLATE_ORDER_RECEIVED`
- `WX_SUBSCRIBE_TEMPLATE_QUOTE_ISSUED`
- `WX_SUBSCRIBE_TEMPLATE_PAYMENT_CONFIRMED`
- `WX_SUBSCRIBE_TEMPLATE_ORDER_SHIPPED`
- `WX_SUBSCRIBE_TEMPLATE_ORDER_COMPLETED`

也支持使用 `WECHAT_SUBSCRIBE_TEMPLATE_*` 作为模板 ID 变量前缀。模板字段当前按通用状态通知结构发送：`thing1`、`character_string2`、`phrase3`、`time4`、`thing5`。如果微信公众平台模板字段不同，需要同步调整 `cicada-admin-order` 和 `cicada-client-order` 中的 `buildSubscriptionData`。

## PC 后台

后台管理端位于 `pc-admin/`。

常用命令：

```bash
cd pc-admin
npm install
npm run dev
npm run build
```

后台接口需要云函数 URL 化。复制环境配置：

```bash
cd pc-admin
cp .env.example .env.local
```

Windows PowerShell：

```powershell
cd pc-admin
Copy-Item .env.example .env.local
```

检查后台 URL 和安全配置：

```bash
npm run check:urls
npm run check:security
npm run check:errors
npm run check:subscription
```

## 上线验收清单

建议按以下顺序做真实环境验收：

1. 登录：微信授权登录成功，`token` 和 `userInfo` 正确写入，过期后能重新登录。
2. 报修：提交包含多产品、图片、视频、购买凭证、物流和回寄信息的工单，数据库写入完整。
3. 工单列表：小程序可查看进度，后台可分页筛选，状态和时间线一致。
4. 包裹查询：快递单号可查到签收/入库/回寄信息，手机号后四位隐私校验生效。
5. 报价：后台发布报价，小程序可查看并确认。
6. 微信支付：发起支付、支付成功、服务端查单、状态写入 `paid` 全链路通过。
7. 对公转账：用户上传凭证，后台可查看并核销。
8. 发票：用户提交发票申请，后台更新开票状态，小程序刷新后可见。
9. 订阅消息：授权、拒绝、发送成功、发送失败都不阻塞主流程，并有日志记录。
10. 后台待办：待签收、待报价、待核销、待开票、待回寄等数量与工单筛选结果一致。

## 交接重点

- 优先确认 uniCloud 环境变量、云函数 URL 化和数据库索引是否已配置。
- 不要把 `WX_SECRET`、微信支付私钥、APIv3 密钥等敏感信息写入代码仓库。
- `config/cicada-assets.js` 中的图片链接上线前需要替换为可访问的 CDN 地址。
- 如果登录方式要从云对象统一为 HTTP，需要同时修改前台登录页、接口封装和后端返回结构。
- 后台批量导入、发票、支付核销、订阅消息这些功能建议用真实数据跑完整闭环。

## 相关文档

- `CLAUDE.md`
- `INDEX_TASK.md`
- `DEPLOY_GOAL.md`
- `docte-master/后端对接任务清单.md`
- `docte-master/uniCloud-alipay/database/INDEXES.md`
- `pc-admin/README.md`
- `pc-admin/配置指南.md`
