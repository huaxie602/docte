import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getErrorMessage } from './errorMessage.js'

const request = axios.create({
  timeout: 10000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 0) {
      const errMsg = getErrorMessage(res)
      ElMessage.error(errMsg)
      return Promise.reject(new Error(errMsg))
    }
    return res.data !== undefined ? res.data : res
  },
  error => {
    console.error('请求错误:', error)
    const errMsg = getErrorMessage(error.response && error.response.data, error.message || '网络错误')
    ElMessage.error(errMsg)
    return Promise.reject(new Error(errMsg))
  }
)

export default request
