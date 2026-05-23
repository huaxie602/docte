const db = uniCloud.database()
const crypto = require('crypto')

const ADMIN_TOKEN_EXPIRE = 8 * 3600 * 1000 // 8小时
const STAFF_ROLES = ['admin', 'engineer']

function genToken() {
  return crypto.randomBytes(32).toString('hex')
}

function genSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex')
}

function pickFields(source = {}, fields = []) {
  return fields.reduce((result, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      result[field] = source[field]
    }
    return result
  }, {})
}

function buildPasswordFields(password) {
  const password_salt = genSalt()
  return {
    password_hash: hashPassword(password, password_salt),
    password_salt,
    password: ''
  }
}

async function verifyAdminToken(token, allowedRoles = ['admin']) {
  console.log('verifyAdminToken 开始验证:', { token: token ? token.substring(0, 10) + '...' : 'undefined', allowedRoles })
  if (!token) throw new Error('鉴权失败')
  const res = await db.collection('cicada_users').where({ token }).limit(1).get()
  console.log('数据库查询结果:', res.data.length, res.data[0] ? { role: res.data[0].role, disabled: res.data[0].disabled } : 'null')
  const user = res.data[0]
  if (!user || user.disabled || !allowedRoles.includes(user.role)) {
    console.log('验证失败:', { hasUser: !!user, disabled: user?.disabled, role: user?.role, allowedRoles })
    throw new Error('无权限')
  }
  if (!user.token_expire || Date.now() > user.token_expire) throw new Error('Token已过期')
  console.log('验证通过')
  return user
}

function verifyPassword(user, password) {
  if (!password) return false
  if (user.password_hash && user.password_salt) {
    const inputHash = hashPassword(password, user.password_salt)
    const inputBuffer = Buffer.from(inputHash)
    const storedBuffer = Buffer.from(user.password_hash)
    return inputBuffer.length === storedBuffer.length && crypto.timingSafeEqual(inputBuffer, storedBuffer)
  }

  // 兼容历史明文密码账号，登录成功后会迁移为哈希存储。
  return user.password === password
}

module.exports = {
  _before() {
    // 处理 HTTP 请求参数
    console.log('_before this keys:', Object.keys(this))
    const httpInfo = this.getHttpInfo && this.getHttpInfo()
    console.log('httpInfo:', httpInfo)
    if (httpInfo && httpInfo.body) {
      try {
        const body = JSON.parse(httpInfo.body)
        this.params = body
        console.log('解析后的参数:', body)
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
      console.log('登录请求:', { username, password })
      if (!username || !password) return { code: -1, msg: '用户名或密码错误' }
      const res = await db.collection('cicada_users')
        .where({ username })
        .limit(1)
        .get()
      console.log('数据库查询结果:', res.data.length, res.data[0])
      if (!res.data.length) return { code: -1, msg: '用户名或密码错误' }

      const user = res.data[0]
      console.log('用户角色检查:', { role: user.role, disabled: user.disabled, STAFF_ROLES })
      if (!STAFF_ROLES.includes(user.role) || user.disabled) {
        return { code: -1, msg: '无管理权限' }
      }
      const pwdCheck = verifyPassword(user, password)
      console.log('密码验证结果:', pwdCheck, { hasHash: !!user.password_hash, hasSalt: !!user.password_salt, password: user.password })
      if (!pwdCheck) return { code: -1, msg: '用户名或密码错误' }

      const token = genToken()
      const tokenExpire = Date.now() + ADMIN_TOKEN_EXPIRE
      const updateData = {
        token,
        token_expire: tokenExpire,
        last_login: Date.now()
      }
      if (!user.password_hash || !user.password_salt) {
        Object.assign(updateData, buildPasswordFields(password))
      }
      await db.collection('cicada_users').doc(user._id).update(updateData)

      return {
        code: 0,
        data: {
          token,
          userId: user._id,
          role: user.role,
          isAdmin: user.role === 'admin',
          isEngineer: user.role === 'engineer'
        }
      }
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
      console.log('manageStaff 接收到的参数:', { token: token ? token.substring(0, 10) + '...' : 'undefined', action, staff })
      await verifyAdminToken(token, ['admin'])
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
        const list = await col.where({ role: db.command.in(['admin', 'engineer']) }).get()
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
      await verifyAdminToken(token, ['admin', 'engineer'])
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
      await verifyAdminToken(token, ['admin', 'engineer'])

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

  async saveSettings(params) {
    try {
      let token, settings
      if (params && params.token) {
        ({ token, settings } = params)
      } else if (this.params) {
        ({ token, settings } = this.params)
      }
      await verifyAdminToken(token, ['admin'])

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
      await verifyAdminToken(token, ['admin', 'engineer'])

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
      await verifyAdminToken(token, ['admin', 'engineer'])

      const res = await db.collection('cicada_guides').orderBy('sort', 'asc').get()
      return { code: 0, data: res.data }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async updateGuide(params) {
    try {
      let token, guide_id, file_name, file_url
      if (params && params.token) {
        ({ token, guide_id, file_name, file_url } = params)
      } else if (this.params) {
        ({ token, guide_id, file_name, file_url } = this.params)
      }
      await verifyAdminToken(token, ['admin'])

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

      const res = await db.collection('cicada_guides').doc(guide_id).update(updateData)

      if (!res.updated) {
        return { code: -1, msg: '教程不存在' }
      }

      return { code: 0 }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async uploadGuideFile(params) {
    try {
      // 文件上传功能需要配置云存储
      // 这里返回一个模拟的URL，实际使用时需要实现真正的文件上传
      const token = params.token || (this.params && this.params.token)
      await verifyAdminToken(token, ['admin'])

      // TODO: 实现真正的文件上传到云存储
      // const fileUrl = await uniCloud.uploadFile(...)

      return {
        code: 0,
        data: {
          fileUrl: 'https://example.com/guides/' + Date.now() + '.pdf'
        },
        msg: '文件上传功能需要配置云存储后才能使用'
      }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  }
}
