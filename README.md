# 牙医仪器检修管理系统

多端牙科设备维修管理平台，小程序前端 + PC后台管理 + uniCloud 共享后端。

## 项目结构

```
├── docte/                  # 小程序用户端 (uni-app Vue 3)
│   ├── pages/              # 页面
│   ├── api/                # 接口层
│   ├── uniCloud-alipay/    # 共享后端（云函数 + 数据库）
│   └── package.json
├── pc-admin/               # PC后台管理端 (Vue 3 + Element Plus + Vite)
│   ├── src/views/          # 页面
│   ├── src/api/            # 接口层
│   └── package.json
└── README.md
```

## 快速开始

### 小程序
1. 用 HBuilderX 打开 `docte/` 目录
2. 关联 uniCloud 云空间
3. 运行 → 微信小程序模拟器

### PC后台管理
```bash
cd pc-admin
npm install
npm run dev
```

## 技术栈

- **小程序**: uni-app (Vue 3) + 微信小程序
- **PC后台**: Vue 3 + Vite + Element Plus + Pinia
- **后端**: uniCloud (阿里云) 云函数 + 云数据库
