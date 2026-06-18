import { importCloudObject } from '@/utils/cloud.js'

let userCloudObject = null

const getCloudObject = () => {
  if (!userCloudObject) {
    userCloudObject = importCloudObject('cicada-client-user')
  }
  if (!userCloudObject) {
    throw new Error('云对象 cicada-client-user 未连接，请先在 HBuilderX 关联云空间并部署该云对象')
  }
  return userCloudObject
}

const getToken = () => uni.getStorageSync('token') || ''

const clearAuthSession = () => {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync('isLoggedIn')
}

const unwrapCloudResult = (result = {}) => {
  if (result.code === 0 || result.code === undefined) return result.data === undefined ? result : result.data
  if ([401, 1004, 100401].includes(Number(result.code))) clearAuthSession()
  throw new Error(result.message || result.msg || '认证失败')
}

const persistAuthSession = (data = {}) => {
  const token = data.token || ''
  const rawUserInfo = data.userInfo || data.user || {}
  const userInfo = {
    ...rawUserInfo,
    userId: rawUserInfo.userId || rawUserInfo.id || data.userId || '',
    role: rawUserInfo.role || data.role || 'user'
  }

  if (token) uni.setStorageSync('token', token)
  if (Object.keys(userInfo).length) uni.setStorageSync('userInfo', userInfo)
  if (token) uni.setStorageSync('isLoggedIn', true)

  return { ...data, token, userInfo }
}

const normalizeLoginParams = (params = {}) => (
  typeof params === 'string' ? { code: params } : params
)

const getWechatLoginCode = async () => {
  if (typeof uni === 'undefined' || typeof uni.login !== 'function') {
    throw new Error('当前环境不支持微信登录')
  }

  const loginRes = await uni.login({ provider: 'weixin' })
  if (!loginRes || !loginRes.code) {
    throw new Error('获取微信登录凭证失败')
  }

  return loginRes.code
}

const normalizeWechatPhoneLoginParams = async (params = {}) => {
  const normalized = normalizeLoginParams(params)
  const phoneCode = normalized.phoneCode || normalized.phone_code || normalized.mobileCode

  if (!phoneCode) {
    throw new Error('缺少手机号授权码，请重新授权')
  }

  return {
    ...normalized,
    code: normalized.code || await getWechatLoginCode(),
    phoneCode
  }
}

const runLogin = async (method, params = {}) => {
  const cloudObject = getCloudObject()
  if (!cloudObject || typeof cloudObject[method] !== 'function') {
    throw new Error('云端登录方法未部署，请重新部署 cicada-client-user')
  }
  const data = await cloudObject[method](normalizeLoginParams(params)).then(unwrapCloudResult)
  return persistAuthSession(data)
}

const runWechatPhoneLogin = async (params = {}) => {
  const cloudObject = getCloudObject()
  if (!cloudObject || typeof cloudObject.login !== 'function') {
    throw new Error('云端登录方法未部署，请重新部署 cicada-client-user')
  }

  const loginParams = await normalizeWechatPhoneLoginParams(params)
  const data = await cloudObject.login(loginParams).then(unwrapCloudResult)
  return persistAuthSession(data)
}

export const login = (params = {}) => {
  return runLogin('login', params)
}

export const logout = async () => {
  const cloudObject = getCloudObject()
  const token = getToken()

  if (typeof cloudObject.logout === 'function' && token) {
    await cloudObject.logout({ token }).then(unwrapCloudResult)
  }

  clearAuthSession()
  return { success: true }
}

export const getUserInfo = async () => {
  const token = getToken()
  if (!token) {
    clearAuthSession()
    throw new Error('未登录')
  }

  const userInfo = await getCloudObject().getUserInfo({ token }).then(unwrapCloudResult)
  uni.setStorageSync('userInfo', userInfo || {})
  uni.setStorageSync('isLoggedIn', true)
  return userInfo
}

export const loginWithWechat = (params = {}) => {
  return runLogin('loginWithWechat', params)
}

export const loginWithWechatPhone = (params = {}) => {
  return runWechatPhoneLogin(params)
}

export const wechatPhoneLogin = loginWithWechatPhone
export const wechatLogin = loginWithWechatPhone
