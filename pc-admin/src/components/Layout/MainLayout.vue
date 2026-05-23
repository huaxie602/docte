<template>
  <div class="main-layout">
    <div class="mobile-mask" :class="{ 'show': isMobile && sidebarOpen }" @click="sidebarOpen = false"></div>

    <div class="sidebar" :class="{ 'open': sidebarOpen }">
      <div class="sidebar-logo">
        <img src="https://dummyimage.com/100x30/165DFF/ffffff.png&text=CICADA" alt="logo" style="border-radius:4px;">
        <span>后台管理</span>
      </div>
      <el-menu :default-active="activeMenu" class="el-menu-vertical" @select="handleMenuSelect">
        <el-menu-item index="home"><el-icon><HomeFilled /></el-icon><span>工作台首页</span></el-menu-item>
        <el-menu-item index="workorder"><el-icon><Document /></el-icon><span>报修工单管理</span></el-menu-item>
        <el-menu-item index="faultdb"><el-icon><Warning /></el-icon><span>产品故障知识库</span></el-menu-item>
        <el-menu-item index="users"><el-icon><User /></el-icon><span>用户管理</span></el-menu-item>
        <el-menu-item index="feedback"><el-icon><ChatDotSquare /></el-icon><span>投诉与建议</span></el-menu-item>
        <el-menu-item index="settings"><el-icon><Setting /></el-icon><span>小程序基础配置</span></el-menu-item>
      </el-menu>
    </div>

    <div class="main-container">
      <div class="top-header">
        <div class="header-left">
          <el-icon class="hamburger" @click="sidebarOpen = !sidebarOpen"><Fold /></el-icon>
          <div class="breadcrumb-title">{{ menuTitles[activeMenu] || '检修管理后台' }}</div>
        </div>
        <div class="header-actions">
          <el-button type="primary" plain round size="small" class="top-btn-text"><el-icon><Monitor /></el-icon> 访问小程序</el-button>
          <el-dropdown>
            <el-avatar size="32" src="https://dummyimage.com/64x64/e8f3ff/165DFF.png&text=Admin" style="cursor:pointer;"></el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="profileDrawerVisible = true">
                  <el-icon><User /></el-icon>
                  个人信息
                </el-dropdown-item>
                <el-dropdown-item @click="openPwdDialog">
                  <el-icon><Lock /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item @click="handleLogout" style="color:#F56C6C;">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="content-area">
        <div class="content-wrapper">
          <router-view />
        </div>
      </div>
    </div>

    <el-drawer v-model="profileDrawerVisible" title="个人信息" direction="rtl" :size="isMobile ? '100%' : '400px'">
      <div style="display:flex; flex-direction:column; align-items:center; padding: 8px 0 24px;">
        <el-avatar :size="80" src="https://dummyimage.com/64x64/e8f3ff/165DFF.png&text=Admin"></el-avatar>
      </div>
      <el-form :model="profileForm" label-width="90px">
        <el-form-item label="登录账号">
          <el-input v-model="profileForm.username" disabled></el-input>
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="profileForm.realName" placeholder="请输入真实姓名"></el-input>
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="profileForm.phone" placeholder="请输入联系电话"></el-input>
        </el-form-item>
        <el-form-item label="系统角色">
          <el-input v-model="profileForm.role" disabled></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="saveProfile">保存修改</el-button>
      </template>
    </el-drawer>

    <el-dialog title="修改登录密码" v-model="pwdDialogVisible" width="400px" align-center>
      <el-form :model="pwdForm" label-width="100px">
        <el-form-item label="原密码">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password placeholder="请输入原密码"></el-input>
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPassword" type="password" show-password placeholder="请输入新密码"></el-input>
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveNewPassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const isMobile = ref(false)
const sidebarOpen = ref(false)

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) sidebarOpen.value = false
}
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => { window.removeEventListener('resize', checkMobile) })

const menuTitles = {
  home: '工作台首页', workorder: '报修工单处理中心', faultdb: '产品分类与故障预设',
  users: '用户管理', settings: '小程序图文及政策配置', feedback: '客户投诉与建议列表'
}

const getMenuFromPath = () => route.path.replace(/^\//, '') || 'home'
const activeMenu = ref(getMenuFromPath())
watch(() => route.path, () => { activeMenu.value = getMenuFromPath() })

const handleMenuSelect = (index) => {
  activeMenu.value = index
  router.push('/' + index)
  if (isMobile.value) sidebarOpen.value = false
}

const handleLogout = () => {
  ElMessage.success('已安全退出系统')
  router.push('/login')
}

const profileDrawerVisible = ref(false)
const profileForm = reactive({ username: 'admin', realName: '陈管理', phone: '13500000000', role: '管理员' })
const saveProfile = () => { profileDrawerVisible.value = false; ElMessage.success('个人信息更新成功') }

const pwdDialogVisible = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const openPwdDialog = () => {
  pwdForm.oldPassword = ''
  pwdForm.newPassword = ''
  pwdForm.confirmPassword = ''
  pwdDialogVisible.value = true
}

const saveNewPassword = () => {
  const currentPassword = localStorage.getItem('adminPwd') || 'admin123'
  if (pwdForm.oldPassword !== currentPassword) { ElMessage.error('原密码不正确'); return }
  if (!pwdForm.newPassword) { ElMessage.warning('请输入新密码'); return }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) { ElMessage.error('两次输入的新密码不一致'); return }
  localStorage.setItem('adminPwd', pwdForm.newPassword)
  pwdDialogVisible.value = false
  ElMessage.success('密码修改成功，请使用新密码重新登录')
  handleLogout()
}
</script>

<style scoped>
.main-layout { display: flex; height: 100vh; width: 100%; position: relative; }

.mobile-mask { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 1000; transition: opacity 0.3s; opacity: 0; }
.mobile-mask.show { display: block; opacity: 1; }

.sidebar { width: var(--sidebar-width); background: #fff; display: flex; flex-direction: column; box-shadow: 2px 0 8px rgba(0,0,0,0.02); z-index: 1001; transition: transform 0.3s ease; flex-shrink: 0; }
.sidebar-logo { height: 60px; display: flex; align-items: center; padding: 0 20px; border-bottom: 1px solid #f0f2f5; flex-shrink: 0; }
.sidebar-logo img { height: 24px; margin-right: 10px; }
.sidebar-logo span { font-size: 18px; font-weight: 600; color: #1d2129; letter-spacing: 1px; white-space: nowrap; }
.el-menu-vertical { border-right: none; flex: 1; padding: 10px; overflow-y: auto; }

.main-container { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

.top-header { height: 60px; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); z-index: 9; flex-shrink: 0; }
.header-left { display: flex; align-items: center; }
.hamburger { display: none; cursor: pointer; font-size: 22px; margin-right: 12px; color: #4e5969; }
.breadcrumb-title { font-size: 16px; font-weight: 600; color: #1d2129; white-space: nowrap; }
.header-actions { display: flex; align-items: center; gap: 16px; }

.content-area { flex: 1; overflow-y: auto; box-sizing: border-box; }
.content-wrapper { max-width: 1440px; margin: 0 auto; padding: 24px; }

@media screen and (max-width: 768px) {
  .content-wrapper { padding: 16px; }
  .sidebar { position: fixed; top: 0; bottom: 0; left: 0; transform: translateX(-100%); }
  .sidebar.open { transform: translateX(0); }
  .hamburger { display: block; }
  .header-actions .top-btn-text { display: none; }
}
</style>
