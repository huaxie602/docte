<template>
	<view class="page-shell">
		<view class="wx-top">
			<view class="nav-row">
				<view class="back-btn tap" @click="goBack">
					<view class="chevron-left"></view>
				</view>
				<text class="nav-title">维修查询</text>
				<view class="nav-spacer"></view>
			</view>
		</view>

		<view class="search-page">
			<view class="hero-card">
				<view class="hero-copy">
					<text class="hero-kicker">快速定位</text>
					<text class="hero-title">查询工单、包裹与故障知识</text>
					<text class="hero-desc">输入工单号、快递单号、设备型号或故障关键词，快速找到售后进度和处理建议。</text>
				</view>
				<view class="hero-icon">
					<view class="glyph glyph-search"><view class="glyph-extra"></view></view>
				</view>
			</view>

			<view class="query-panel">
				<view class="query-search">
					<view class="glyph glyph-search glyph-search-small"><view class="glyph-extra"></view></view>
					<input
						v-model.trim="keyword"
						placeholder="工单号 / 快递单号 / 设备型号 / 故障"
						placeholder-class="input-placeholder"
						confirm-type="search"
						@confirm="runSearch"
					/>
					<text class="search-action tap" @click="runSearch">查询</text>
				</view>

				<view class="mode-tabs">
					<view
						v-for="item in modes"
						:key="item.id"
						class="mode-tab tap"
						:class="{ active: activeMode === item.id }"
						@click="switchMode(item.id)"
					>
						<view :class="['glyph', 'glyph-' + item.icon]"><view class="glyph-extra"></view></view>
						<text>{{ item.label }}</text>
					</view>
				</view>
			</view>

			<view v-if="activeMode === 'package'" class="form-card package-form">
				<view class="field-row">
					<text class="field-label">手机号后四位</text>
					<input
						v-model.trim="phoneLast4"
						class="field-input"
						type="number"
						maxlength="4"
						placeholder="选填，填写后可看完整轨迹"
						placeholder-class="input-placeholder"
						confirm-type="search"
						@confirm="runSearch"
					/>
				</view>
				<text class="privacy-note">隐私保护：未填写手机号后四位时，仅展示基础签收和处理状态。</text>
			</view>

			<view v-if="loading" class="state-card">
				<view class="loading-dot"></view>
				<text>查询中...</text>
			</view>

			<view v-else-if="errorMessage" class="state-card warn">
				<text>{{ errorMessage }}</text>
			</view>

			<view v-else-if="activeMode === 'order'" class="result-section">
				<view v-if="needLogin" class="state-card">
					<text class="state-title">登录后查看工单</text>
					<text class="state-desc">工单查询仅展示当前微信账号提交过的维修记录。</text>
					<view class="primary-button tap" @click="goLogin">去登录</view>
				</view>
				<view v-else-if="orderResults.length" class="result-list">
					<view v-for="order in orderResults" :key="order.id" class="order-card tap" @click="openOrder(order)">
						<view class="result-head">
							<view>
								<text class="muted-line">工单 {{ order.id }}</text>
								<text class="result-title">{{ order.title }}</text>
							</view>
							<text :class="['tag', 'tag-' + order.tone]">{{ order.status }}</text>
						</view>
						<view class="result-grid">
							<view><text>型号 / 序列号</text><text>{{ order.meta }}</text></view>
							<view><text>费用状态</text><text>{{ order.price }}</text></view>
						</view>
						<text v-if="order.fault" class="result-desc">{{ order.fault }}</text>
					</view>
				</view>
				<view v-else-if="searched" class="state-card">
					<text class="state-title">没有找到相关工单</text>
					<text class="state-desc">请确认工单号、设备型号或序列号是否正确。</text>
				</view>
			</view>

			<view v-else-if="activeMode === 'package'" class="result-section">
				<view v-if="packageResult" class="package-card">
					<view class="result-head">
						<view>
							<text class="muted-line">快递单号</text>
							<text class="result-title">{{ packageResult.trackingNo }}</text>
						</view>
						<text :class="['tag', 'tag-' + packageResult.tone]">{{ packageResult.status }}</text>
					</view>
					<view class="result-grid">
						<view><text>物流公司</text><text>{{ packageResult.company || '待录入' }}</text></view>
						<view><text>关联工单</text><text>{{ packageResult.orderId || '待关联' }}</text></view>
					</view>
					<view class="package-progress">
						<view v-for="(step, index) in packageFlow" :key="step" class="progress-step" :class="{ reached: index <= packageResult.reached }">
							<view></view>
							<text>{{ step }}</text>
						</view>
					</view>
					<view class="section-title">
						<text>包裹记录</text>
					</view>
					<view class="timeline-card">
						<view v-for="(item, index) in packageResult.timeline" :key="item.title + index" class="timeline-row">
							<view class="timeline-pin" :class="{ pending: item.pending }">
								<view></view>
								<view v-if="index < packageResult.timeline.length - 1"></view>
							</view>
							<view class="timeline-copy">
								<view>
									<text :class="{ muted: item.pending }">{{ item.title }}</text>
									<text>{{ item.time }}</text>
								</view>
								<text>{{ item.desc }}</text>
							</view>
						</view>
					</view>
				</view>
				<view v-else-if="searched" class="state-card">
					<text class="state-title">暂未查到这票包裹</text>
					<text class="state-desc">请确认快递单号是否正确，或等我们签收录入后再查询。</text>
				</view>
			</view>

			<view v-else class="result-section">
				<view v-if="faultResults.length" class="result-list">
					<view v-for="item in faultResults" :key="item.id" class="fault-card">
						<view class="result-head">
							<view>
								<text class="muted-line">{{ item.productType }}</text>
								<text class="result-title">{{ item.faultName }}</text>
							</view>
							<text class="tag tag-info">故障知识</text>
						</view>
						<view v-if="item.questions.length" class="fault-block">
							<text>相关问题</text>
							<text v-for="question in item.questions" :key="question">{{ question }}</text>
						</view>
						<view v-if="item.steps.length" class="fault-block">
							<text>排查建议</text>
							<text v-for="step in item.steps" :key="step">{{ step }}</text>
						</view>
						<view v-if="item.solutions.length" class="fault-block">
							<text>处理建议</text>
							<text v-for="solution in item.solutions" :key="solution">{{ solution }}</text>
						</view>
					</view>
				</view>
				<view v-else-if="searched" class="state-card">
					<text class="state-title">没有找到相关故障知识</text>
					<text class="state-desc">可以换一个设备型号、故障现象或关键词再试。</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getFaultTypes, queryPackageStatus } from '@/api/content'
