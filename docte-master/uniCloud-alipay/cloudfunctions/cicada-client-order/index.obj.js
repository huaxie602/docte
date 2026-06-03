const db = uniCloud.database()
const crypto = require('crypto')

const CREATE_ORDER_LIMIT = { windowMs: 60 * 1000, max: 8 }

async function verifyUserToken(token) {
  if (!token) throw new Error('鉴权失败')
  const res = await db.collection('cicada_users').where({ token }).limit(1).get()
  const user = res.data[0]
  if (!user || user.disabled) throw new Error('鉴权失败')
  if (!user.token_expire || Date.now() > user.token_expire) throw new Error('Token已过期')
  return user
}

function pickFields(source = {}, fields = []) {
  return fields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field]
    }
    return result
  }, {})
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizePage(page, pageSize) {
  const current = Math.max(Number(page) || 1, 1)
  const size = Math.min(Math.max(Number(pageSize) || 10, 1), 50)
  return { page: current, pageSize: size }
}

function normalizeText(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

function normalizePhoneLast4(value) {
  return normalizeText(value).replace(/\D/g, '').slice(-4)
}

function formatTimelineTime(value) {
  if (!value) return ''
  if (typeof value === 'number') {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = n => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  return String(value)
}

function normalizeOrderTimeline(timeline = []) {
  if (!Array.isArray(timeline)) return []
  return timeline.map(item => ({
    title: item.title || item.statusText || '包裹状态更新',
    desc: item.desc || item.description || item.content || '',
    time: formatTimelineTime(item.time || item.createTime || item.updateTime),
    pending: Boolean(item.pending)
  }))
}

function getShipInfo(order = {}, type = 'out') {
  const info = type === 'back' ? (order.ship_back_info || {}) : (order.ship_out_info || {})
  return {
    company: info.logistics_company || info.logisticsCompany || info.returnCompany || info.return_company || '',
    trackingNo: info.logistics_no || info.logisticsNo || info.returnNo || info.return_no || '',
    shippedAt: info.shipped_at || info.shippedAt || order.create_time || ''
  }
}

function getPackageStatus(order = {}) {
  const status = order.status || 'pending'
  if (status === 'completed') return { status: 5, statusText: '已完成', tone: 'ok', reached: 4 }
  if (status === 'shipped') return { status: 4, statusText: '已关联工单', tone: 'ok', reached: 4 }
  if (['inspecting', 'fixing'].includes(status)) return { status: 3, statusText: '处理中', tone: 'warn', reached: 3 }
  if (status === 'received') return { status: 2, statusText: '已登记待检测', tone: 'warn', reached: 2 }
  return { status: 1, statusText: '已提交待签收', tone: 'warn', reached: 1 }
}

function buildPackageTimeline(order = {}, matchedType = 'out', fullAccess = false) {
  const shipInfo = getShipInfo(order, matchedType)
  const rows = [
    {
      title: matchedType === 'back' ? '回寄发货' : '客户寄出',
      desc: `${shipInfo.company || '物流'} ${shipInfo.trackingNo}`.trim(),
      time: formatTimelineTime(shipInfo.shippedAt),
      pending: false
    }
  ]

  if (order.status && order.status !== 'pending') {
    rows.push({
      title: '售后已登记',
      desc: `已关联工单 ${order.order_no || order._id || ''}`.trim(),
      time: formatTimelineTime(order.update_time || order.create_time),
      pending: false
    })
  }

  if (fullAccess) {
    rows.push(...normalizeOrderTimeline(order.timeline))
  } else {
    rows.push({
      title: '隐私保护',
      desc: '填写收件人手机号后四位后，可查看完整处理记录。',
      time: '',
      pending: true
    })
  }

  return rows
}

async function findOrderByTrackingNo(trackingNo) {
  const checks = [
    { field: 'ship_out_info.logistics_no', type: 'out' },
    { field: 'ship_out_info.logisticsNo', type: 'out' },
    { field: 'ship_back_info.logistics_no', type: 'back' },
    { field: 'ship_back_info.logisticsNo', type: 'back' },
    { field: 'ship_back_info.return_no', type: 'back' },
    { field: 'ship_back_info.returnNo', type: 'back' }
  ]

  for (const item of checks) {
    const res = await db.collection('cicada_orders')
      .where({ [item.field]: trackingNo })
      .limit(1)
      .get()
    if (res.data && res.data[0]) {
      return { order: res.data[0], matchedType: item.type }
    }
  }

  return null
}

function genOrderNo() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  const datePart = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return 'DR' + datePart + crypto.randomBytes(4).toString('hex').toUpperCase()
}

async function checkRateLimit(scope, identity, config) {
  if (!identity || !config) return

  const now = Date.now()
  const key = `${scope}:${identity}`
  const col = db.collection('cicada_rate_limits')
  const found = await col.where({ key }).limit(1).get()
  const record = found.data[0]

  if (!record || now > record.reset_time) {
    if (record) {
      await col.doc(record._id).update({
        count: 1,
        reset_time: now + config.windowMs,
        update_time: now
      })
    } else {
      await col.add({
        key,
        scope,
        identity,
        count: 1,
        reset_time: now + config.windowMs,
        create_time: now,
        update_time: now
      })
    }
    return
  }

  if (record.count >= config.max) {
    throw new Error('操作过于频繁，请稍后再试')
  }

  await col.doc(record._id).update({
    count: db.command.inc(1),
    update_time: now
  })
}

module.exports = {
  _before() {},

  async queryPackageStatus({ token = '', trackingNo = '', phoneLast4 = '' }) {
    try {
      const normalizedTrackingNo = normalizeText(trackingNo).replace(/\s/g, '')
      if (!normalizedTrackingNo) return { code: -1, msg: '请输入快递单号' }
      if (!/^[A-Za-z0-9-]{6,40}$/.test(normalizedTrackingNo)) {
        return { code: -1, msg: '快递单号格式不正确' }
      }

      const found = await findOrderByTrackingNo(normalizedTrackingNo)
      if (!found || !found.order) return { code: 0, data: null }

      const { order, matchedType } = found
      const shipBackInfo = order.ship_back_info || {}
      const storedLast4 = normalizePhoneLast4(
        shipBackInfo.phone || shipBackInfo.mobile || shipBackInfo.receiverPhone || shipBackInfo.receiver_phone
      )
      const inputLast4 = normalizePhoneLast4(phoneLast4)
      let isOwner = false

      if (token) {
        try {
          const user = await verifyUserToken(token)
          isOwner = user && order.user_id === user._id
        } catch (e) {
          isOwner = false
        }
      }

      const fullAccess = Boolean(isOwner || (storedLast4 && inputLast4 && storedLast4 === inputLast4))
      const matchedInfo = getShipInfo(order, matchedType)
      const statusMeta = getPackageStatus(order)

      return {
        code: 0,
        data: {
          trackingNo: normalizedTrackingNo,
          company: matchedInfo.company,
          orderId: fullAccess ? (order.order_no || order._id || '') : '',
          status: statusMeta.status,
          statusText: statusMeta.statusText,
          tone: statusMeta.tone,
          reached: statusMeta.reached,
          timeline: buildPackageTimeline(order, matchedType, fullAccess)
        }
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async createOrder(params) {
    let orderId = ''
    try {
      const { token, ship_out_info, ship_back_info, items } = params
      const user = await verifyUserToken(token)
      await checkRateLimit('create-order', user._id, CREATE_ORDER_LIMIT)
      if (!Array.isArray(items) || items.length === 0) {
        return { code: -1, msg: '请至少提交一个维修产品' }
      }
      if (items.some(item => !item || !item.product_name)) {
        return { code: -1, msg: '产品名称不能为空' }
      }

      const now = Date.now()
      const order_no = genOrderNo()
      const orderRes = await db.collection('cicada_orders').add({
        order_no,
        user_id: user._id,
        status: 'pending',
        ship_out_info,
        ship_back_info,
        engineer_id: '',
        total_price: 0,
        timeline: [{ title: '提交报修单', desc: '您的报修申请已提交，等待客服审核', time: now, done: true }],
        update_time: now,
        create_time: now
      })

      orderId = orderRes.id

      await Promise.all(items.map(item => {
        const data = pickFields(item, [
          'product_name',
          'product_model',
          'sn',
          'buy_date',
          'fault_desc',
          'media_urls',
          'voucher_urls',
          'image_urls',
          'video_urls',
          'fix_solution'
        ])
        data.media_urls = normalizeArray(data.media_urls)
        data.voucher_urls = normalizeArray(data.voucher_urls)
        data.image_urls = normalizeArray(data.image_urls)
        data.video_urls = normalizeArray(data.video_urls)
        return db.collection('cicada_order_items').add({ ...data, order_id: orderId })
      }))

      return { code: 0, msg: '提交成功', data: { order_id: orderId, order_no } }
    } catch (e) {
      if (orderId) {
        await Promise.all([
          db.collection('cicada_orders').doc(orderId).remove(),
          db.collection('cicada_order_items').where({ order_id: orderId }).remove()
        ]).catch(() => {})
      }
      return { code: -1, msg: e.message }
    }
  },

  // 获取工单列表
  async getOrderList({ token, page = 1, pageSize = 10 }) {
    try {
      const user = await verifyUserToken(token)
      const pagination = normalizePage(page, pageSize)
      const res = await db.collection('cicada_orders')
        .where({ user_id: user._id })
        .orderBy('create_time', 'desc')
        .skip((pagination.page - 1) * pagination.pageSize)
        .limit(pagination.pageSize)
        .get()

      const orders = await Promise.all(res.data.map(async order => {
        const itemKeys = [order._id, order.order_no].filter(Boolean)
        const itemRes = itemKeys.length
          ? await db.collection('cicada_order_items')
            .where({ order_id: db.command.in(itemKeys) })
            .limit(20)
            .get()
          : { data: [] }
        const items = itemRes.data || []
        const firstItem = items[0] || {}
        const shipOutInfo = order.ship_out_info || {}
        return {
          ...order,
          items,
          product_name: firstItem.product_name || '',
          product_model: firstItem.product_model || '',
          fault_desc: firstItem.fault_desc || '',
          sn: firstItem.sn || '',
          buy_date: firstItem.buy_date || '',
          logistics_company: shipOutInfo.logistics_company || '',
          logistics_no: shipOutInfo.logistics_no || ''
        }
      }))

      return { code: 0, data: orders }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 获取工单详情
  async getOrderDetail({ token, order_id }) {
    try {
      const user = await verifyUserToken(token)
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      const orderRes = await db.collection('cicada_orders')
        .where({ _id: order_id, user_id: user._id })
        .limit(1)
        .get()
      if (!orderRes.data.length) return { code: -1, msg: '工单不存在或无权限' }
      const order = orderRes.data[0]
      const itemKeys = [order._id, order.order_no].filter(Boolean)
      const itemsRes = itemKeys.length
        ? await db.collection('cicada_order_items')
          .where({ order_id: db.command.in(itemKeys) })
          .get()
        : { data: [] }
      return { code: 0, data: { ...order, items: itemsRes.data } }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 取消工单（仅限 pending/received 状态）
  async cancelOrder({ token, order_id, reason = '' }) {
    try {
      const user = await verifyUserToken(token)
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      const found = await db.collection('cicada_orders')
        .where({ _id: order_id, user_id: user._id }).limit(1).get()
      if (!found.data.length) return { code: -1, msg: '工单不存在或无权限' }
      if (!['pending', 'received'].includes(found.data[0].status)) {
        return { code: -1, msg: '当前状态不可取消' }
      }
      const now = Date.now()
      await db.collection('cicada_orders').doc(order_id).update({
        status: 'cancelled',
        timeline: db.command.push({ title: '已取消', desc: reason || '用户主动取消', time: now, done: true }),
        update_time: now
      })
      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  }
}
