// cicada-common — CICADA 项目公共工具模块
// 集中管理所有云函数间重复的通用函数
// 使用: const { pickFields, normalizeText, ... } = require('cicada-common')

const db = uniCloud.database()
const crypto = require('crypto')

// ═══════════════════════════════════════════
// 一、数据工具函数
// ═══════════════════════════════════════════

/** 从 source 对象中摘取指定字段 */
function pickFields(source = {}, fields = []) {
  return fields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field]
    }
    return result
  }, {})
}

/** 标准化文本（去首尾空格，null/undefined 转空字符串） */
function normalizeText(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

/** 标准化布尔值 */
function normalizeBool(value) {
  return value === true
}

/** 标准化数组（过滤假值） */
function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

/** 标准化身份标识（去空格、转小写） */
function normalizeIdentity(value = '') {
  return String(value || '').trim().toLowerCase()
}

/** 标准化分页参数 */
function normalizePage(page, pageSize, maxSize = 50) {
  const current = Math.max(Number(page) || 1, 1)
  const size = Math.min(Math.max(Number(pageSize) || 10, 1), maxSize)
  return { page: current, pageSize: size }
}

/** 获取文件扩展名 */
function getFileExt(fileName = '') {
  const cleanName = String(fileName || '').split('?')[0]
  const match = cleanName.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : ''
}

// ═══════════════════════════════════════════
// 二、IP 获取（防伪造）
// ═══════════════════════════════════════════

/** 获取客户端真实 IP，优先从 uniCloud HTTP 上下文获取 */
function getClientIp(ctx) {
  const httpInfo = ctx && ctx.getHttpInfo && ctx.getHttpInfo()
  const headers = (httpInfo && httpInfo.headers) || {}
  const forwardedFor = headers['x-forwarded-for'] || headers['X-Forwarded-For'] || ''
  const forwardedIp = String(forwardedFor).split(',')[0].trim()
  return forwardedIp ||
    headers['x-real-ip'] ||
    headers['X-Real-IP'] ||
    (httpInfo && (httpInfo.clientIP || httpInfo.clientIp || httpInfo.remoteAddress)) ||
    (ctx && ctx.getClientInfo ? (ctx.getClientInfo().clientIP || ctx.getClientInfo().ip) : '') ||
    'unknown'
}

// ═══════════════════════════════════════════
// 三、密码学 & 认证
// ═══════════════════════════════════════════

/** 生成随机 token（64字符 hex） */
function genToken() {
  return crypto.randomBytes(32).toString('hex')
}

/** 生成密码盐值 */
function genSalt() {
  return crypto.randomBytes(16).toString('hex')
}

/** PBKDF2-SHA512 密码哈希 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex')
}

/** 构建密码存储字段（哈希+盐） */
function buildPasswordFields(password) {
  const password_salt = genSalt()
  return {
    password_hash: hashPassword(password, password_salt),
    password_salt,
    password: '' // 清除明文
  }
}

/** 验证密码（支持哈希验证 + 兼容历史明文迁移） */
function verifyPassword(user, password) {
  if (!password) return false
  if (user.password_hash && user.password_salt) {
    const inputHash = hashPassword(password, user.password_salt)
    const inputBuffer = Buffer.from(inputHash)
    const storedBuffer = Buffer.from(user.password_hash)
    return inputBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(inputBuffer, storedBuffer)
  }
  // 兼容历史明文密码账号（登录成功后应迁移为哈希存储）
  return user.password === password
}

// ═══════════════════════════════════════════
// 四、频率限制
// ═══════════════════════════════════════════

/** 获取频率限制记录 */
async function getRateLimitRecord(key) {
  const res = await db.collection('cicada_rate_limits').where({ key }).limit(1).get()
  return res.data && res.data[0]
}

/** 记录一次频率限制命中 */
async function recordRateLimitHit(scope, identity, windowMs = 5 * 60 * 1000) {
  const normalized = normalizeIdentity(identity)
  if (!normalized) return

  const now = Date.now()
  const key = `${scope}:${normalized}`
  const col = db.collection('cicada_rate_limits')
  const record = await getRateLimitRecord(key)

  if (!record || now > record.reset_time) {
    const nextData = {
      key,
      scope,
      identity: normalized,
      count: 1,
      reset_time: now + windowMs,
      update_time: now
    }
    if (record) {
      await col.doc(record._id).update(nextData)
    } else {
      await col.add({ ...nextData, create_time: now })
    }
    return
  }

  await col.doc(record._id).update({
    count: db.command.inc(1),
    update_time: now
  })
}

/** 通用频率限制检查 */
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

/** 清除频率限制记录 */
async function clearRateLimit(scope, identity) {
  const normalized = normalizeIdentity(identity)
  if (!normalized) return
  const record = await getRateLimitRecord(`${scope}:${normalized}`)
  if (record) await db.collection('cicada_rate_limits').doc(record._id).remove()
}

// ═══════════════════════════════════════════
// 五、统一 Token 验证
// ═══════════════════════════════════════════

/** Token 验证失败频率限制参数 */
const TOKEN_VERIFY_FAIL_LIMIT = { windowMs: 5 * 60 * 1000, max: 30 }

/**
 * 验证管理员 Token（统一实现，替代各云函数的 4 个分散版本）
 * @param {string} token - 鉴权 token
 * @param {string[]} allowedRoles - 允许的角色列表，默认 ['admin']
 * @param {object} ctx - 云函数上下文（用于 IP 限频），可选
 * @returns {object} 用户对象
 */
async function verifyAdminToken(token, allowedRoles = ['admin'], ctx) {
  if (!token) throw new Error('鉴权失败')
  const res = await db.collection('cicada_users').where({ token }).limit(1).get()
  const user = res.data[0]

  const isValid = user && !user.disabled &&
    (allowedRoles.length === 0 || allowedRoles.includes(user.role)) &&
    user.token_expire && Date.now() <= user.token_expire

  if (!isValid) {
    // 记录失败次数，防止暴力枚举 token
    if (ctx) {
      const clientIp = getClientIp(ctx)
      await recordRateLimitHit('token-verify', clientIp)
      const record = await getRateLimitRecord(`token-verify:${normalizeIdentity(clientIp)}`)
      if (record && record.count >= TOKEN_VERIFY_FAIL_LIMIT.max && Date.now() <= record.reset_time) {
        throw new Error('验证次数过多，请 5 分钟后再试')
      }
    }
    throw new Error('鉴权失败')
  }
  return user
}

/**
 * 验证用户 Token（客户端）
 * @param {string} token - 鉴权 token
 * @returns {object} 用户对象
 */
async function verifyUserToken(token) {
  if (!token) throw new Error('鉴权失败')
  const res = await db.collection('cicada_users').where({ token }).limit(1).get()
  const user = res.data[0]
  if (!user || user.disabled) throw new Error('鉴权失败')
  if (!user.token_expire || Date.now() > user.token_expire) throw new Error('Token已过期')
  return user
}

// ═══════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════

module.exports = {
  // 数据工具
  pickFields,
  normalizeText,
  normalizeBool,
  normalizeArray,
  normalizeIdentity,
  normalizePage,
  getFileExt,
  // IP
  getClientIp,
  // 密码学
  genToken,
  genSalt,
  hashPassword,
  buildPasswordFields,
  verifyPassword,
  // 频率限制
  getRateLimitRecord,
  recordRateLimitHit,
  checkRateLimit,
  clearRateLimit,
  TOKEN_VERIFY_FAIL_LIMIT,
  // Token 验证
  verifyAdminToken,
  verifyUserToken
}
