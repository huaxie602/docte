import request, { baseURL } from '@/utils/request'
import { importCloudObject } from '@/utils/cloud.js'

let userCloudObject = null

const getUserCloudObject = () => {
	if (!userCloudObject) {
		userCloudObject = importCloudObject('cicada-client-user')
	}
	return userCloudObject
}

const uploadFile = (url, filePath) => {
	const token = uni.getStorageSync('token')

	return new Promise((resolve, reject) => {
		uni.uploadFile({
			url: `${baseURL}${url}`,
			filePath,
			name: 'file',
			header: token ? { Authorization: `Bearer ${token}` } : {},
			success: (res) => {
				let body = res.data

				try {
					body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
				} catch (error) {
					reject({ message: '上传响应格式错误', data: res.data })
					return
				}

				if (res.statusCode >= 200 && res.statusCode < 300 && (body.code === 0 || body.code === undefined)) {
					resolve(body.code === undefined ? body : body.data)
					return
				}

				reject(body.message ? body : { message: '上传失败', data: body })
			},
			fail: reject
		})
	})
}

export const register = (data) => request({ url: '/auth/register', method: 'POST', data })

export const login = (data) => request({ url: '/auth/login', method: 'POST', data })

export const wechatLogin = (data) => getUserCloudObject().loginWithWechat(data)

export const logout = () => request({ url: '/auth/logout', method: 'POST' })

export const getUserInfo = () => request({ url: '/auth/userinfo' })

export const submitRepairOrder = (data) => request({ url: '/repair/submit', method: 'POST', data })

export const uploadImage = (filePath) => uploadFile('/upload/image', filePath)

export const uploadVideo = (filePath) => uploadFile('/upload/video', filePath)

export const getWarrantyPolicy = () => request({ url: '/policy/warranty' })

export const getFeePolicy = () => request({ url: '/policy/fee' })

export const getGuide = (type) => request({ url: `/guide/${type}` })

export const getContact = () => request({ url: '/common/contact' })

export const getCustomerService = () => request({ url: '/common/customer-service' })

export const getWechat = () => request({ url: '/common/wechat' })

export const getFaultTypes = () => request({ url: '/fault/types' })

export const searchFault = (data) => request({ url: '/fault/search', data })

export const getRepairList = (data = {}) => request({ url: '/repair/list', data })

export const getRepairDetail = (orderId) => request({ url: '/repair/detail', data: { orderId } })

export const queryPackageStatus = (data = {}) => request({ url: '/package/query', data })

export const applyInvoice = (data) => request({ url: '/invoice/apply', method: 'POST', data })

export const getInvoiceList = (data = {}) => request({ url: '/invoice/list', data })

export const getProductList = (data = {}) => request({ url: '/product/list', data })

// export const getAddressList = () => request({ url: '/address/list' })

export const addAddress = (data) => request({ url: '/address/add', method: 'POST', data })

export const updateAddress = (data) => request({ url: '/address/update', method: 'PUT', data })

export const deleteAddress = (addressId) => request({ url: '/address/delete', method: 'DELETE', data: { addressId } })

// export const setDefaultAddress = (addressId) => request({ url: '/address/set-default', method: 'PUT', data: { addressId } })

export const addComplaint = (data) => request({ url: '/complaint/add', method: 'POST', data })

export const getComplaintList = (data = {}) => request({ url: '/complaint/list', data })

export const getProductCategories = () => request({ url: '/admin/product-category/list' })

export const getAdminOrders = (data = {}) => request({ url: '/admin/orders', data })

export const updateAdminOrder = (data) => request({ url: '/admin/order/update', method: 'PUT', data })

export const updateAdminDocument = (data) => request({ url: '/admin/document/update', method: 'PUT', data })

export const updateAdminCommon = (data) => request({ url: '/admin/common/update', method: 'PUT', data })

export const updateSurvey = (data) => request({ url: '/admin/survey/update', method: 'PUT', data })

export const createPrintTask = (orderId) => request({ url: '/admin/print/order', method: 'POST', data: { orderId } })