import { getRepairList } from '@/api/repair'

const modes = [
	{ id: 'order', label: '工单', icon: 'track' },
	{ id: 'package', label: '快递', icon: 'box' },
	{ id: 'fault', label: '故障知识', icon: 'diag' }
]

const packageFlow = ['待签收', '已签收', '已登记', '处理中', '已关联']

const keyword = ref('')
const phoneLast4 = ref('')
const activeMode = ref('fault')
const modeTouched = ref(false)
const loading = ref(false)
const searched = ref(false)
const needLogin = ref(false)
const errorMessage = ref('')
const orderResults = ref([])
const packageResult = ref(null)
const faultResults = ref([])

const parseParam = (value = '') => {
	try {
		return decodeURIComponent(String(value || ''))
	} catch (error) {
		return String(value || '')
	}
}

const normalizeText = (value = '') => String(value || '').trim()
const normalizeComparable = (value = '') => normalizeText(value).toLowerCase()
const normalizeArray = (value = []) => Array.isArray(value) ? value : []

const inferMode = (value = '') => {
	const text = normalizeText(value)
	if (/^DR[-\dA-Z]+$/i.test(text) || /^WO[-\dA-Z]+$/i.test(text)) return 'order'
	if (/^[A-Za-z0-9-]{8,40}$/.test(text)) return 'package'
	return 'fault'
}

const isValidMode = (mode = '') => modes.some((item) => item.id === mode)

onLoad((options = {}) => {
	const inputKeyword = parseParam(options.keyword)
	const inputMode = parseParam(options.mode)
	keyword.value = inputKeyword
	modeTouched.value = isValidMode(inputMode)
	activeMode.value = modeTouched.value ? inputMode : inferMode(inputKeyword)
	if (inputKeyword) {
		setTimeout(() => {
			runSearch()
		}, 80)
	}
})

const switchMode = (mode) => {
	if (activeMode.value === mode) return
	activeMode.value = mode
	modeTouched.value = true
	clearState()
	if (keyword.value) runSearch()
}

const clearState = () => {
	searched.value = false
	needLogin.value = false
	errorMessage.value = ''
	orderResults.value = []
	packageResult.value = null
	faultResults.value = []
}

