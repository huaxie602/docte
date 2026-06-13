const db = uniCloud.database()
const { ROLE_LABELS, ALL_ROLES } = require('cicada-order-workflow')
const { pickFields, getFileExt, genToken, genSalt, hashPassword, buildPasswordFields, verifyPassword, getClientIp, normalizeIdentity, getRateLimitRecord, recordRateLimitHit, clearRateLimit, verifyAdminToken, TOKEN_VERIFY_FAIL_LIMIT } = require('cicada-common')

const ADMIN_TOKEN_EXPIRE = 8 * 3600 * 1000 // 8小时
const STAFF_ROLES = ALL_ROLES
const ADMIN_LOGIN_RATE_LIMIT = {
  max: 5,
  windowMs: 15 * 60 * 1000
}
const GUIDE_DEFAULTS = [
  {
    type: 'quick',
    category: '快速指南',
    desc: '跳转到图文并茂的快速入门文档，帮助用户快速了解小程序售后流程。',
    file_name: '',
    file_url: '',
    sort: 1
  },
  {
    type: 'repair',
    category: '报修指南',
    desc: '跳转到图文并茂的报修文档，说明报修流程、寄出注意事项和进度查询方式。',
    file_name: '',
    file_url: '',
    sort: 2
  },
  {
    type: 'query',
    category: '查询指南',
    desc: '跳转到图文并茂的查询文档，说明工单、物流和维修进度查询方式。',
    file_name: '',
    file_url: '',
    sort: 3
  },
  {
    type: 'invoice',
    category: '开票指南',
    desc: '跳转到图文并茂的开票文档，说明发票申请、资料填写和开票进度查看方式。',
    file_name: '',
    file_url: '',
    sort: 4
  }
]
const GUIDE_TYPE_ALIASES = {
  quick: ['快速指南', '快速入门'],
  repair: ['报修指南', '报修流程'],
  query: ['查询指南', '查询办法', '维修查询', '物流寄送'],
  invoice: ['开票指南', '发票开具']
}
const SURVEY_POSTER_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
const SURVEY_POSTER_IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const SURVEY_POSTER_TYPE_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

// 校验图片文件魔术字节，防止 MIME 类型伪装攻击
function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 4) return false
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true
  // WEBP: 52 49 46 46 ... 57 45 42 50 (RIFF....WEBP)
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true
  // GIF: 47 49 46 38 (GIF8)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true
  return false
}

