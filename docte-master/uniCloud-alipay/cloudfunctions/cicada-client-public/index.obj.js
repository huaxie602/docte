const db = uniCloud.database()

const CACHE_TTL = 5 * 60 * 1000
const cacheStore = Object.create(null)

function getCache(key) {
  const cache = cacheStore[key]
  if (!cache || Date.now() > cache.expireAt) return null
  return cache.data
}

function setCache(key, data, ttl = CACHE_TTL) {
  cacheStore[key] = {
    data,
    expireAt: Date.now() + ttl
  }
}

const GUIDE_CATEGORY_ALIASES = {
  quick: ['快速指南', '快速入门'],
  repair: ['报修指南', '报修流程'],
  query: ['查询办法', '维修查询', '物流寄送'],
  invoice: ['开票指南', '发票开具'],
  fault: ['自查指南', '故障自查']
}

function normalizeGuide(item = {}, type = '') {
  return {
    id: item._id,
    type,
    title: item.category || '操作指南',
    description: item.desc || '',
    summary: item.desc || '',
    paperTitle: item.category || '操作指南',
    sections: [{
      title: item.category || '操作指南',
      lines: [item.desc, item.file_name ? `当前文档：${item.file_name}` : ''].filter(Boolean)
    }],
    fileName: item.file_name || '',
    fileUrl: item.file_url || '',
    updateTime: item.update_time || ''
  }
}

module.exports = {
  async getCategories({ forceRefresh = false } = {}) {
    try {
      const cacheKey = 'categories:online'
      if (!forceRefresh) {
        const cached = getCache(cacheKey)
        if (cached) return { code: 0, data: cached, cache: true }
      }

      const res = await db.collection('cicada_product_categories')
        .where({ status: db.command.in(['上架', 'active']) })
        .orderBy('sort', 'asc')
        .get()
      setCache(cacheKey, res.data)
      return { code: 0, data: res.data }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getFaultKb({ category_id, forceRefresh = false } = {}) {
    try {
      const cacheKey = `fault-kb:${category_id || 'all'}`
      if (!forceRefresh) {
        const cached = getCache(cacheKey)
        if (cached) return { code: 0, data: cached, cache: true }
      }

      const query = category_id
        ? db.collection('cicada_fault_kb').where({ category_id })
        : db.collection('cicada_fault_kb')
      const [faultRes, categoryRes] = await Promise.all([
        query.get(),
        db.collection('cicada_product_categories').get()
      ])
      const categoryMap = categoryRes.data.reduce((map, item) => {
        map[item._id] = item.category_name
        return map
      }, {})
      const list = faultRes.data
        .map(item => ({
          ...item,
          category_name: categoryMap[item.category_id] || ''
        }))
        .filter(item => item.category_name)
      setCache(cacheKey, list)
      return { code: 0, data: list }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getSettings({ keys } = {}) {
    try {
      const query = keys && keys.length > 0
        ? db.collection('cicada_settings').where({ key: db.command.in(keys) })
        : db.collection('cicada_settings')
      const res = await query.get()
      const settings = {}
      res.data.forEach(item => {
        settings[item.key] = item.value
      })
      return { code: 0, data: settings }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getGuides({ forceRefresh = false } = {}) {
    try {
      const cacheKey = 'guides:all'
      if (!forceRefresh) {
        const cached = getCache(cacheKey)
        if (cached) return { code: 0, data: cached, cache: true }
      }

      const res = await db.collection('cicada_guides').orderBy('sort', 'asc').get()
      const guides = res.data.map(item => normalizeGuide(item))
      setCache(cacheKey, guides)
      return { code: 0, data: guides }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  },

  async getGuide({ type = '', forceRefresh = false } = {}) {
    try {
      const guideType = String(type || '').trim()
      const cacheKey = `guide:${guideType || 'default'}`
      if (!forceRefresh) {
        const cached = getCache(cacheKey)
        if (cached) return { code: 0, data: cached, cache: true }
      }

      const aliases = GUIDE_CATEGORY_ALIASES[guideType] || [guideType]
      const res = await db.collection('cicada_guides').orderBy('sort', 'asc').get()
      const matched = res.data.find(item => aliases.some(alias => item.category && item.category.includes(alias)))

      if (!matched) return { code: 0, data: null }

      const guide = normalizeGuide(matched, guideType)
      setCache(cacheKey, guide)
      return { code: 0, data: guide }
    } catch (e) {
      return { code: -1, msg: e.message }
    }
  }
}
