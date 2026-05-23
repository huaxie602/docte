<template>
  <div class="glass-card">
    <div class="page-header">
      <h2 class="page-title">报修工单管理</h2>
      <div class="header-stats">
        <div class="stat-item stat-pending">
          <span class="stat-label">待处理</span>
          <span class="stat-value">{{ orders.filter(o => o.status === '待处理').length }}</span>
        </div>
        <div class="stat-item stat-processing">
          <span class="stat-label">维修中</span>
          <span class="stat-value">{{ orders.filter(o => o.status === '维修中').length }}</span>
        </div>
        <div class="stat-item stat-shipped">
          <span class="stat-label">已发货</span>
          <span class="stat-value">{{ orders.filter(o => o.status === '已发货').length }}</span>
        </div>
        <div class="stat-item stat-completed">
          <span class="stat-label">已处理</span>
          <span class="stat-value">{{ orders.filter(o => o.status === '已处理').length }}</span>
        </div>
      </div>
    </div>

    <div class="workorder-header">
      <div class="filter-container">
        <el-input v-model="wo.search" placeholder="搜索姓名/手机号/设备号" style="width: 240px;" clearable prefix-icon="Search"></el-input>
        <el-select v-model="wo.filter" placeholder="工单状态" clearable style="width: 130px;">
          <el-option label="待处理" value="待处理"></el-option>
          <el-option label="维修中" value="维修中"></el-option>
          <el-option label="已发货" value="已发货"></el-option>
          <el-option label="已处理" value="已处理"></el-option>
        </el-select>
        <el-select v-model="wo.deviceFilter" placeholder="设备型号" clearable style="width: 180px;">
          <el-option v-for="device in deviceModels" :key="device" :label="device" :value="device"></el-option>
        </el-select>
      </div>
      <div class="toolbar-actions">
        <el-date-picker
          v-model="shipDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="发货日期"
          style="width: 140px;"
        ></el-date-picker>
        <el-button plain class="top-btn-text" @click="downloadImportTemplate"><el-icon><Document /></el-icon> 下载模板</el-button>
        <el-upload
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          accept=".xlsx,.xls"
          :on-change="handleImportFile"
        >
          <el-button type="success" plain class="top-btn-text" :loading="importing"><el-icon><Upload /></el-icon> 导入运单</el-button>
        </el-upload>
        <el-button plain class="top-btn-text" :disabled="!selectedOrders.length" @click="printSelectedOrders"><el-icon><Printer /></el-icon> 批量打印</el-button>
        <el-button type="primary" class="top-btn-text" @click="exportToExcel"><el-icon><Download /></el-icon> 导出</el-button>
      </div>
    </div>

    <div class="info-banner">
      <div class="banner-icon">
        <el-icon :size="20"><InfoFilled /></el-icon>
      </div>
      <div class="banner-content">
        <div class="banner-title">批量回寄发货</div>
        <div class="banner-desc">选择发货日期，下载模板填入工单编号和回寄运单号，上传后系统会自动更新工单状态与物流信息</div>
      </div>
      <div class="banner-badge">
        <el-tag v-if="selectedOrders.length" type="primary" effect="dark" round>已选择 {{ selectedOrders.length }} 单</el-tag>
        <el-tag v-else type="info" effect="plain" round>按工单编号匹配</el-tag>
      </div>
    </div>

    <div class="table-responsive">
      <el-table :data="pagedOrders" class="modern-table" style="width: 100%" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="42"></el-table-column>
        <el-table-column prop="id" label="工单编号" width="150" show-overflow-tooltip></el-table-column>

        <el-table-column label="报修方信息" width="180">
          <template #default="{row}">
            <div class="clinic-name">{{ row.clinicName }}</div>
            <div class="customer-name">{{ row.customerName }}</div>
            <div class="phone-number">{{ row.phone }}</div>
          </template>
        </el-table-column>

        <el-table-column label="设备与故障" width="200">
          <template #default="{row}">
            <div class="product-model">{{ row.productModel }}</div>
            <div class="fault-desc">{{ row.fault }}</div>
          </template>
        </el-table-column>

        <el-table-column label="物流信息" width="220">
          <template #default="{row}">
            <div class="logistics-info">
              <span class="logistics-label">寄出：</span>{{ row.senderAddress || '-' }}
            </div>
            <div class="logistics-info">
              <span class="logistics-label">回寄：</span>{{ row.returnNo ? `${row.returnCompany || '物流'} ${row.returnNo}` : row.returnAddress || '-' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="处理状态" width="130">
          <template #default="{row}">
            <el-tag
              :class="'status-tag status-' + row.status"
              :type="getStatusType(row.status)"
              effect="light"
              round
              size="small">
              {{ row.status }}
            </el-tag>
            <div class="update-time">{{ row.updateTime || '暂无更新时间' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="发票状态" width="110">
          <template #default="{row}">
            <el-tag
              v-if="row.invoiceStatus"
              :class="'invoice-tag invoice-' + row.invoiceStatus"
              :type="getInvoiceType(row.invoiceStatus)"
              effect="light"
              round
              size="small">
              {{ row.invoiceStatus }}
            </el-tag>
            <span v-else class="no-invoice">无需开票</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" fixed="right" align="right">
          <template #default="{row}">
            <el-button type="primary" link @click="openDrawer(row)">处理</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:20px; overflow-x: auto;">
      <el-pagination v-model:current-page="wo.page" v-model:page-size="wo.pageSize" :total="filteredOrders.length" layout="prev, pager, next" background></el-pagination>
    </div>
  </div>

  <el-drawer v-model="drawerVisible" title="报修工单处理" direction="rtl" :size="isMobile ? '100%' : '500px'">
    <template v-if="currentOrder">
      <div style="padding: 0 10px; color:#4e5969; font-size:14px; line-height:2;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
          <span style="font-size:16px; font-weight:600; color:#1d2129;">{{currentOrder.id}}</span>
          <el-tag :type="currentOrder.status==='已发货'?'success':currentOrder.status==='维修中'?'primary':'warning'">{{currentOrder.status}}</el-tag>
        </div>
        <div style="background:#f7f8fa; padding:16px; border-radius:8px; margin-bottom:20px;">
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">寄出信息</p>
          <p style="margin:0;">物流公司：{{currentOrder.logisticsCompany}}</p>
          <p style="margin:0;">物流单号：{{currentOrder.logisticsNo}}</p>
        </div>
        <div style="background:#f7f8fa; padding:16px; border-radius:8px; margin-bottom:20px;">
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">回寄信息</p>
          <p style="margin:0;">诊所名称：{{currentOrder.clinicName}}</p>
          <p style="margin:0;">收件人姓名：{{currentOrder.customerName}}</p>
          <p style="margin:0;">手机号码：{{currentOrder.phone}}</p>
          <p style="margin:0;">详细地址：{{currentOrder.address}}</p>
          <p style="margin:0;">回寄物流：{{currentOrder.returnCompany || '暂无（待发货）'}}</p>
          <p style="margin:0;">回寄单号：{{currentOrder.returnNo || '暂无（待发货）'}}</p>
        </div>
        <div style="background:#f7f8fa; padding:16px; border-radius:8px; margin-bottom:20px;">
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">产品信息</p>
          <p style="margin:0;">产品型号：{{currentOrder.productModel}}</p>
          <p style="margin:0;">物品清单：{{currentOrder.itemsList}}</p>
        </div>
        <div style="background:#f7f8fa; padding:16px; border-radius:8px; margin-bottom:20px;">
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">故障信息</p>
          <p style="margin:0;">故障描述：{{currentOrder.fault}}</p>
          <p style="margin:8px 0 6px;color:#86909c;">故障照片/视频：</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <el-image v-for="(img, index) in currentOrder.images" :key="index" :src="img" :preview-src-list="currentOrder.images" style="width:72px;height:72px;border-radius:8px;" fit="cover"></el-image>
          </div>
        </div>
        <div style="background:#f7f8fa; padding:16px; border-radius:8px; margin-bottom:20px;">
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">财务/发票信息</p>
          <p style="margin:0;">是否需要开票：{{currentOrder.needInvoice ? '是' : '否'}}</p>
          <template v-if="currentOrder.needInvoice">
            <p style="margin:0;">发票抬头：{{currentOrder.invoiceTitle}}</p>
            <p style="margin:0;">税号：{{currentOrder.taxId}}</p>
            <p style="margin:0;">开票状态：<el-tag :type="currentOrder.invoiceStatus === '已开具' ? 'success' : 'warning'" size="small">{{currentOrder.invoiceStatus}}</el-tag></p>
          </template>
          <el-divider border-style="dashed"></el-divider>
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">开票登记</p>
          <el-form label-width="86px" size="small">
            <el-form-item label="开票状态">
              <el-select v-model="invoiceStatus" style="width:100%;">
                <el-option label="无需开票" value="无需开票"></el-option>
                <el-option label="待开票" value="待开票"></el-option>
                <el-option label="开具中" value="开具中"></el-option>
                <el-option label="已开具" value="已开具"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="发票抬头">
              <el-input v-model="invoiceForm.title" placeholder="请输入发票抬头"></el-input>
            </el-form-item>
            <el-form-item label="企业税号">
              <el-input v-model="invoiceForm.taxNo" placeholder="请输入企业税号"></el-input>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="invoiceForm.remark" placeholder="电子票号/财务备注"></el-input>
            </el-form-item>
          </el-form>
          <el-button type="primary" plain size="small" @click="saveInvoiceStatus">保存开票状态</el-button>
        </div>
        <div style="background:#f7f8fa; padding:16px; border-radius:8px; margin-bottom:20px;">
          <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">工单信息</p>
          <p style="margin:0;">工单编号：{{currentOrder.id}}</p>
          <p style="margin:0;">提交时间：{{currentOrder.submitTime}}</p>
          <p style="margin:0;">当前状态：<el-tag :type="currentOrder.status==='已发货'?'success':currentOrder.status==='维修中'?'primary':'warning'" size="small">{{currentOrder.status}}</el-tag></p>
        </div>
        <el-divider border-style="dashed"></el-divider>
        <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">更改工单进度</p>
        <el-radio-group v-model="newStatus">
          <el-radio label="待处理">待处理</el-radio>
          <el-radio label="维修中">维修中</el-radio>
          <el-radio label="已发货">已发货</el-radio>
          <el-radio label="已处理">已处理</el-radio>
        </el-radio-group>
      </div>
    </template>
    <template #footer>
      <div style="display:flex; justify-content:space-between; width:100%;">
        <el-button @click="printOrder" plain><el-icon><Printer /></el-icon> 打印</el-button>
        <div>
          <el-button @click="drawerVisible=false">关闭</el-button>
          <el-button type="primary" @click="confirmStatus">保存</el-button>
        </div>
      </div>
    </template>
  </el-drawer>

  <el-dialog v-model="importResultVisible" title="运单导入结果" width="720px" align-center>
    <div v-if="importResult" class="import-summary">
      <el-tag type="info">总计 {{ importResult.total }} 条</el-tag>
      <el-tag type="success">成功 {{ importResult.successCount }} 条</el-tag>
      <el-tag type="danger">失败 {{ importResult.failCount }} 条</el-tag>
    </div>
    <el-table v-if="importResult" :data="importResult.results" max-height="360" style="width: 100%;">
      <el-table-column prop="rowIndex" label="Excel行" width="90"></el-table-column>
      <el-table-column prop="order_no" label="工单编号" min-width="150" show-overflow-tooltip></el-table-column>
      <el-table-column prop="logistics_company" label="物流公司" width="120"></el-table-column>
      <el-table-column prop="logistics_no" label="运单号" min-width="160" show-overflow-tooltip></el-table-column>
      <el-table-column label="结果" width="110">
        <template #default="{row}">
          <el-tag :type="row.success ? 'success' : 'danger'" size="small">{{ row.success ? '成功' : '失败' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="说明" min-width="150" show-overflow-tooltip></el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="importResultVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { batchImportReturnLogistics, getOrderList, updateInvoiceStatus, updateOrderStatus } from '../api/order.js'
import { transformOrders } from '../utils/orderTransform.js'
import { toEnglishStatus } from '../utils/orderStatus.js'

const route = useRoute()
const isMobile = ref(window.innerWidth <= 768)

const getStatusType = (status) => {
  const statusMap = {
    '待处理': 'warning',
    '维修中': 'primary',
    '已发货': 'success',
    '已处理': 'info'
  }
  return statusMap[status] || 'info'
}

const getInvoiceType = (status) => {
  const invoiceMap = {
    '待开票': 'info',
    '开具中': 'primary',
    '已开具': 'success'
  }
  return invoiceMap[status] || 'info'
}

const loading = ref(false)
const importing = ref(false)

const demoOrders = [
  {
    _id: 'demo001',
    id: 'DR202605190001',
    clinicName: '北京朝阳口腔诊所',
    customerName: '张医生',
    phone: '13800138001',
    address: '北京市朝阳区建国路88号SOHO现代城A座1201室',
    productModel: 'X-RAY 5000 Pro',
    itemsList: '主机×1、电源线×1、说明书×1',
    fault: '设备开机后显示屏无反应，指示灯正常亮起，怀疑是显示模块故障',
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400',
      'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400'
    ],
    logisticsCompany: '顺丰速运',
    logisticsNo: 'SF1234567890123',
    senderAddress: '北京市朝阳区',
    returnCompany: '顺丰速运',
    returnNo: 'SF9876543210987',
    returnAddress: '北京市朝阳区建国路88号',
    status: '已发货',
    submitTime: '2026-05-15 10:30:00',
    updateTime: '2026-05-18 14:20',
    needInvoice: true,
    invoiceTitle: '北京朝阳口腔诊所有限公司',
    taxId: '91110105MA01234567',
    invoiceStatus: '已开具',
    invoiceRemark: '电子发票已发送至邮箱'
  },
  {
    _id: 'demo002',
    id: 'DR202605190002',
    clinicName: '上海浦东美齿诊所',
    customerName: '李主任',
    phone: '13900139002',
    address: '上海市浦东新区世纪大道1000号环球金融中心3楼',
    productModel: 'UltraClean 3000',
    itemsList: '超声波清洗机×1、手柄×2、配件盒×1',
    fault: '超声波功能失效，清洗时无振动，可能是换能器损坏',
    images: [
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400'
    ],
    logisticsCompany: '中通快递',
    logisticsNo: 'ZT9988776655443',
    senderAddress: '上海市浦东新区',
    returnCompany: '',
    returnNo: '',
    returnAddress: '上海市浦东新区世纪大道1000号',
    status: '维修中',
    submitTime: '2026-05-17 09:15:00',
    updateTime: '2026-05-18 16:45',
    needInvoice: true,
    invoiceTitle: '上海浦东美齿诊所',
    taxId: '91310115MA98765432',
    invoiceStatus: '开具中'
  },
  {
    _id: 'demo003',
    id: 'DR202605190003',
    clinicName: '广州天河牙科医院',
    customerName: '王院长',
    phone: '13700137003',
    address: '广东省广州市天河区天河路123号天河城广场B座8楼',
    productModel: 'DentalCare Pro Max',
    itemsList: '治疗椅×1、控制面板×1、脚踏开关×1',
    fault: '治疗椅升降功能异常，按键无响应，需要检修电路板',
    images: [
      'https://images.unsplash.com/photo-1581093458791-9d42e2d6b7b3?w=400',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400',
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400'
    ],
    logisticsCompany: '德邦物流',
    logisticsNo: 'DB5566778899001',
    senderAddress: '广东省广州市天河区',
    returnCompany: '',
    returnNo: '',
    returnAddress: '广东省广州市天河区天河路123号',
    status: '待处理',
    submitTime: '2026-05-19 08:20:00',
    updateTime: '2026-05-19 08:20',
    needInvoice: false,
    invoiceTitle: '',
    taxId: '',
    invoiceStatus: ''
  },
  {
    _id: 'demo004',
    id: 'DR202605180004',
    clinicName: '深圳南山口腔中心',
    customerName: '陈医生',
    phone: '13600136004',
    address: '广东省深圳市南山区科技园南区深圳湾科技生态园5栋A座',
    productModel: 'SmartLight 2000',
    itemsList: '无影灯×1、灯臂×1、电源适配器×1',
    fault: '灯光亮度不足，调节按钮失灵，疑似LED模块老化',
    images: [
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400'
    ],
    logisticsCompany: '圆通速递',
    logisticsNo: 'YT1122334455667',
    senderAddress: '广东省深圳市南山区',
    returnCompany: '圆通速递',
    returnNo: 'YT7766554433221',
    returnAddress: '广东省深圳市南山区科技园南区',
    status: '已处理',
    submitTime: '2026-05-10 14:30:00',
    updateTime: '2026-05-16 11:30',
    needInvoice: true,
    invoiceTitle: '深圳南山口腔中心',
    taxId: '91440300MA5678901',
    invoiceStatus: '已开具',
    invoiceRemark: '已开具增值税专用发票'
  },
  {
    _id: 'demo005',
    id: 'DR202605190005',
    clinicName: '杭州西湖牙科诊所',
    customerName: '赵医生',
    phone: '13500135005',
    address: '浙江省杭州市西湖区文三路100号创业大厦12楼',
    productModel: 'AirFlow Master',
    itemsList: '喷砂机×1、喷嘴×3、粉仓×1',
    fault: '喷砂压力不稳定，时强时弱，可能是气路堵塞或压力阀故障',
    images: [],
    logisticsCompany: '申通快递',
    logisticsNo: 'ST3344556677889',
    senderAddress: '浙江省杭州市西湖区',
    returnCompany: '',
    returnNo: '',
    returnAddress: '浙江省杭州市西湖区文三路100号',
    status: '待处理',
    submitTime: '2026-05-19 09:10:00',
    updateTime: '2026-05-19 09:10',
    needInvoice: true,
    invoiceTitle: '杭州西湖牙科诊所',
    taxId: '91330106MA2345678',
    invoiceStatus: '待开票'
  },
  {
    _id: 'demo006',
    id: 'DR202605180006',
    clinicName: '成都锦江口腔医院',
    customerName: '刘主任',
    phone: '13400134006',
    address: '四川省成都市锦江区红星路二段88号',
    productModel: 'AutoClave 500',
    itemsList: '高压灭菌器×1、托盘×2、密封圈×1',
    fault: '灭菌循环无法完成，中途报错E03，需要检查加热系统',
    images: [
      'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400'
    ],
    logisticsCompany: '韵达快递',
    logisticsNo: 'YD8899001122334',
    senderAddress: '四川省成都市锦江区',
    returnCompany: '韵达快递',
    returnNo: 'YD4433221100998',
    returnAddress: '四川省成都市锦江区红星路二段88号',
    status: '已发货',
    submitTime: '2026-05-16 11:00:00',
    updateTime: '2026-05-18 15:30',
    needInvoice: false,
    invoiceTitle: '',
    taxId: '',
    invoiceStatus: ''
  }
]

const orders = ref([...demoOrders])
const selectedOrders = ref([])
const importResultVisible = ref(false)
const importResult = ref(null)
const shipDate = ref(new Date().toISOString().slice(0, 10))

const loadOrders = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('adminToken')
    const statusFilter = wo.filter ? toEnglishStatus(wo.filter) : undefined
    const data = await getOrderList(token, statusFilter, 1, 100)
    const transformed = transformOrders(data)
    if (transformed && transformed.length > 0) {
      orders.value = transformed
    }
  } catch (error) {
    console.log('API调用失败，使用演示数据')
  } finally {
    loading.value = false
  }
}

const wo = reactive({ search: '', filter: '', deviceFilter: '', page: 1, pageSize: 10 })

const deviceModels = computed(() => {
  const models = [...new Set(orders.value.map(o => o.productModel).filter(Boolean))]
  return models.sort()
})

const filteredOrders = computed(() =>
  orders.value.filter(o => {
    const keyword = wo.search.trim()
    const searchableText = [o.customerName, o.phone, o.productModel, o.id].filter(Boolean).join(' ')
    return (!wo.filter || o.status === wo.filter) &&
           (!wo.deviceFilter || o.productModel === wo.deviceFilter) &&
           (!keyword || searchableText.includes(keyword))
  })
)

const pagedOrders = computed(() => {
  const start = (wo.page - 1) * wo.pageSize
  return filteredOrders.value.slice(start, start + wo.pageSize)
})

onMounted(() => {
  if (route.query.filter) wo.filter = route.query.filter
  // loadOrders() // 暂时禁用API调用，使用演示数据
})

const drawerVisible = ref(false)
const currentOrder = ref(null)
const newStatus = ref('')
const invoiceStatus = ref('无需开票')
const invoiceForm = reactive({ title: '', taxNo: '', remark: '' })

const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

const openDrawer = (row) => {
  currentOrder.value = row
  newStatus.value = row.status
  invoiceStatus.value = row.invoiceStatus || '无需开票'
  invoiceForm.title = row.invoiceTitle || ''
  invoiceForm.taxNo = row.taxId || ''
  invoiceForm.remark = row.invoiceRemark || ''
  drawerVisible.value = true
}

const confirmStatus = async () => {
  if (!currentOrder.value) return
  loading.value = true
  try {
    const token = localStorage.getItem('adminToken')
    const statusEn = toEnglishStatus(newStatus.value)
    await updateOrderStatus(token, currentOrder.value._id, statusEn)
    ElMessage.success('工单进度更新成功')
    drawerVisible.value = false
    await loadOrders()
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    loading.value = false
  }
}

const saveInvoiceStatus = async () => {
  if (!currentOrder.value) return
  loading.value = true
  try {
    const token = localStorage.getItem('adminToken')
    await updateInvoiceStatus(token, currentOrder.value._id, invoiceStatus.value, {
      title: invoiceForm.title,
      taxNo: invoiceForm.taxNo,
      remark: invoiceForm.remark
    })
    ElMessage.success('开票状态已登记')
    await loadOrders()
    if (currentOrder.value) {
      const fresh = orders.value.find(item => item._id === currentOrder.value._id)
      if (fresh) currentOrder.value = fresh
    }
  } catch (error) {
    ElMessage.error(error.message || '开票状态保存失败')
  } finally {
    loading.value = false
  }
}

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const buildPrintSection = (order) => {
  const rows = [
    ['工单编号', order.id],
    ['提交时间', order.submitTime],
    ['当前状态', order.status],
    ['诊所/单位', order.clinicName],
    ['联系人', order.customerName],
    ['联系电话', order.phone],
    ['回寄地址', order.address],
    ['产品型号', order.productModel],
    ['物品清单', order.itemsList],
    ['故障描述', order.fault],
    ['寄出物流', `${order.logisticsCompany || ''} ${order.logisticsNo || ''}`.trim()],
    ['回寄物流', `${order.returnCompany || ''} ${order.returnNo || ''}`.trim()]
  ]

  return `
    <section class="print-section">
      <h1>报修工单处理单</h1>
      <table>
        ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value || '-')}</td></tr>`).join('')}
      </table>
      <div class="footer">
        <span>工程师签字：____________</span>
        <span>打印时间：${escapeHtml(new Date().toLocaleString('zh-CN', { hour12: false }))}</span>
      </div>
    </section>
  `
}

const openPrintWindow = (printOrders) => {
  if (!printOrders.length) return
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) {
    ElMessage.error('浏览器拦截了打印窗口，请允许弹窗后重试')
    return
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>工单打印-${escapeHtml(printOrders.map(item => item.id).join('_'))}</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #1d2129; margin: 32px; }
          h1 { font-size: 22px; margin: 0 0 18px; }
          table { width: 100%; border-collapse: collapse; }
          td { border: 1px solid #dcdfe6; padding: 10px 12px; font-size: 14px; vertical-align: top; }
          td:first-child { width: 120px; background: #f5f7fa; font-weight: 700; }
          .footer { margin-top: 28px; display: flex; justify-content: space-between; font-size: 13px; color: #606266; }
          .print-section { page-break-after: always; }
          .print-section:last-child { page-break-after: auto; }
          @media print { body { margin: 18mm; } }
        </style>
      </head>
      <body>
        ${printOrders.map(buildPrintSection).join('')}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

const printOrder = () => {
  if (!currentOrder.value) return
  openPrintWindow([currentOrder.value])
}

const printSelectedOrders = () => {
  if (!selectedOrders.value.length) {
    ElMessage.warning('请先勾选要打印的工单')
    return
  }
  openPrintWindow(selectedOrders.value)
}

const downloadImportTemplate = () => {
  const sourceOrders = selectedOrders.value.length ? selectedOrders.value : filteredOrders.value.slice(0, 50)
  const templateRows = sourceOrders.map(order => ({
    '工单编号': order.id,
    '回寄物流公司': order.returnCompany || '顺丰速运',
    '回寄运单号': '',
    '发货日期': shipDate.value,
    '备注': ''
  }))

  const data = templateRows.length ? templateRows : [{
    '工单编号': 'DR202605190001',
    '回寄物流公司': '顺丰速运',
    '回寄运单号': 'SF1234567890',
    '发货日期': shipDate.value,
    '备注': ''
  }]

  const worksheet = XLSX.utils.json_to_sheet(data)
  worksheet['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 24 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '回寄运单导入模板')
  XLSX.writeFile(workbook, `回寄运单导入模板_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

const parseImportRows = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const handleImportFile = async (uploadFile) => {
  const file = uploadFile.raw
  if (!file) return

  importing.value = true
  try {
    const rows = await parseImportRows(file)
    if (!rows.length) {
      ElMessage.warning('Excel 中没有可导入的数据')
      return
    }

    const token = localStorage.getItem('adminToken')
    const result = await batchImportReturnLogistics(token, rows)
    importResult.value = result
    importResultVisible.value = true
    ElMessage.success(`导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`)
    await loadOrders()
  } catch (error) {
    ElMessage.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}

const exportToExcel = () => {
  const dataToExport = filteredOrders.value.map(order => ({
    '工单编号': order.id,
    '提交时间': order.submitTime,
    '当前状态': order.status,
    '诊所名称': order.clinicName,
    '客户姓名': order.customerName,
    '联系电话': order.phone,
    '详细地址(回寄/寄出)': order.address,
    '产品型号': order.productModel,
    '物品清单': order.itemsList,
    '故障描述': order.fault,
    '照片/视频附件': order.images ? order.images.join(' \n ') : '无附件',
    '寄出物流公司': order.logisticsCompany,
    '寄出物流单号': order.logisticsNo,
    '回寄物流公司': order.returnCompany || '暂无',
    '回寄物流单号': order.returnNo || '暂无',
    '需开具发票': order.needInvoice ? '是' : '否',
    '发票抬头': order.invoiceTitle || '-',
    '企业税号': order.taxId || '-',
    '发票状态': order.invoiceStatus || '-',
  }))
  const worksheet = XLSX.utils.json_to_sheet(dataToExport)
  worksheet['!cols'] = [
    { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 20 }, { wch: 10 },
    { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
    { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
    { wch: 12 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '工单明细')
  XLSX.writeFile(workbook, `报修工单导出数据_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
</script>

<style scoped>
.glass-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); margin-bottom: 20px; }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f0f2f5; }
.page-title { font-size: 24px; font-weight: 700; color: #1d2129; margin: 0; letter-spacing: -0.5px; }
.header-stats { display: flex; gap: 16px; }
.stat-item { display: flex; flex-direction: column; align-items: center; padding: 12px 20px; border-radius: 8px; min-width: 80px; transition: all 0.3s; }
.stat-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-label { font-size: 12px; color: #86909c; margin-bottom: 4px; font-weight: 500; }
.stat-value { font-size: 24px; font-weight: 700; }
.stat-pending { background: #fff7e6; }
.stat-pending .stat-value { color: #ff9800; }
.stat-processing { background: #e6f4ff; }
.stat-processing .stat-value { color: #1890ff; }
.stat-shipped { background: #e6f7f0; }
.stat-shipped .stat-value { color: #52c41a; }
.stat-completed { background: #f0f2f5; }
.stat-completed .stat-value { color: #86909c; }

.info-banner { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%); border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #1890ff; }
.banner-icon { color: #1890ff; display: flex; align-items: center; }
.banner-content { flex: 1; }
.banner-title { font-size: 15px; font-weight: 600; color: #1d2129; margin-bottom: 4px; }
.banner-desc { font-size: 13px; color: #4e5969; line-height: 1.6; }
.banner-badge { flex-shrink: 0; }

.workorder-header { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 20px; flex-wrap: wrap; }
.filter-container { display: flex; align-items: center; gap: 16px; }
.toolbar-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.import-summary { display: flex; gap: 10px; margin-bottom: 16px; }
.table-responsive { width: 100%; overflow-x: auto; }
.modern-table { min-width: 900px; }
.modern-table :deep(.el-table__inner-wrapper::before) { display: none; }
.modern-table :deep(th.el-table__cell) { background-color: #f7f8fa !important; color: #4e5969; font-weight: 600; border-bottom: none; font-size: 13px; }
.modern-table :deep(td.el-table__cell) { border-bottom: 1px solid #f0f2f5; padding: 12px 0; }

.clinic-name { font-weight: 600; color: #1d2129; font-size: 14px; margin-bottom: 4px; }
.customer-name { color: #4e5969; font-size: 13px; margin-bottom: 2px; }
.phone-number { color: #86909c; font-size: 12px; font-family: 'Consolas', monospace; }

.product-model { font-weight: 600; color: #1890ff; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
.fault-desc { font-size: 12px; color: #86909c; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }

.logistics-info { font-size: 12px; color: #4e5969; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
.logistics-label { color: #86909c; font-weight: 500; }

.status-tag { font-weight: 600; font-size: 12px; }
.status-待处理 { background: #fff7e6 !important; color: #ff9800 !important; border-color: #ffd666 !important; }
.status-维修中 { background: #e6f4ff !important; color: #1890ff !important; border-color: #91d5ff !important; }
.status-已发货 { background: #e6f7f0 !important; color: #52c41a !important; border-color: #95de64 !important; }
.status-已处理 { background: #f0f2f5 !important; color: #86909c !important; border-color: #d9d9d9 !important; }
.update-time { font-size: 11px; color: #86909c; margin-top: 4px; }

.invoice-tag { font-weight: 600; font-size: 12px; }
.invoice-待开票 { background: #f0f2f5 !important; color: #86909c !important; border-color: #d9d9d9 !important; }
.invoice-开具中 { background: #e6f4ff !important; color: #1890ff !important; border-color: #91d5ff !important; }
.invoice-已开具 { background: #e6f7f0 !important; color: #52c41a !important; border-color: #95de64 !important; }
.no-invoice { color: #86909c; font-size: 12px; }

@media screen and (max-width: 768px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
  .header-stats { width: 100%; overflow-x: auto; }
  .filter-container { flex-direction: column; align-items: stretch !important; gap: 12px; }
  .filter-container .el-input, .filter-container .el-select { width: 100% !important; }
}
</style>