const runSearch = async () => {
	const input = normalizeText(keyword.value)
	if (!input) {
		clearState()
		uni.showToast({ title: '请输入查询关键词', icon: 'none' })
		return
	}
	if (!modeTouched.value) {
		activeMode.value = inferMode(input)
	}

	loading.value = true
	searched.value = false
	needLogin.value = false
	errorMessage.value = ''
	orderResults.value = []
	packageResult.value = null
	faultResults.value = []

	try {
		if (activeMode.value === 'order') {
			await searchOrders(input)
		} else if (activeMode.value === 'package') {
			await searchPackage(input)
		} else {
			await searchFaultKb(input)
		}
	} catch (error) {
		console.warn('search failed:', error)
		errorMessage.value = error.message || '查询失败，请稍后重试'
		uni.showToast({ title: errorMessage.value, icon: 'none' })
	} finally {
		searched.value = true
		loading.value = false
	}
}

const searchOrders = async (input) => {
	const token = uni.getStorageSync('token')
	if (!token) {
		needLogin.value = true
		return
	}

	const data = await getRepairList({ page: 1, size: 100 })
	const list = Array.isArray(data) ? data : ((data && (data.list || data.data)) || [])
	const target = normalizeComparable(input)
	orderResults.value = list
		.map(normalizeOrder)
		.filter((item) => item.searchText.includes(target))
		.slice(0, 20)
}

const searchPackage = async (input) => {
	const data = await queryPackageStatus({
		trackingNo: input.replace(/\s/g, ''),
		phoneLast4: phoneLast4.value
	})
	packageResult.value = data ? normalizePackageResult(data, input) : null
}

const searchFaultKb = async (input) => {
	const target = normalizeComparable(input)
	const list = await getFaultTypes()
	faultResults.value = (Array.isArray(list) ? list : [])
		.map(normalizeFault)
		.filter((item) => item.searchText.includes(target))
		.slice(0, 12)
}

const normalizeOrder = (item = {}) => {
	const orderItems = normalizeArray(item.items || item.itemsList)
	const firstItem = orderItems[0] || {}
	const id = item.order_no || item.orderNo || item.orderId || item.id || item._id || ''
	const title = item.productName || item.product_name || firstItem.product_name || firstItem.name || '维修设备'
	const model = item.productModel || item.product_model || item.model || firstItem.product_model || ''
	const sn = item.sn || item.serial || item.productSerial || firstItem.sn || ''
	const fault = item.faultDesc || item.fault_desc || firstItem.fault_desc || ''
	const status = item.statusText || item.statusName || item.status || '处理中'
	const total = Number(item.totalFee || item.total_fee || item.quoteTotal || item.quote_total || 0)
	const searchText = [
		id,
		item._id,
		title,
		model,
		sn,
		fault,
		status,
		...orderItems.flatMap((orderItem) => [
			orderItem.product_name,
			orderItem.productName,
			orderItem.product_model,
			orderItem.productModel,
			orderItem.sn,
			orderItem.fault_desc
		])
	].map(normalizeComparable).join(' ')

	return {
		id,
		title,
		meta: [model, sn].filter(Boolean).join(' / ') || '待同步',
		fault,
		status: normalizeStatus(status),
		tone: getOrderTone(status),
		price: total ? `¥${total.toFixed(2)}` : '待报价',
		searchText
	}
}

const normalizeStatus = (status = '') => {
	const text = normalizeText(status)
	const map = {
		pending: '已提交',
		sent: '运输中',
		received: '已签收',
		inspecting: '检测中',
		fixing: '处理中',
		shipped: '已回寄',
		completed: '已完成',
		cancelled: '已取消'
	}
	return map[text] || text || '处理中'
}

const getOrderTone = (status = '') => {
	const text = normalizeStatus(status)
	if (/完成|回寄|shipped|completed/i.test(text)) return 'ok'
	if (/取消|异常|失败|cancel/i.test(text)) return 'danger'
	if (/报价|支付|待|pending/i.test(text)) return 'warn'
	return 'info'
}

