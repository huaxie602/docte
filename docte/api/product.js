import request from '@/utils/request.js'

/**
 * 获取产品列表
 * @param {object} params 查询参数 { page, pageSize }
 * @returns {Promise<{list: array, total: number}>}
 */
export const getProductList = (params = {}) => {
	return request({
		url: '/product/list',
		method: 'GET',
		data: params
	})
}

/**
 * 获取产品详情
 * @param {string} id 产品ID
 * @returns {Promise<object>}
 */
export const getProductDetail = (id) => {
	return request({
		url: `/product/detail/${id}`,
		method: 'GET'
	})
}

/**
 * 添加产品
 * @param {object} data 产品数据
 * @returns {Promise<{id: string}>}
 */
export const addProduct = (data) => {
	return request({
		url: '/product/add',
		method: 'POST',
		data
	})
}

/**
 * 更新产品
 * @param {string} id 产品ID
 * @param {object} data 产品数据
 * @returns {Promise}
 */
export const updateProduct = (id, data) => {
	return request({
		url: `/product/update/${id}`,
		method: 'POST',
		data
	})
}

/**
 * 删除产品
 * @param {string} id 产品ID
 * @returns {Promise}
 */
export const deleteProduct = (id) => {
	return request({
		url: `/product/delete/${id}`,
		method: 'POST'
	})
}

/**
 * 获取产品分类
 * @returns {Promise<array>}
 */
export const getProductCategories = () => {
	return request({
		url: '/product/categories',
		method: 'GET'
	})
}
