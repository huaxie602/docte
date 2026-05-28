const db = uniCloud.database()
const dbCmd = db.command

async function verifyAdminToken(token) {
  if (!token) throw new Error('鉴权失败：非管理人员禁止访问该接口')
  const res = await db.collection('cicada_users').where({ token }).limit(1).get()
  const user = res.data[0]
  if (!user || user.disabled || !['admin', 'engineer'].includes(user.role)) {
    throw new Error('鉴权失败：非管理人员禁止访问该接口')
  }
  if (Date.now() > user.token_expire) throw new Error('鉴权失败：Token已过期')
  return user
}

async function verifyEngineer(engineer_id) {
  if (!engineer_id) throw new Error('缺少工程师ID')
  const res = await db.collection('cicada_users')
    .where({ _id: engineer_id, role: 'engineer', disabled: dbCmd.neq(true) })
    .limit(1)
    .get()
  if (!res.data.length) throw new Error('工程师不存在或已禁用')
}

function normalizePage(page, pageSize) {
  const current = Math.max(Number(page) || 1, 1)
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
  return { page: current, pageSize: size }
}

const ORDER_STATUS = ['pending', 'received', 'inspecting', 'fixing', 'shipped', 'completed', 'cancelled']

function parseHttpBody(ctx) {
  const httpInfo = ctx.getHttpInfo && ctx.getHttpInfo()
  if (!httpInfo || !httpInfo.body) return null
  return JSON.parse(httpInfo.body)
}

function pickParam(ctx, params) {
  if (params && Object.keys(params).length) return params
  return parseHttpBody(ctx) || {}
}

function normalizeText(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

function normalizeImportRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((row = {}, index) => ({
    rowIndex: index + 2,
    order_no: normalizeText(row.order_no || row.orderNo || row['工单编号'] || row['工单号']),
    logistics_company: normalizeText(row.logistics_company || row.logisticsCompany || row.return_company || row['回寄物流公司'] || row['物流公司']),
    logistics_no: normalizeText(row.logistics_no || row.logisticsNo || row.return_no || row.tracking_no || row.trackingNo || row['回寄运单号'] || row['运单号'] || row['快递单号']),
    shipped_at: normalizeText(row.shipped_at || row.shippedAt || row['发货日期']),
    remark: normalizeText(row.remark || row['备注'])
  }))
}

function buildShipBackInfo(order, item, now) {
  const shipBack = order.ship_back_info || {}
  const next = {
    ...shipBack,
    logistics_company: item.logistics_company,
    logistics_no: item.logistics_no,
    shipped_at: item.shipped_at || now
  }
  if (item.remark) next.remark = item.remark
  return next
}

function normalizeShippingList(shippingList) {
  if (!Array.isArray(shippingList)) return []
  return shippingList.map((item = {}) => ({
    orderNo: normalizeText(item.orderNo || item.order_no || item['工单编号'] || item['工单号']),
    returnCompany: normalizeText(item.returnCompany || item.return_company || item.logistics_company || item['回寄物流公司'] || item['物流公司']),
    returnNo: normalizeText(item.returnNo || item.return_no || item.logistics_no || item.trackingNo || item['回寄运单号'] || item['运单号'] || item['快递单号'])
  }))
}

function buildReturnShippingInfo(order, item, now) {
  const shipBack = order.ship_back_info || {}
  return {
    ...shipBack,
    returnCompany: item.returnCompany,
    returnNo: item.returnNo,
    return_company: item.returnCompany,
    return_no: item.returnNo,
    logistics_company: item.returnCompany,
    logistics_no: item.returnNo,
    shipped_at: now
  }
}

async function findOrderByNo(orderNo) {
  const orderNoRes = await db.collection('cicada_orders')
    .where({ order_no: orderNo })
    .limit(1)
    .get()
  if (orderNoRes.data && orderNoRes.data[0]) return orderNoRes.data[0]

  try {
    const idRes = await db.collection('cicada_orders').doc(orderNo).get()
    return idRes.data && idRes.data[0] ? idRes.data[0] : null
  } catch (e) {
    return null
  }
}

const INVOICE_STATUS = ['无需开票', '待开票', '开具中', '已开具']

