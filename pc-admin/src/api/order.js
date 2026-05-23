import request from '../utils/request.js'
import { API_BASE } from '../config/api.js'

// 获取工单列表
export const getOrderList = (token, status, page = 1, pageSize = 20) => {
  return request.post(`${API_BASE.adminOrder}/getAdminOrderList`, {
    token,
    status,
    page,
    pageSize
  })
}

// 分配工程师
export const assignEngineer = (token, orderId, engineerId) => {
  return request.post(`${API_BASE.adminOrder}/assignEngineer`, {
    token,
    order_id: orderId,
    engineer_id: engineerId
  })
}

// 更新工单状态
export const updateOrderStatus = (token, orderId, status) => {
  return request.post(`${API_BASE.adminOrder}/updateOrderStatus`, {
    token,
    order_id: orderId,
    status
  })
}

// 批量导入回寄运单号
export const batchImportReturnLogistics = (token, rows) => {
  return request.post(`${API_BASE.adminOrder}/batchImportReturnLogistics`, {
    token,
    rows
  })
}

// 更新开票状态登记
export const updateInvoiceStatus = (token, orderId, status, invoice = {}) => {
  return request.post(`${API_BASE.adminOrder}/updateInvoiceStatus`, {
    token,
    order_id: orderId,
    status,
    invoice
  })
}

// 添加时间线
export const addTimeline = (token, orderId, title, desc) => {
  return request.post(`${API_BASE.adminOrder}/addTimeline`, {
    token,
    order_id: orderId,
    title,
    desc
  })
}

// 获取统计数据
export const getStatistics = (token) => {
  return request.post(`${API_BASE.adminOrder}/getStatistics`, { token })
}
