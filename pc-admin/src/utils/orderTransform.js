import { toChineseStatus } from './orderStatus.js'

// 后端工单数据转换为前端格式
export const transformOrder = (order) => {
  if (!order) return null

  const shipOut = order.ship_out_info || {}
  const shipBack = order.ship_back_info || {}
  const invoiceInfo = order.invoice_info || {}

  return {
    _id: order._id,
    id: order.order_no || order._id,

    // 报修方信息
    clinicName: shipBack.name || '',
    customerName: shipBack.name || '',
    phone: shipBack.phone || '',
    address: `${shipBack.region || ''} ${shipBack.detail || ''}`.trim(),

    // 物流信息
    senderAddress: `${shipOut.region || ''} ${shipOut.detail || ''}`.trim(),
    returnAddress: `${shipBack.region || ''} ${shipBack.detail || ''}`.trim(),
    logisticsCompany: shipOut.logistics_company || '',
    logisticsNo: shipOut.logistics_no || '',
    returnCompany: shipBack.logistics_company || '',
    returnNo: shipBack.logistics_no || '',

    // 产品信息（从工单项目中获取）
    productModel: order.product_model || '',
    productName: order.product_name || '',
    fault: order.fault_desc || '',
    images: order.media_urls || [],
    itemsList: order.itemsList && order.itemsList.length > 0
      ? order.itemsList.map(item => `${item.product_name || ''} x ${item.quantity || 1}`).join('、')
      : '',

    // 状态
    status: toChineseStatus(order.status),
    statusEn: order.status,

    // 工程师和时间线
    engineerId: order.engineer_id || '',
    timeline: order.timeline || [],

    // 价格
    totalPrice: order.total_price || 0,

    // 发票信息（内部登记，不代表已接入税控开票）
    needInvoice: invoiceInfo.need_invoice || false,
    invoiceTitle: invoiceInfo.title || '',
    taxId: invoiceInfo.tax_no || '',
    invoiceStatus: invoiceInfo.status || '',
    invoiceRemark: invoiceInfo.remark || '',

    // 时间
    submitTime: order.create_time ? new Date(order.create_time).toLocaleString('zh-CN', { hour12: false }) : '',
    updateTime: order.update_time ? new Date(order.update_time).toLocaleString('zh-CN', { hour12: false }) : '',

    // 用户ID
    userId: order.user_id || ''
  }
}

// 批量转换
export const transformOrders = (orders) => {
  return Array.isArray(orders) ? orders.map(transformOrder) : []
}