module.exports = {
  async _before() {
    // 从 HTTP 请求或普通调用中获取 token
    let token
    const httpInfo = this.getHttpInfo && this.getHttpInfo()
    if (httpInfo && httpInfo.body) {
      const body = JSON.parse(httpInfo.body)
      token = body.token
    } else {
      const params = this.getParams()[0] || {}
      token = params.token
    }
    await verifyAdminToken(token)
  },

  // 获取后台工单列表（支持筛选/分页）
  async getAdminOrderList(params) {
    try {
      let status, page = 1, pageSize = 20
      if (params && params.status !== undefined) {
        ({ status, page = 1, pageSize = 20 } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ status, page = 1, pageSize = 20 } = body)
        }
      }
      if (status && !ORDER_STATUS.includes(status)) return { code: -1, msg: '工单状态不正确' }
      const pagination = normalizePage(page, pageSize)

      // 构建匹配条件
      const matchCond = {}
      if (status) matchCond.status = status

      // 使用聚合查询联表获取工单项目
      const res = await db.collection('cicada_orders')
        .aggregate()
        .match(matchCond)
        .sort({ create_time: -1 })
        .skip((pagination.page - 1) * pagination.pageSize)
        .limit(pagination.pageSize)
        .lookup({
          from: 'cicada_order_items',
          localField: '_id',
          foreignField: 'order_id',
          as: 'itemsList'
        })
        .end()

      // 处理返回数据，提取第一项的字段到外层
      const orders = res.data.map(order => {
        // 提取 lookup 关联到的第一条详情数据
        const itemDetail = (order.itemsList && order.itemsList.length > 0) ? order.itemsList[0] : {}

        return {
          ...order,
          // 把详情里的字段平铺到最外层
          product_name: itemDetail.product_name || '',
          product_model: itemDetail.product_model || '',
          fault_desc: itemDetail.fault_desc || '',
          media_urls: itemDetail.media_urls || [],
          sn: itemDetail.sn || '',
          buy_date: itemDetail.buy_date || '',
          fix_solution: itemDetail.fix_solution || '',
          // 保留原始的 itemsList 数组供前端使用
          itemsList: order.itemsList || []
        }
      })

      return { code: 0, data: orders }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 获取单条订单详情
  async getAdminOrderDetail(params) {
    try {
      let order_id
      if (params && params.order_id) {
        ({ order_id } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ order_id } = body)
        }
      }
      if (!order_id) return { code: -1, msg: '缺少工单ID' }

      // 使用聚合查询联表获取工单项目
      const res = await db.collection('cicada_orders')
        .aggregate()
        .match({ _id: order_id })
        .lookup({
          from: 'cicada_order_items',
          localField: '_id',
          foreignField: 'order_id',
          as: 'itemsList'
        })
        .end()

      if (!res.data || res.data.length === 0) {
        return { code: -1, msg: '工单不存在' }
      }

      const order = res.data[0]
      const itemDetail = (order.itemsList && order.itemsList.length > 0) ? order.itemsList[0] : {}

      const orderData = {
        ...order,
        product_name: itemDetail.product_name || '',
        product_model: itemDetail.product_model || '',
        fault_desc: itemDetail.fault_desc || '',
        media_urls: itemDetail.media_urls || [],
        sn: itemDetail.sn || '',
        buy_date: itemDetail.buy_date || '',
        fix_solution: itemDetail.fix_solution || '',
        itemsList: order.itemsList || []
      }

      return { code: 0, data: orderData }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 分配工程师
  async assignEngineer(params) {
    try {
      let order_id, engineer_id
      if (params && params.order_id) {
        ({ order_id, engineer_id } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ order_id, engineer_id } = body)
        }
      }
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      await verifyEngineer(engineer_id)
      const res = await db.collection('cicada_orders').doc(order_id).update({
        engineer_id,
        update_time: Date.now()
      })
      if (!res.updated) return { code: -1, msg: '工单不存在' }
      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 更新工单状态
  async updateOrderStatus(params) {
    try {
      let order_id, status
      if (params && params.order_id) {
        ({ order_id, status } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ order_id, status } = body)
        }
      }
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      if (!ORDER_STATUS.includes(status)) return { code: -1, msg: '工单状态不正确' }
      const res = await db.collection('cicada_orders').doc(order_id).update({
        status,
        update_time: Date.now()
      })
      if (!res.updated) return { code: -1, msg: '工单不存在' }
      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 批量导入回寄运单号，按工单号匹配并更新回寄物流信息
  async batchImportReturnLogistics(params) {
    try {
      const { rows } = pickParam(this, params)
      const normalizedRows = normalizeImportRows(rows)
      if (!normalizedRows.length) {
        return { code: -1, msg: '导入数据不能为空' }
      }

      const results = []
      const seen = new Set()
      const validRows = []

      for (const item of normalizedRows) {
        if (!item.order_no) {
          results.push({ ...item, success: false, reason: '缺少工单编号' })
          continue
        }
        if (!item.logistics_no) {
          results.push({ ...item, success: false, reason: '缺少回寄运单号' })
          continue
        }
        if (seen.has(item.order_no)) {
          results.push({ ...item, success: false, reason: 'Excel中工单编号重复' })
          continue
        }
        seen.add(item.order_no)
        validRows.push(item)
      }

      const now = Date.now()
      for (const item of validRows) {
        const found = await db.collection('cicada_orders')
          .where({ order_no: item.order_no })
          .limit(1)
          .get()
        const order = found.data[0]

        if (!order) {
          results.push({ ...item, success: false, reason: '工单不存在' })
          continue
        }

        const shipBackInfo = buildShipBackInfo(order, item, now)
        const timeline = Array.isArray(order.timeline) ? order.timeline : []
        const timelineText = `${item.logistics_company || '物流'} ${item.logistics_no}`
        const updateData = {
          ship_back_info: shipBackInfo,
          status: 'shipped',
          timeline: [
            ...timeline,
            {
              title: '回寄发货',
              desc: timelineText,
              time: now,
              done: true
            }
          ],
          update_time: now
        }

        const res = await db.collection('cicada_orders').doc(order._id).update(updateData)
        if (!res.updated) {
          results.push({ ...item, success: false, reason: '更新失败' })
          continue
        }

        results.push({
          ...item,
          order_id: order._id,
          success: true,
          reason: '已更新'
        })
      }

      const successCount = results.filter(item => item.success).length
      const failCount = results.length - successCount
      return {
        code: 0,
        data: {
          total: results.length,
          successCount,
          failCount,
          results
        }
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 批量回寄发货，按工单编号更新回寄物流并将状态置为已发货
  async batchUpdateShipping(params) {
    try {
      const { shippingList } = pickParam(this, params)
      const normalizedList = normalizeShippingList(shippingList)
      if (!normalizedList.length) {
        return { code: -1, msg: '导入数据不能为空' }
      }

      const summary = {
        total: normalizedList.length,
        success: 0,
        fail: 0,
        errors: []
      }
      const seen = new Set()
      const now = Date.now()

      for (const item of normalizedList) {
        if (!item.orderNo) {
          summary.fail += 1
          summary.errors.push({ orderNo: '-', reason: '缺少工单编号' })
          continue
        }
        if (!item.returnCompany) {
          summary.fail += 1
          summary.errors.push({ orderNo: item.orderNo, reason: '缺少物流公司' })
          continue
        }
        if (!item.returnNo) {
          summary.fail += 1
          summary.errors.push({ orderNo: item.orderNo, reason: '缺少物流单号' })
          continue
        }
        if (seen.has(item.orderNo)) {
          summary.fail += 1
          summary.errors.push({ orderNo: item.orderNo, reason: 'Excel中工单编号重复' })
          continue
        }
        seen.add(item.orderNo)

        const order = await findOrderByNo(item.orderNo)
        if (!order) {
          summary.fail += 1
          summary.errors.push({ orderNo: item.orderNo, reason: '工单不存在' })
          continue
        }

        const timeline = Array.isArray(order.timeline) ? order.timeline : []
        const updateData = {
          status: 'shipped',
          ship_back_info: buildReturnShippingInfo(order, item, now),
          timeline: [
            ...timeline,
            {
              title: '回寄发货',
              desc: `${item.returnCompany || '物流'} ${item.returnNo}`,
              time: now,
              done: true
            }
          ],
          update_time: now
        }

        const res = await db.collection('cicada_orders').doc(order._id).update(updateData)
        if (!res.updated) {
          summary.fail += 1
          summary.errors.push({ orderNo: item.orderNo, reason: '更新失败' })
          continue
        }

        summary.success += 1
      }

      return { code: 0, data: summary }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 更新工单备注：admin_remark 仅后台可见，print_remark 用于随件打印
  async updateRemarks(params) {
    try {
      const { orderId, order_id, adminRemark, printRemark } = pickParam(this, params)
      const targetOrderId = order_id || orderId
      if (!targetOrderId) return { code: -1, msg: '缺少工单ID' }

      const now = Date.now()
      const remarkData = {
        admin_remark: normalizeText(adminRemark),
        print_remark: normalizeText(printRemark),
        update_time: now
      }

      const res = await db.collection('cicada_orders').doc(targetOrderId).update(remarkData)
      if (!res.updated) return { code: -1, msg: '工单不存在' }

      return { code: 0, data: remarkData }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 内部开票状态登记；真实税控/财务系统开票需要后续对接第三方接口
  async updateInvoiceStatus(params) {
    try {
      const { order_id, status, invoice = {} } = pickParam(this, params)
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      if (!INVOICE_STATUS.includes(status)) return { code: -1, msg: '发票状态不正确' }

      const now = Date.now()
      const invoiceInfo = {
        need_invoice: status !== '无需开票',
        status,
        title: normalizeText(invoice.title),
        tax_no: normalizeText(invoice.tax_no || invoice.taxNo),
        remark: normalizeText(invoice.remark),
        update_time: now
      }

      const res = await db.collection('cicada_orders').doc(order_id).update({
        invoice_info: invoiceInfo,
        update_time: now
      })
      if (!res.updated) return { code: -1, msg: '工单不存在' }

      return { code: 0, data: invoiceInfo }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 追加工单时间线节点
  async addTimeline(params) {
    try {
      let order_id, title, desc
      if (params && params.order_id) {
        ({ order_id, title, desc } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ order_id, title, desc } = body)
        }
      }
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      if (!title || typeof title !== 'string') return { code: -1, msg: '时间线标题不能为空' }
      const res = await db.collection('cicada_orders').doc(order_id).update({
        timeline: dbCmd.push({ title, desc, time: Date.now(), done: true }),
        update_time: Date.now()
      })
      if (!res.updated) return { code: -1, msg: '工单不存在' }
      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 获取统计数据
  async getStatistics(params) {
    try {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime()

      const [pendingRes, todayRes] = await Promise.all([
        db.collection('cicada_orders').where({
          status: dbCmd.in(['pending', 'received'])
        }).count(),
        db.collection('cicada_orders').where({ create_time: dbCmd.gte(todayStart) }).count()
      ])

      return {
        code: 0,
        data: {
          pendingCount: pendingRes.total,
          todayCount: todayRes.total
        }
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 获取服务数据总结
  async getDashboardSummary(params) {
    try {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

      const [
        totalOrdersRes,
        completedOrdersRes,
        pendingOrdersRes,
        monthOrdersRes,
        totalFeedbacksRes,
        pendingFeedbacksRes
      ] = await Promise.all([
        db.collection('cicada_orders').count(),
        db.collection('cicada_orders').where({ status: 'completed' }).count(),
        db.collection('cicada_orders').where({ status: dbCmd.in(['pending', 'received']) }).count(),
        db.collection('cicada_orders').where({ create_time: dbCmd.gte(monthStart) }).count(),
        db.collection('cicada_feedbacks').count(),
        db.collection('cicada_feedbacks').where({ status: '待处理' }).count()
      ])

      return {
        code: 0,
        data: {
          totalOrders: totalOrdersRes.total || 0,
          completedOrders: completedOrdersRes.total || 0,
          pendingOrders: pendingOrdersRes.total || 0,
          monthOrders: monthOrdersRes.total || 0,
          totalFeedbacks: totalFeedbacksRes.total || 0,
          pendingFeedbacks: pendingFeedbacksRes.total || 0
        }
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  }
}
