# docte

牙科诊疗服务平台，包含后台管理端、小程序端及 uniCloud 后端。

## 项目结构

```
docte/
├── pc-admin/          # 后台管理端 (Vue.js + Vite)
├── docte-master/      # 小程序端 (uni-app) + uniCloud 后端 (阿里云)
├── README.md
└── .gitignore
```

## 技术栈

| 模块 | 技术 |
|------|------|
| pc-admin | Vue 3 + Vite + Element Plus |
| docte-master | uni-app (微信小程序) |
| 后端 | uniCloud (阿里云) |

## 快速开始

### pc-admin

```bash
cd pc-admin
npm install
npm run dev
```

### docte-master（小程序）

使用 HBuilderX 打开 `docte-master` 目录，配置微信小程序 AppID 后运行。
