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
      return { code: 0, data: res.data }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  // 获取工单详情
  async getOrderDetail({ token, order_id }) {
    try {
      const user = await verifyUserToken(token)
      if (!order_id) return { code: -1, msg: '缺少工单ID' }
      const [orderRes, itemsRes] = await Promise.all([
        db.collection('cicada_orders').where({ _id: order_id, user_id: user._id }).limit(1).get(),
        db.collection('cicada_order_items').where({ order_id }).get()
      ])
      if (!orderRes.data.length) return { code: -1, msg: '工单不存在或无权限' }
      return { code: 0, data: { ...orderRes.data[0], items: itemsRes.data } }
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
