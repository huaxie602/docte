import axios from 'axios'
import { ElMessage } from 'element-plus'

const request = axios.create({
  timeout: 10000
})

request.interceptors.request.use(
  config => config,
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code !== 0) {
      const errMsg = res.msg || res.message || '请求失败'
      ElMessage.error(errMsg)
      return Promise.reject(new Error(errMsg))
    }
    return res.data
  },
  error => {
    console.error('请求错误:', error)
    ElMessage.error(error.message || '网络错误')
    return Promise.reject(error)
  }
)

export default request
