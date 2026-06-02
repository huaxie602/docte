// uniCloud 云函数 URL 配置
// 请在 uniCloud 控制台开启云函数 URL 化后，将对应的 URL 填入下方

export const API_BASE = {
  // 管理端系统接口（登录、员工管理）
  adminSys: 'https://env-00jy6bcqqsjw.dev-hz.cloudbasefunction.cn/cicada-admin-sys',

  // 管理端知识库接口（分类、故障库）
  adminKb: 'https://env-00jy6bcqqsjw.dev-hz.cloudbasefunction.cn/cicada-admin-kb',

  // 管理端工单接口（工单列表、分配、状态更新）
  adminOrder: 'https://env-00jy6bcqqsjw.dev-hz.cloudbasefunction.cn/cicada-admin-order'
}

// 请将上方的 'xxxxx' 替换为你的实际云空间 URL