import request from '@/utils/request.js'

const USE_CLOUD = true

let userCloudObject = null

const getCloudObject = () => {
  if (!userCloudObject) {
    userCloudObject = uniCloud.importObject('cicada-client-user')
  }
  return userCloudObject
}

export const getRepairList = (params = {}) => {
  if (USE_CLOUD) {
    return getCloudObject().getRepairList(params)
  }
  return request({
    url: '/repair/list',
    method: 'GET',
    data: params
  })
}

export const getRepairDetail = (id) => {
  if (USE_CLOUD) {
    return getCloudObject().getRepairDetail({ id })
  }
  return request({
    url: `/repair/detail/${id}`,
    method: 'GET'
  })
}

export const submitRepair = (data) => {
  if (USE_CLOUD) {
    return getCloudObject().submitRepair({ data })
  }
  return request({
    url: '/repair/submit',
    method: 'POST',
    data
  })
}

export const cancelRepair = (id, reason) => {
  if (USE_CLOUD) {
    return getCloudObject().cancelRepair({ id, reason })
  }
  return request({
    url: `/repair/cancel/${id}`,
    method: 'POST',
    data: { reason }
  })
}

export const getRepairStats = () => {
  if (USE_CLOUD) {
    return Promise.resolve({})
  }
  return request({
    url: '/repair/stats',
    method: 'GET'
  })
}

export const uploadRepairImage = (filePath) => {
  if (USE_CLOUD) {
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
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    uni.uploadFile({
      url: 'https://api.cisco-d.com/api/v1/upload/image',
      filePath,
      name: 'file',
      header: {
        Authorization: `Bearer ${token}`
      },
      success: (res) => {
        const data = JSON.parse(res.data)
        if (data.code === 0) {
          resolve(data.data)
        } else {
          reject(data.message || '上传失败')
        }
      },
      fail: reject
    })
  })
}
