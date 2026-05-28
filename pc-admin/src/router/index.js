import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import MainLayout from '../components/Layout/MainLayout.vue'
import Home from '../views/Home.vue'
import WorkOrder from '../views/WorkOrder.vue'
import FaultDB from '../views/FaultDB.vue'
import Users from '../views/Users.vue'
import Feedback from '../views/Feedback.vue'
import Settings from '../views/Settings.vue'
import Summary from '../views/Summary.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: Login },
    {
      path: '/',
      component: MainLayout,
      redirect: '/home',
      children: [
        { path: 'home', name: 'Home', component: Home },
        { path: 'workorder', name: 'WorkOrder', component: WorkOrder },
        { path: 'faultdb', name: 'FaultDB', component: FaultDB },
        { path: 'users', name: 'Users', component: Users },
        { path: 'feedback', name: 'Feedback', component: Feedback },
        { path: 'summary', name: 'Summary', component: Summary },
        { path: 'settings', name: 'Settings', component: Settings },
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  if (to.name !== 'Login' && !localStorage.getItem('adminToken')) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