const normalizePackageResult = (data = {}, input = '') => {
	const reached = Math.max(0, Math.min(packageFlow.length - 1, Number(data.reached) || 0))
	return {
		trackingNo: data.trackingNo || data.expressNo || data.waybillNo || input,
		company: data.company || data.expressCompany || data.logisticsCompany || '',
		orderId: data.orderId || data.repairOrderId || '',
		status: data.statusText || data.statusName || data.status || packageFlow[reached],
		tone: data.tone || (reached >= 3 ? 'ok' : reached >= 1 ? 'info' : 'warn'),
		reached,
		timeline: normalizeTimeline(data.timeline || data.logs || data.records, reached)
	}
}

const normalizeTimeline = (list = [], reached = 0) => {
	if (Array.isArray(list) && list.length) {
		return list.map((item = {}) => ({
			title: item.title || item.status || '包裹记录',
			desc: item.desc || item.content || item.remark || '',
			time: item.time || item.create_time || item.createTime || '',
			pending: Boolean(item.pending)
		}))
	}
	return packageFlow.map((step, index) => ({
		title: step,
		desc: index <= reached ? '已同步处理记录' : '等待后续更新',
		time: '',
		pending: index > reached
	}))
}

const normalizeFault = (item = {}) => {
	const questions = normalizeArray(item.relatedQuestions || item.confirmInfo).map(normalizeText).filter(Boolean).slice(0, 2)
	const steps = normalizeArray(item.checkSteps).map(normalizeText).filter(Boolean).slice(0, 2)
	const solutions = normalizeArray(item.solutions || item.solution).map(normalizeText).filter(Boolean).slice(0, 2)
	const productType = item.productType || item.categoryName || '设备'
	const faultName = item.faultName || item.fault_name || '常见故障'
	const searchText = [
		productType,
		faultName,
		...questions,
		...steps,
		...solutions
	].map(normalizeComparable).join(' ')

	return {
		id: item.id || item._id || `${productType}-${faultName}`,
		productType,
		faultName,
		questions,
		steps,
		solutions,
		searchText
	}
}

const openOrder = (order) => {
	if (!order.id) return
	uni.redirectTo({
		url: `/pages/index/index?module=track&orderId=${encodeURIComponent(order.id)}`,
		fail: () => uni.showToast({ title: '无法打开工单详情', icon: 'none' })
	})
}

const goLogin = () => {
	uni.navigateTo({
		url: '/pages/login/index',
		fail: () => uni.redirectTo({ url: '/pages/index/index?module=login' })
	})
}

const goBack = () => {
	const pages = getCurrentPages()
	if (pages.length > 1) {
		uni.navigateBack()
		return
	}
	uni.redirectTo({ url: '/pages/index/index' })
}
</script>

<style scoped>
.page-shell {
	min-height: 100vh;
	background: #E8EEFA;
	color: #0F1F3A;
	box-sizing: border-box;
}

.wx-top {
	position: sticky;
	top: 0;
	z-index: 20;
	padding-top: var(--status-bar-height);
	background: rgba(232, 238, 250, 0.96);
	backdrop-filter: blur(18rpx);
}

.nav-row {
	height: 88rpx;
	padding: 0 28rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	box-sizing: border-box;
}

