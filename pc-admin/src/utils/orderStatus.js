// 工单状态映射

// 后端状态到前端中文
export const STATUS_MAP = {
  'pending': '待处理',
  'received': '待处理',
  'inspecting': '维修中',
  'fixing': '维修中',
  'shipped': '已发货',
  'completed': '已处理',
  'cancelled': '已取消'
}

// 前端中文到后端状态
export const STATUS_REVERSE_MAP = {
  '待处理': 'pending',
  '维修中': 'fixing',
  '已发货': 'shipped',
  '已处理': 'completed',
  '已取消': 'cancelled'
}

// 状态对应的标签类型
export const STATUS_TAG_TYPE = {
  'pending': 'info',
  'received': 'warning',
  'inspecting': 'primary',
  'fixing': 'primary',
  'shipped': 'success',
  'completed': 'success',
  'cancelled': 'danger'
}

// 转换函数
export const toChineseStatus = (status) => STATUS_MAP[status] || status
export const toEnglishStatus = (status) => STATUS_REVERSE_MAP[status] || status
export const getStatusTagType = (status) => STATUS_TAG_TYPE[status] || 'info'