function sanitizeFileName(fileName = '', fallback = 'upload') {
  return String(fileName || fallback).replace(/[\\/:*?"<>|]/g, '_') || fallback
}

function normalizeBase64Content(fileContent = '') {
  return String(fileContent || '').replace(/^data:[^;]+;base64,/, '')
}

function matchGuideType(item = {}) {
  const type = String(item.type || '').trim()
  if (GUIDE_TYPE_ALIASES[type]) return type

  const category = String(item.category || '')
  const matched = Object.entries(GUIDE_TYPE_ALIASES)
    .find(([, aliases]) => aliases.some(alias => category.includes(alias)))
  return matched ? matched[0] : ''
}

async function ensureGuideDefaults() {
  const col = db.collection('cicada_guides')
  const res = await col.get()
  const existingTypes = new Set((res.data || []).map(matchGuideType).filter(Boolean))
  const now = Date.now()

  for (const guide of GUIDE_DEFAULTS) {
    if (!existingTypes.has(guide.type)) {
      await col.add({ ...guide, update_time: now })
      existingTypes.add(guide.type)
    }
  }
}

async function assertAdminLoginAllowed(username, ip) {
  const identities = [
    { scope: 'admin-login:username', identity: normalizeIdentity(username) },
    { scope: 'admin-login:ip', identity: normalizeIdentity(ip) }
  ].filter(item => item.identity)
  const now = Date.now()

  for (const item of identities) {
    const record = await getRateLimitRecord(`${item.scope}:${item.identity}`)
    if (record && now <= record.reset_time && record.count >= ADMIN_LOGIN_RATE_LIMIT.max) {
      throw new Error('登录失败次数过多，请 15 分钟后再试')
    }
  }
}

async function recordAdminLoginFailure(username, ip, userId = '') {
  await Promise.all([
    recordRateLimitHit('admin-login:username', username),
    recordRateLimitHit('admin-login:ip', ip)
  ])

  if (userId) {
    await db.collection('cicada_users').doc(userId).update({
      failed_login_count: db.command.inc(1),
      last_failed_login: Date.now(),
      last_login_ip: ip
    })
  }
}

async function clearAdminLoginFailures(username, ip) {
  await Promise.all([
    clearRateLimit('admin-login:username', username),
    clearRateLimit('admin-login:ip', ip)
  ])
}

module.exports = {
  _before() {
    // 处理 HTTP 请求参数
    const httpInfo = this.getHttpInfo && this.getHttpInfo()
    if (httpInfo && httpInfo.body) {
      try {
        const body = JSON.parse(httpInfo.body)
        this.params = body
      } catch (e) {
        console.error('解析请求体失败:', e)
      }
    }
  },

  async adminLogin(params) {
    try {
      // 从 HTTP 请求中获取参数
      let username, password
      if (params && params.username) {
        ({ username, password } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ username, password } = body)
        }
      }
      const loginIp = getClientIp(this)
      if (!username || !password) return { code: -1, msg: '用户名或密码错误' }
      await assertAdminLoginAllowed(username, loginIp)
      const res = await db.collection('cicada_users')
        .where({ username })
        .limit(1)
        .get()
      if (!res.data.length) {
        await recordAdminLoginFailure(username, loginIp)
        return { code: -1, msg: '用户名或密码错误' }
      }

      const user = res.data[0]
      if (!STAFF_ROLES.includes(user.role) || user.disabled) {
        await recordAdminLoginFailure(username, loginIp, user._id)
        return { code: -1, msg: '无管理权限' }
      }
      const pwdCheck = verifyPassword(user, password)
      if (!pwdCheck) {
        await recordAdminLoginFailure(username, loginIp, user._id)
        return { code: -1, msg: '用户名或密码错误' }
      }

      const token = genToken()
      const tokenExpire = Date.now() + ADMIN_TOKEN_EXPIRE
      const updateData = {
        token,
        token_expire: tokenExpire,
        last_login: Date.now(),
        last_login_ip: loginIp,
        failed_login_count: 0
      }
      if (!user.password_hash || !user.password_salt) {
        Object.assign(updateData, buildPasswordFields(password))
      }
      await db.collection('cicada_users').doc(user._id).update(updateData)
      await clearAdminLoginFailures(username, loginIp)

      return {
        code: 0,
        msg: '登录成功',
        token: token,
        userId: user._id,
        role: user.role,
        isAdmin: user.role === 'admin',
        isEngineer: user.role === 'engineer',
        isFinance: user.role === 'finance',
        isSupport: user.role === 'support',
        user: {
          _id: user._id,
          username: user.username,
          name: user.name || user.nickname || '',
          phone: user.phone || '',
          role: user.role,
          roleDisplay: ROLE_LABELS[user.role] || user.role
        }
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async changeMyPassword(params) {
    try {
      let token, oldPassword, newPassword
      if (params && params.token) {
        ({ token, oldPassword, newPassword } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ token, oldPassword, newPassword } = body)
        }
      }

      if (!oldPassword || !newPassword) return { code: -1, msg: '请填写原密码和新密码' }
      if (String(newPassword).length < 6) return { code: -1, msg: '新密码至少需要 6 位' }
      if (oldPassword === newPassword) return { code: -1, msg: '新密码不能与原密码相同' }

      const user = await verifyAdminToken(token, STAFF_ROLES, this)
      if (!verifyPassword(user, oldPassword)) return { code: -1, msg: '原密码不正确' }

      await db.collection('cicada_users').doc(user._id).update({
        ...buildPasswordFields(newPassword),
        token: '',
        token_expire: 0,
        update_time: Date.now()
      })

      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async resetUserPassword(params) {
    try {
      let token, userId
      if (params && params.token) {
        ({ token, userId } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ token, userId } = body)
        }
      }

      if (!userId) return { code: -1, msg: '缺少用户ID' }
      await verifyAdminToken(token, ['admin'], this)

      const col = db.collection('cicada_users')
      const targetRes = await col.doc(userId).get()
      const target = targetRes.data && targetRes.data[0]
      if (!target || !STAFF_ROLES.includes(target.role)) return { code: -1, msg: '用户不存在' }
      if (target.username === 'admin_root') return { code: -1, msg: 'admin_root 为紧急救援账号，禁止重置密码' }

      await col.doc(userId).update({
        ...buildPasswordFields('123456'),
        token: '',
        token_expire: 0,
        update_time: Date.now()
      })

      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async manageStaff(params) {
    try {
      let token, action, staff
      if (params && params.token) {
        ({ token, action, staff } = params)
      } else {
        const httpInfo = this.getHttpInfo && this.getHttpInfo()
        if (httpInfo && httpInfo.body) {
          const body = JSON.parse(httpInfo.body)
          ;({ token, action, staff } = body)
        }
      }
      await verifyAdminToken(token, ['admin'], this)
      const col = db.collection('cicada_users')
      if (action === 'add') {
        if (!staff || !staff.username || !staff.password) return { code: -1, msg: '账号和密码不能为空' }
        if (!STAFF_ROLES.includes(staff.role)) return { code: -1, msg: '角色不正确' }
        const exists = await col.where({ username: staff.username }).limit(1).get()
        if (exists.data.length) return { code: -1, msg: '账号已存在' }
        const data = pickFields(staff, ['username', 'name', 'phone', 'avatar', 'role'])
        const res = await col.add({
          ...data,
          openid: '',
          disabled: false,
          ...buildPasswordFields(staff.password),
          create_time: Date.now()
        })
        return { code: 0, data: { id: res.id } }
      } else if (action === 'edit') {
        if (!staff || !staff._id) return { code: -1, msg: '缺少员工ID' }
        const data = pickFields(staff, ['username', 'name', 'phone', 'avatar', 'role', 'disabled'])
        if (data.role && !STAFF_ROLES.includes(data.role)) return { code: -1, msg: '角色不正确' }
        if (staff.password) Object.assign(data, buildPasswordFields(staff.password))
        if (!Object.keys(data).length) return { code: -1, msg: '没有可更新的员工字段' }
        const res = await col.where({ _id: staff._id, role: db.command.in(STAFF_ROLES) }).update(data)
        if (!res.updated) return { code: -1, msg: '员工不存在' }
        return { code: 0 }
      } else if (action === 'disable') {
        if (!staff || !staff._id) return { code: -1, msg: '缺少员工ID' }
        const disabled = staff.disabled !== undefined ? staff.disabled : true
        const res = await col.where({ _id: staff._id, role: db.command.in(STAFF_ROLES) }).update({ disabled })
        if (!res.updated) return { code: -1, msg: '员工不存在' }
        return { code: 0 }
      } else {
        const list = await col.where({ role: db.command.in(STAFF_ROLES) }).get()
        const data = list.data.map(({ password, password_hash, password_salt, token, token_expire, ...staffInfo }) => staffInfo)
        return { code: 0, data }
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getFeedbackStats(params) {
    try {
      let token
      if (params && params.token) {
        ({ token } = params)
      } else if (this.params) {
        ({ token } = this.params)
      }
      await verifyAdminToken(token, ['admin', 'engineer'], this)
      const res = await db.collection('cicada_feedbacks').where({ status: '待处理' }).count()
      return { code: 0, data: { unreadCount: res.total } }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getFeedbackList(params) {
    try {
      let token, status
      if (params && params.token) {
        ({ token, status } = params)
      } else if (this.params) {
        ({ token, status } = this.params)
      }
      await verifyAdminToken(token, ['admin', 'engineer'], this)

      const where = {}
      if (status && status !== '全部') {
        where.status = status
      }

      const res = await db.collection('cicada_feedbacks')
        .where(where)
        .orderBy('create_time', 'desc')
        .get()

      return { code: 0, data: res.data }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async handleFeedback(params) {
    try {
      let token, feedbackId, replyText, remark
      if (params && params.token) {
        ({ token, feedbackId, replyText, remark } = params)
      } else if (this.params) {
        ({ token, feedbackId, replyText, remark } = this.params)
      }
      const user = await verifyAdminToken(token, ['admin', 'engineer'], this)

      const targetId = String(feedbackId || '').trim()
      const handleRemark = String(remark || replyText || '').trim()
      if (!targetId) return { code: -1, msg: '缺少反馈ID' }
      if (!handleRemark) return { code: -1, msg: '请填写处理备注' }
      if (handleRemark.length > 500) return { code: -1, msg: '处理备注不能超过500字' }

      const col = db.collection('cicada_feedbacks')
      const now = Date.now()
      const updateData = {
        status: '已处理',
        handle_remark: handleRemark,
        handle_time: now,
        handle_user_id: user._id,
        handle_user_name: user.name || user.nickname || user.username || '',
        update_time: now
      }
      const res = await col.doc(targetId).update(updateData)
      if (!res.updated) return { code: -1, msg: '反馈不存在或已被删除' }

      const latest = await col.doc(targetId).get()
      return { code: 0, data: latest.data && latest.data[0] ? latest.data[0] : { _id: targetId, ...updateData } }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async saveSettings(params) {
    try {
      let token, settings
      if (params && params.token) {
        ({ token, settings } = params)
      } else if (this.params) {
        ({ token, settings } = this.params)
      }
      await verifyAdminToken(token, ['admin'], this)

      if (!settings || typeof settings !== 'object') {
        return { code: -1, msg: '配置数据格式不正确' }
      }

      const col = db.collection('cicada_settings')
      const now = Date.now()

      for (const [key, value] of Object.entries(settings)) {
        const existing = await col.where({ key }).limit(1).get()
        if (existing.data.length > 0) {
          await col.doc(existing.data[0]._id).update({ value, update_time: now })
        } else {
          await col.add({ key, value, update_time: now })
        }
      }

      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getSettings(params) {
    try {
      let token
      if (params && params.token) {
        ({ token } = params)
      } else if (this.params) {
        ({ token } = this.params)
      }
      await verifyAdminToken(token, ['admin', 'engineer'], this)

      const res = await db.collection('cicada_settings').get()
      const settings = {}
      res.data.forEach(item => {
        settings[item.key] = item.value
      })

      return { code: 0, data: settings }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getGuides(params) {
    try {
      let token
      if (params && params.token) {
        ({ token } = params)
      } else if (this.params) {
        ({ token } = this.params)
      }
      await verifyAdminToken(token, ['admin', 'engineer'], this)

      await ensureGuideDefaults()
      const res = await db.collection('cicada_guides').orderBy('sort', 'asc').get()
      return { code: 0, data: res.data }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async updateGuide(params) {
    try {
      let token, guide_id, file_name, file_url, file_type, desc
      if (params && params.token) {
        ({ token, guide_id, file_name, file_url, file_type, desc } = params)
      } else if (this.params) {
        ({ token, guide_id, file_name, file_url, file_type, desc } = this.params)
      }
      await verifyAdminToken(token, ['admin'], this)

      if (!guide_id || !file_name) {
        return { code: -1, msg: '参数不完整' }
      }

      const now = Date.now()
      const updateData = {
        file_name,
        update_time: now
      }

      if (file_url) {
        updateData.file_url = file_url
      }
      if (file_type) {
        updateData.file_type = file_type
      }
      if (desc !== undefined) {
        updateData.desc = desc
      }

      const res = await db.collection('cicada_guides').doc(guide_id).update(updateData)

      if (!res.updated) {
        return { code: -1, msg: '教程不存在' }
      }

      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async uploadSurveyPoster(params) {
    try {
      const httpInfo = this.getHttpInfo && this.getHttpInfo()
      let token, fileContent, fileName, fileType
      if (httpInfo && httpInfo.body) {
        const body = JSON.parse(httpInfo.body)
        ;({ token, fileContent, fileName, fileType } = body)
      } else {
        ;({ token, fileContent, fileName, fileType } = params || {})
      }
      await verifyAdminToken(token, ['admin'], this)

      if (!fileContent || !fileName) return { code: -1, msg: '缺少图片内容或文件名' }

      const normalizedType = String(fileType || '').trim().toLowerCase()
      const ext = getFileExt(fileName)
      if (!SURVEY_POSTER_IMAGE_TYPES.has(normalizedType) && !SURVEY_POSTER_IMAGE_EXTS.has(ext)) {
        return { code: -1, msg: '仅支持 PNG、JPG、JPEG、WEBP、GIF 图片' }
      }

      const uploadExt = ext || SURVEY_POSTER_TYPE_EXT[normalizedType] || 'png'
      let safeFileName = sanitizeFileName(fileName, `survey-poster.${uploadExt}`)
      if (!getFileExt(safeFileName)) {
        safeFileName = `${safeFileName}.${uploadExt}`
      }

      const buffer = Buffer.from(normalizeBase64Content(fileContent), 'base64')

      // 文件大小限制：防止大图导致内存耗尽 (DoS)
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
      if (buffer.length > MAX_IMAGE_SIZE) {
        return { code: -1, msg: '图片大小不能超过 10MB' }
      }

      // 校验文件魔术字节，防止 MIME 类型伪装
      const magicBytes = buffer.slice(0, 8)
      const validMagic = validateImageMagicBytes(magicBytes)
      if (!validMagic) {
        return { code: -1, msg: '图片格式校验失败，仅支持 PNG、JPG、JPEG、WEBP、GIF 图片' }
      }

      const cloudPath = `settings/survey-poster/${Date.now()}_${safeFileName}`
      const res = await uniCloud.uploadFile({
        cloudPath,
        fileContent: buffer,
        fileType: normalizedType || `image/${uploadExt === 'jpg' ? 'jpeg' : uploadExt}`
      })

      return { code: 0, data: { fileUrl: res.fileID, fileID: res.fileID } }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async uploadGuideFile(params) {
    try {
      const httpInfo = this.getHttpInfo && this.getHttpInfo()
      let token, fileContent, fileName, fileType
      if (httpInfo && httpInfo.body) {
        const body = JSON.parse(httpInfo.body)
        ;({ token, fileContent, fileName, fileType } = body)
      } else {
        ;({ token, fileContent, fileName, fileType } = params || {})
      }
      await verifyAdminToken(token, ['admin'], this)

      if (!fileContent || !fileName) return { code: -1, msg: '缺少文件内容或文件名' }

      // 文件大小限制：base64 解码前检查，防止大文件导致内存耗尽 (DoS)
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
      const base64Content = String(fileContent)
      if (base64Content.length > MAX_FILE_SIZE * 1.4) {
        return { code: -1, msg: '文件大小不能超过 10MB' }
      }

      const buffer = Buffer.from(base64Content, 'base64')
      if (buffer.length > MAX_FILE_SIZE) {
        return { code: -1, msg: '文件大小不能超过 10MB' }
      }

      const safeFileName = String(fileName).replace(/[\\/:*?"<>|]/g, '_')
      const cloudPath = `guides/${Date.now()}_${safeFileName}`
      const res = await uniCloud.uploadFile({
        cloudPath,
        fileContent: buffer,
        fileType: fileType || 'application/octet-stream'
      })

      return { code: 0, data: { fileUrl: res.fileID } }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getGuideFileUrl(params) {
    try {
      const httpInfo = this.getHttpInfo && this.getHttpInfo()
      let token, fileID
      if (httpInfo && httpInfo.body) {
        const body = JSON.parse(httpInfo.body)
        ;({ token, fileID } = body)
      } else {
        ;({ token, fileID } = params || {})
      }
      await verifyAdminToken(token, ['admin', 'engineer'], this)

      const id = String(fileID || '').trim()
      if (!id) return { code: -1, msg: '缺少文件ID' }
      if (/^https?:\/\//i.test(id)) {
        return { code: 0, data: { tempFileURL: id, url: id } }
      }

      const res = await uniCloud.getTempFileURL({ fileList: [id] })
      const item = res.fileList && res.fileList[0]
      const tempFileURL = item && (item.tempFileURL || item.url)
      if (!tempFileURL) {
        return { code: -1, msg: (item && item.errMsg) || '获取文件临时链接失败' }
      }

      return { code: 0, data: { tempFileURL, url: tempFileURL } }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  }
}
