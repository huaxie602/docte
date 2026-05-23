import request from '@/utils/request.js'

const USE_CLOUD = true

let userCloudObject = null

const getCloudObject = () => {
  if (!userCloudObject) {
    userCloudObject = uniCloud.importObject('cicada-client-user')
  }
  return userCloudObject
}

export const loginWithPhone = (phone) => {
  return Promise.reject(new Error('暂不支持手机号直登，请使用微信手机号授权登录'))
}

export const logout = () => {
  if (USE_CLOUD) {
    return Promise.resolve()
  }
  return request({
    url: '/auth/logout',
    method: 'POST'
  })
}

export const getUserInfo = () => {
  if (USE_CLOUD) {
    const userInfo = uni.getStorageSync('userInfo')
    return Promise.resolve(userInfo)
  }
  return request({
    url: '/user/info',
    method: 'GET'
  })
}

export const loginWithWechat = (code) => {
  if (USE_CLOUD) {
    return getCloudObject().loginWithWechat({ code })
  }
  return request({
    url: '/auth/wechat',
    method: 'POST',
    data: { code }
  })
}
