<template>
  <div class="summary-page" v-loading="loading">
    <div class="summary-header">
      <div>
        <h2 class="page-title">服务数据总结</h2>
        <p class="page-subtitle">截止今日的全局业务运行情况</p>
      </div>
      <el-button type="primary" icon="Download" @click="handleExport">导出总结报表</el-button>
    </div>

    <section class="summary-section">
      <div class="section-title">工单运行情况</div>
      <el-row :gutter="20">
        <el-col
          v-for="item in orderMetrics"
          :key="item.title"
          :xs="24"
          :sm="12"
          :lg="6"
        >
          <el-card shadow="hover" class="metric-card">
            <el-statistic :title="item.title" :value="summaryData[item.key]" :suffix="item.suffix">
              <template #content>
                <span class="metric-number" :class="item.type ? `is-${item.type}` : ''">
                  {{ summaryData[item.key].toLocaleString() }}
                </span>
                <span class="metric-suffix">{{ item.suffix }}</span>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </section>

    <section class="summary-section">
      <div class="section-title">客户投诉与建议</div>
      <el-row :gutter="20">
        <el-col
          v-for="item in feedbackMetrics"
          :key="item.title"
          :xs="24"
          :sm="12"
        >
          <el-card shadow="hover" class="metric-card">
            <el-statistic :title="item.title" :value="summaryData[item.key]" :suffix="item.suffix">
              <template #content>
                <span class="metric-number" :class="item.type ? `is-${item.type}` : ''">
                  {{ summaryData[item.key].toLocaleString() }}
                </span>
                <span class="metric-suffix">{{ item.suffix }}</span>
              </template>
            </el-statistic>
          </el-card>
        </el-col>
      </el-row>
    </section>
  </div>
</template>

<script setup>
import { reactive, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getDashboardSummary } from '../api/order.js'

const loading = ref(true)

const summaryData = reactive({
  totalOrders: 0,
  completedOrders: 0,
  pendingOrders: 0,
  monthOrders: 0,
  totalFeedbacks: 0,
  pendingFeedbacks: 0
})

const orderMetrics = [
  { title: '累计接收总单量', key: 'totalOrders', suffix: '单' },
  { title: '已修复并结案', key: 'completedOrders', suffix: '单' },
  { title: '当前待处理', key: 'pendingOrders', suffix: '单', type: 'warning' },
  { title: '本月新增单量', key: 'monthOrders', suffix: '单' }
]

const feedbackMetrics = [
  { title: '累计收到反馈', key: 'totalFeedbacks', suffix: '条' },
  { title: '未读/待跟进投诉', key: 'pendingFeedbacks', suffix: '条', type: 'danger' }
]

const fetchSummaryData = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('adminToken')
    const res = await getDashboardSummary(token)
    const data = res?.data || res || {}

    summaryData.totalOrders = data.totalOrders || 0
    summaryData.completedOrders = data.completedOrders || 0
    summaryData.pendingOrders = data.pendingOrders || 0
    summaryData.monthOrders = data.monthOrders || 0
    summaryData.totalFeedbacks = data.totalFeedbacks || 0
    summaryData.pendingFeedbacks = data.pendingFeedbacks || 0
  } catch (error) {
    console.error('加载服务数据总结失败:', error)
  } finally {
    loading.value = false
  }
}

const handleExport = () => {
  ElMessage.info('数据导出功能开发中')
}

onMounted(() => {
  fetchSummaryData()
})
</script>

<style scoped>
.summary-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 8px 0 4px;
}

.page-title {
  margin: 0;
  color: #1d2129;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 0;
}

.page-subtitle {
  margin: 10px 0 0;
  color: #86909c;
  font-size: 14px;
  line-height: 1.6;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title {
  padding-left: 12px;
  border-left: 4px solid #165dff;
  color: #1d2129;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

.metric-card {
  border: none;
  border-radius: 10px;
  margin-bottom: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.metric-card:hover {
  transform: translateY(-3px);
}

.metric-card :deep(.el-card__body) {
  padding: 28px 30px;
}

.metric-card :deep(.el-statistic__head) {
  margin-bottom: 18px;
  color: #86909c;
  font-size: 14px;
}

.metric-number {
  color: #1d2129;
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}

.metric-number.is-warning {
  color: var(--el-color-warning);
}

.metric-number.is-danger {
  color: var(--el-color-danger);
}

.metric-suffix {
  margin-left: 8px;
  color: #86909c;
  font-size: 14px;
  font-weight: 500;
}

@media screen and (max-width: 768px) {
  .summary-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-title {
    font-size: 24px;
  }

  .summary-page {
    gap: 24px;
  }
}
</style>
