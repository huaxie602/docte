export function getUniCloudClient() {
  if (typeof uniCloud === 'undefined') {
    throw new Error('云服务未连接，请先在 HBuilderX 关联正确的 uniCloud 服务空间')
  }

  return uniCloud
}

export function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    const cloudClient = getUniCloudClient()
    const token = uni.getStorageSync('token')
    if (token) {
      data.token = token
    }

    cloudClient.callFunction({
      name,
      data,
      success: (res) => {
        const result = res.result
        if (result.code === 0) {
          resolve(result.data || result)
        } else {
          if (result.code === 401) {
            uni.removeStorageSync('token')
          }
          reject(new Error(result.message || result.msg || '请求失败'))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

export function importCloudObject(name) {
  const cloudClient = getUniCloudClient()
  if (!cloudClient || typeof cloudClient.importObject !== 'function') {
    throw new Error('云服务未初始化，请先在 HBuilderX 关联正确的 uniCloud 服务空间')
  }

  const cloudObject = cloudClient.importObject(name)
  if (!cloudObject) {
    throw new Error(`云对象 ${name} 未连接，请先在 HBuilderX 关联服务空间并部署该云对象`)
  }

  return cloudObject
}

export function uploadCloudFile(options = {}) {
  const cloudClient = getUniCloudClient()
  return cloudClient.uploadFile(options)
}

export function getCloudTempFileURL(fileList = []) {
  const cloudClient = getUniCloudClient()
  return cloudClient.getTempFileURL({ fileList })
}
