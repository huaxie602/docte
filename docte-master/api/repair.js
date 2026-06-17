let orderCloudObject = null

const getCloudObject = () => {
  if (!orderCloudObject) {
    orderCloudObject = uniCloud.importObject('cicada-client-order')
  }
  return orderCloudObject
}

const withToken = (params = {}) => ({
  ...params,
  token: uni.getStorageSync('token') || ''
})

const clearAuthStorage = () => {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('isLoggedIn')
}

const hasAuthToken = () => Boolean(uni.getStorageSync('token'))

const isAuthFailure = (result = {}) => {
  const code = Number(result.code)
  const message = String(result.message || result.msg || '')
  return [401, 1004, 100401].includes(code) || /鉴权失败|Token已过期|token expired|unauthorized|登录已过期|请重新登录/i.test(message)
}

const unwrapCloudResult = (result = {}) => {
  if (!result || typeof result !== 'object') return result
  if (result.code === 0 || result.code === undefined) {
    return result.data === undefined ? result : result.data
  }
  if (isAuthFailure(result)) {
    clearAuthStorage()
  }
  throw new Error(result.message || result.msg || '请求失败')
}

const normalizePageParams = ({ page = 1, pageSize, size, ...rest } = {}) => ({
  ...rest,
  page,
  pageSize: pageSize || size || 10
})

const normalizeOrderId = (id) => ({
  order_id: id
})

const normalizeUrlArray = (...values) => {
  return values.reduce((urls, value) => {
    if (Array.isArray(value)) {
      return urls.concat(value)
    }
    if (value) {
      urls.push(value)
    }
    return urls
  }, []).filter(Boolean)
}

const normalizeSubmitRepairPayload = (data = {}) => {
  if (data.ship_out_info && data.ship_back_info && Array.isArray(data.items)) {
    return data
  }

  const products = Array.isArray(data.products) && data.products.length
    ? data.products
    : [data]

  return {
    ship_out_info: {
      name: data.senderName || data.receiverName || '',
      phone: data.senderPhone || data.receiverPhone || '',
      region: data.senderRegion || data.receiverRegion || '',
      detail: data.senderAddress || data.receiverAddress || '',
      unit: data.receiverUnit || '',
      logistics_company: data.logisticsCompany || '',
      logistics_no: data.trackingNo || '',
      send_method: data.sendMethod || ''
    },
    ship_back_info: {
      name: data.receiverName || data.senderName || '',
      phone: data.receiverPhone || data.senderPhone || '',
      region: data.receiverRegion || data.senderRegion || '',
      detail: data.receiverAddress || data.senderAddress || '',
      unit: data.receiverUnit || ''
    },
    items: products.map((item = {}) => ({
      product_name: item.productName || item.name || data.productName || '维修产品',
      product_model: item.productModel || item.model || data.productModel || '',
      sn: item.productSerial || item.serial || data.productSerial || '',
      buy_date: item.buyDate || data.buyDate || '',
      fault_desc: item.faultDesc || item.faultType || data.faultDesc || data.faultType || '',
      voucher_urls: normalizeUrlArray(item.voucher_urls, item.voucherUrls, item.voucherImages),
      image_urls: normalizeUrlArray(item.image_urls, item.imageUrls, item.images),
      video_urls: normalizeUrlArray(item.video_urls, item.videoUrls, item.videos),
      media_urls: normalizeUrlArray(item.media_urls, item.mediaUrls)
    }))
  }
}

export const getRepairList = (params = {}) => {
  if (!hasAuthToken()) {
    const pagination = normalizePageParams(params)
    return Promise.resolve({ list: [], total: 0, page: pagination.page, pageSize: pagination.pageSize })
  }
  return getCloudObject().getOrderList(withToken(normalizePageParams(params))).then(unwrapCloudResult)
}

export const getRepairDetail = (id) => {
  return getCloudObject().getOrderDetail(withToken(normalizeOrderId(id))).then(unwrapCloudResult)
}

export const submitRepair = (data) => {
  return getCloudObject().createOrder(withToken(normalizeSubmitRepairPayload(data || {}))).then(unwrapCloudResult)
}

export const cancelRepair = (id, reason) => {
  return getCloudObject().cancelOrder(withToken({ ...normalizeOrderId(id), reason })).then(unwrapCloudResult)
}

export const confirmRepairQuote = (id) => {
  return getCloudObject().confirmQuote(withToken(normalizeOrderId(id))).then(unwrapCloudResult)
}

export const uploadRepairPaymentProof = (id, proof = {}) => {
  return getCloudObject().uploadPaymentProof(withToken({ ...normalizeOrderId(id), proof })).then(unwrapCloudResult)
}

export const createRepairWechatPay = (id) => {
  return getCloudObject().createWechatPayPayment(withToken(normalizeOrderId(id))).then(unwrapCloudResult)
}

export const syncRepairWechatPay = (id, outTradeNo = '') => {
  return getCloudObject().syncWechatPayPayment(withToken({ ...normalizeOrderId(id), out_trade_no: outTradeNo })).then(unwrapCloudResult)
}

export const getRepairStats = () => {
  return Promise.resolve({})
}

export const uploadRepairImage = (filePath) => {
  return new Promise((resolve, reject) => {
    uniCloud.uploadFile({
      filePath,
      cloudPath: `repair/${Date.now()}.jpg`,
      success: (res) => {
        resolve({ url: res.fileID })
      },
      fail: reject
    })
  })
}
