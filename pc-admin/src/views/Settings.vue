<template>
  <div class="glass-card">
    <el-tabs v-model="activeContentTab" class="modern-tabs">
      <el-tab-pane label="保修与收费" name="policy">
        <el-row :gutter="20" style="margin-top:20px;">
          <el-col :xs="24" :sm="12" style="margin-bottom: 16px;">
            <div style="font-weight:600;margin-bottom:12px;">保修政策文本</div>
            <el-input v-model="config.warranty" type="textarea" :rows="8"></el-input>
          </el-col>
          <el-col :xs="24" :sm="12">
            <div style="font-weight:600;margin-bottom:12px;">收费办法说明</div>
            <el-input v-model="config.feePolicy" type="textarea" :rows="8"></el-input>
          </el-col>
        </el-row>
        <div style="margin-top:20px;text-align:center;"><el-button type="primary" @click="saveConfig">保存配置</el-button></div>
      </el-tab-pane>

      <el-tab-pane label="操作教程" name="guide">
        <div class="table-responsive" style="margin-top:20px;">
          <el-table :data="guideItems" class="modern-table" style="width:100%;">
            <el-table-column prop="category" label="教程栏目" width="120"></el-table-column>
            <el-table-column prop="desc" label="功能说明" show-overflow-tooltip></el-table-column>
            <el-table-column prop="file" label="当前文档" show-overflow-tooltip></el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="120"></el-table-column>
            <el-table-column label="操作" width="150" align="right">
              <template #default="{row}">
                <el-button type="primary" link @click="openUploadDialog(row)">上传替换</el-button>
                <el-button type="primary" link @click="openGuidePreview(row)">预览</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>

  <el-dialog v-model="uploadDialogVisible" title="上传替换教程文档" width="560px" align-center>
    <div style="margin-bottom:16px; color:#165DFF; font-weight:600;">
      正在为【{{ currentGuide?.category }}】上传新文档
    </div>
    <el-upload drag action="#" :auto-upload="false" :limit="1" :on-change="handleFileChange" :file-list="uploadFileList">
      <el-icon><UploadFilled /></el-icon>
      <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
    </el-upload>
    <template #footer>
      <el-button @click="uploadDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmUpload">确认上传</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="guidePreviewVisible" :title="guidePreviewTarget ? guidePreviewTarget.category + ' - 预览' : '操作指南预览'" width="560px" align-center>
    <template v-if="guidePreviewTarget">
      <div style="background:#f7f8fa; border-radius:10px; padding:20px; line-height:1.8;">
        <p style="font-weight:600;color:#1d2129;margin:0 0 8px;">{{guidePreviewTarget.category}}</p>
        <p style="margin:0;color:#4e5969;">功能说明：{{guidePreviewTarget.desc}}</p>
        <p style="margin:0;color:#4e5969;">当前文档：{{guidePreviewTarget.file}}</p>
        <p style="margin:0;color:#4e5969;">更新时间：{{guidePreviewTarget.updatedAt}}</p>
        <div style="text-align:center;padding:32px 0 12px;color:#86909c;">【此处模拟展示 PDF 文档内容...】</div>
      </div>
    </template>
    <template #footer>
      <el-button @click="guidePreviewVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { saveSettings, getSettings, getGuides, updateGuide, uploadGuideFile } from '../api/admin.js'

const activeContentTab = ref('policy')

const config = reactive({
  warranty: '',
  feePolicy: ''
})

const loadSettings = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    const data = await getSettings(token)
    config.warranty = data.warranty_policy || ''
    config.feePolicy = data.fee_description || ''
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

const saveConfig = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    await saveSettings(token, {
      warranty_policy: config.warranty,
      fee_description: config.feePolicy
    })
    ElMessage.success('配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

onMounted(() => {
  loadSettings()
  loadGuides()
})

const guideItems = ref([
  {
    _id: 'demo1',
    category: '报修流程',
    desc: '用户端报修操作完整流程说明，包含设备信息填写、故障描述、照片上传等步骤',
    file: '报修流程操作指南_v2.3.pdf',
    updatedAt: '2026-05-15'
  },
  {
    _id: 'demo2',
    category: '物流寄送',
    desc: '设备寄送注意事项、包装要求、物流公司选择及运单号填写说明',
    file: '物流寄送规范手册.pdf',
    updatedAt: '2026-05-10'
  },
  {
    _id: 'demo3',
    category: '发票开具',
    desc: '发票申请流程、抬头填写规范、税号要求及电子发票接收方式',
    file: '发票开具指南_2026版.pdf',
    updatedAt: '2026-05-08'
  },
  {
    _id: 'demo4',
    category: '保修政策',
    desc: '产品保修期限、保修范围、免费维修条件及收费标准说明',
    file: '保修政策说明文档.pdf',
    updatedAt: '2026-04-28'
  },
  {
    _id: 'demo5',
    category: '常见问题',
    desc: '用户常见问题解答，包含账号注册、密码找回、工单查询等高频问题',
    file: 'FAQ常见问题解答.pdf',
    updatedAt: '2026-04-20'
  }
])

const loadGuides = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    const data = await getGuides(token)
    if (data && data.length > 0) {
      guideItems.value = data.map(item => ({
        _id: item._id,
        category: item.category,
        desc: item.desc,
        file: item.file_name,
        updatedAt: item.update_time ? new Date(item.update_time).toISOString().slice(0, 10) : ''
      }))
    }
  } catch (error) {
    console.error('加载教程列表失败，使用演示数据:', error)
  }
}


const uploadDialogVisible = ref(false)
const currentGuide = ref(null)
const uploadFileList = ref([])

const openUploadDialog = (row) => {
  currentGuide.value = row
  uploadFileList.value = []
  uploadDialogVisible.value = true
}
const handleFileChange = (file, fileList) => { uploadFileList.value = fileList }
const confirmUpload = async () => {
  if (!uploadFileList.value.length) { ElMessage.warning('请先选择要上传的文件'); return }
  if (!currentGuide.value) return

  const file = uploadFileList.value[0].raw
  const token = localStorage.getItem('adminToken')

  try {
    const fileContent = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const uploadData = await uploadGuideFile(token, fileContent, file.name, file.type)
    await updateGuide(token, currentGuide.value._id, file.name, uploadData.fileUrl)

    currentGuide.value.file = file.name
    currentGuide.value.updatedAt = new Date().toISOString().slice(0, 10)
    uploadDialogVisible.value = false
    ElMessage.success('文档上传成功')
    await loadGuides()
  } catch (error) {
    ElMessage.error(error.message || '上传失败')
  }
}

const guidePreviewVisible = ref(false)
const guidePreviewTarget = ref(null)
const openGuidePreview = (row) => { guidePreviewTarget.value = row; guidePreviewVisible.value = true }
</script>

<style scoped>
.glass-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); margin-bottom: 20px; }
.table-responsive { width: 100%; overflow-x: auto; }
.modern-table { min-width: 800px; }
.modern-table :deep(.el-table__inner-wrapper::before) { display: none; }
.modern-table :deep(th.el-table__cell) { background-color: #f7f8fa !important; color: #4e5969; font-weight: 600; border-bottom: none; }
.modern-table :deep(td.el-table__cell) { border-bottom: 1px solid #f0f2f5; padding: 12px 0; }
.modern-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background-color: #f0f2f5; }
.modern-tabs :deep(.el-tabs__item) { font-size: 15px; padding: 0 20px; }
</style>