.back-btn,
.nav-spacer {
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.chevron-left {
	width: 20rpx;
	height: 20rpx;
	border-left: 4rpx solid #253B5B;
	border-bottom: 4rpx solid #253B5B;
	transform: rotate(45deg);
}

.nav-title {
	font-size: 32rpx;
	font-weight: 800;
	color: #0F1F3A;
}

.search-page {
	padding: 22rpx 28rpx 72rpx;
	box-sizing: border-box;
}

.hero-card {
	padding: 32rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 24rpx;
	border-radius: 28rpx;
	background: linear-gradient(135deg, #1E6FE0 0%, #3A86FF 100%);
	color: #FFFFFF;
	box-shadow: 0 20rpx 48rpx -18rpx rgba(30, 111, 224, 0.55);
	box-sizing: border-box;
}

.hero-copy {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.hero-kicker {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.82);
}

.hero-title {
	font-size: 38rpx;
	font-weight: 900;
	line-height: 1.25;
}

.hero-desc {
	font-size: 24rpx;
	line-height: 1.55;
	color: rgba(255, 255, 255, 0.9);
}

.hero-icon {
	width: 96rpx;
	height: 96rpx;
	flex: 0 0 96rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 28rpx;
	background: rgba(255, 255, 255, 0.16);
}

.query-panel,
.form-card,
.state-card,
.order-card,
.package-card,
.fault-card {
	border-radius: 28rpx;
	background: #FFFFFF;
	box-shadow: 0 18rpx 42rpx rgba(15, 31, 58, 0.08);
	box-sizing: border-box;
}

.query-panel {
	margin-top: 24rpx;
	padding: 22rpx;
}

.query-search {
	height: 78rpx;
	padding: 0 24rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
	border: 2rpx solid rgba(215, 227, 250, 0.72);
	border-radius: 22rpx;
	background: #F8FAFF;
	box-sizing: border-box;
}

.query-search input {
	min-width: 0;
	flex: 1;
	height: 76rpx;
	font-size: 26rpx;
	color: #0F1F3A;
}

.search-action {
	flex: 0 0 auto;
	font-size: 26rpx;
	font-weight: 800;
	color: #1E6FE0;
}

.mode-tabs {
	margin-top: 18rpx;
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12rpx;
}

.mode-tab {
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	border-radius: 20rpx;
	background: #F4F7FC;
	color: #5A6C8D;
	font-size: 24rpx;
	font-weight: 700;
}

.mode-tab.active {
	background: rgba(30, 111, 224, 0.1);
	color: #1E6FE0;
}

.form-card {
	margin-top: 20rpx;
	padding: 0 26rpx 22rpx;
}

.field-row {
	min-height: 96rpx;
	display: flex;
	align-items: center;
	gap: 18rpx;
	border-bottom: 2rpx solid #EEF3FB;
}

.field-label {
	width: 172rpx;
	flex: 0 0 172rpx;
	font-size: 25rpx;
	font-weight: 700;
	color: #253B5B;
}

.field-input {
	min-width: 0;
	flex: 1;
	height: 92rpx;
	font-size: 26rpx;
	color: #0F1F3A;
}

.privacy-note {
	display: block;
	margin-top: 18rpx;
	font-size: 23rpx;
	line-height: 1.55;
	color: #6B7C97;
}

.result-section {
	margin-top: 22rpx;
}

.result-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.order-card,
.package-card,
.fault-card,
.state-card {
	padding: 28rpx;
}

.result-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 18rpx;
}

.result-head > view {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.muted-line {
	font-size: 22rpx;
	color: #8A99B2;
}

.result-title {
	font-size: 31rpx;
	font-weight: 800;
	line-height: 1.3;
	color: #0F1F3A;
	word-break: break-all;
}

.result-grid {
	margin-top: 22rpx;
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 14rpx;
}

.result-grid view {
	min-width: 0;
	padding: 18rpx;
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	border-radius: 18rpx;
	background: #F6F8FC;
	box-sizing: border-box;
}

.result-grid text:first-child {
	font-size: 22rpx;
	color: #8A99B2;
}

.result-grid text:last-child {
	font-size: 25rpx;
	font-weight: 700;
	color: #253B5B;
	word-break: break-all;
}

.result-desc {
	display: block;
	margin-top: 18rpx;
	font-size: 24rpx;
	line-height: 1.55;
	color: #6B7C97;
}

.tag {
	flex: 0 0 auto;
	padding: 8rpx 16rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 800;
	line-height: 1;
}

.tag-info {
	color: #1E6FE0;
	background: rgba(30, 111, 224, 0.1);
}

.tag-ok {
	color: #0F766E;
	background: rgba(15, 118, 110, 0.12);
}

.tag-warn {
	color: #D97706;
	background: rgba(217, 119, 6, 0.12);
}

.tag-danger {
	color: #DC2626;
	background: rgba(220, 38, 38, 0.1);
}

.state-card {
	margin-top: 22rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 14rpx;
	text-align: center;
	color: #5A6C8D;
}

.state-card.warn {
	color: #D97706;
}

.state-title {
	font-size: 30rpx;
	font-weight: 800;
	color: #0F1F3A;
}

.state-desc {
	font-size: 24rpx;
	line-height: 1.55;
	color: #6B7C97;
}

.primary-button {
	margin-top: 10rpx;
	min-width: 220rpx;
	height: 76rpx;
	padding: 0 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 22rpx;
	background: linear-gradient(135deg, #1E6FE0 0%, #3A86FF 100%);
	color: #FFFFFF;
	font-size: 27rpx;
	font-weight: 800;
	box-sizing: border-box;
}

.loading-dot {
	width: 34rpx;
	height: 34rpx;
	border: 5rpx solid rgba(30, 111, 224, 0.16);
	border-top-color: #1E6FE0;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

.package-progress {
	margin-top: 26rpx;
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 8rpx;
}

.progress-step {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
	font-size: 21rpx;
	color: #8A99B2;
	text-align: center;
}

.progress-step > view {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: #C9D3E4;
}

.progress-step.reached {
	color: #0F766E;
	font-weight: 700;
}

.progress-step.reached > view {
	background: #0F766E;
	box-shadow: 0 0 0 8rpx rgba(15, 118, 110, 0.12);
}

.section-title {
	margin-top: 28rpx;
	margin-bottom: 16rpx;
	display: flex;
	align-items: center;
	gap: 10rpx;
	font-size: 27rpx;
	font-weight: 800;
	color: #0F1F3A;
}

.timeline-card {
	padding: 22rpx;
	border-radius: 22rpx;
	background: #F8FAFF;
}

.timeline-row {
	display: flex;
	gap: 18rpx;
}

.timeline-pin {
	width: 28rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.timeline-pin > view:first-child {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background: #1E6FE0;
}

.timeline-pin.pending > view:first-child {
	background: #C9D3E4;
}

.timeline-pin > view:last-child {
	width: 2rpx;
	flex: 1;
	margin-top: 4rpx;
	background: #DCE6FA;
}

.timeline-copy {
	min-width: 0;
	flex: 1;
	padding-bottom: 22rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.timeline-copy > view {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}

.timeline-copy text:first-child {
	font-size: 25rpx;
	font-weight: 800;
	color: #253B5B;
}

.timeline-copy text:nth-child(2),
.timeline-copy > text {
	font-size: 23rpx;
	line-height: 1.5;
	color: #6B7C97;
}

.timeline-copy .muted {
	color: #94A3B8;
}

.fault-card {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.fault-block {
	padding: 20rpx;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	border-radius: 20rpx;
	background: #F8FAFF;
}

.fault-block > text:first-child {
	font-size: 24rpx;
	font-weight: 800;
	color: #1E6FE0;
}

.fault-block > text:not(:first-child) {
	font-size: 24rpx;
	line-height: 1.55;
	color: #415575;
}

.glyph {
	position: relative;
	width: 36rpx;
	height: 36rpx;
	flex: 0 0 36rpx;
	color: currentColor;
	box-sizing: border-box;
}

.glyph-search {
	border: 5rpx solid currentColor;
	border-radius: 50%;
}

.glyph-search::after {
	content: '';
	position: absolute;
	right: -11rpx;
	bottom: -8rpx;
	width: 16rpx;
	height: 5rpx;
	border-radius: 999rpx;
	background: currentColor;
	transform: rotate(45deg);
}

.glyph-search-small {
	width: 30rpx;
	height: 30rpx;
	color: #8A99B2;
}

.glyph-track {
	border: 4rpx solid currentColor;
	border-radius: 10rpx;
}

.glyph-track::before,
.glyph-track::after {
	content: '';
	position: absolute;
	left: 7rpx;
	right: 7rpx;
	height: 4rpx;
	border-radius: 999rpx;
	background: currentColor;
}

.glyph-track::before {
	top: 9rpx;
}

.glyph-track::after {
	bottom: 9rpx;
}

.glyph-box {
	border: 4rpx solid currentColor;
	border-radius: 8rpx;
}

.glyph-box::before {
	content: '';
	position: absolute;
	left: 4rpx;
	right: 4rpx;
	top: 10rpx;
	height: 4rpx;
	background: currentColor;
}

.glyph-diag {
	border: 4rpx solid currentColor;
	border-radius: 50%;
}

.glyph-diag::before {
	content: '';
	position: absolute;
	left: 50%;
	top: 7rpx;
	width: 4rpx;
	height: 14rpx;
	border-radius: 999rpx;
	background: currentColor;
	transform: translateX(-50%);
}

.glyph-diag::after {
	content: '';
	position: absolute;
	left: 50%;
	bottom: 6rpx;
	width: 5rpx;
	height: 5rpx;
	border-radius: 50%;
	background: currentColor;
	transform: translateX(-50%);
}

.input-placeholder {
	color: #9AA8BD;
}

.tap {
	transition: opacity 0.16s ease;
}

.tap:active {
	opacity: 0.72;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@media screen and (max-width: 360px) {
	.hero-card {
		padding: 28rpx;
	}

	.hero-title {
		font-size: 34rpx;
	}

	.result-grid {
		grid-template-columns: 1fr;
	}
}
</style>
