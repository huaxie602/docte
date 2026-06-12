import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import {
  normalizeShippingRows
} from '../pc-admin/src/utils/shippingImport.js'
import {
  parsePrintConfig,
  resolvePrintTemplate,
  getDefaultPrintFieldKeys
} from '../pc-admin/src/utils/orderPrint.js'
import {
  PRODUCT_MODEL_CATALOG,
  flattenProductModels,
  getProductCategoryOptions
} from '../pc-admin/src/utils/productCatalog.js'

const rows = normalizeShippingRows([
  {
    工单编号: 'DR20260610001',
    客户姓名: 'Michelle',
    手机号: '13800138000',
    物流公司: '顺丰速运',
    运单号: 'SF1234567890',
    发货时间: '2026-06-10',
    备注: '今日批量回寄'
  }
], 'return')

assert.equal(rows.length, 1)
assert.equal(rows[0].orderNo, 'DR20260610001')
assert.equal(rows[0].customerName, 'Michelle')
assert.equal(rows[0].phone, '13800138000')
assert.equal(rows[0].logisticsNo, 'SF1234567890')

const printConfig = parsePrintConfig({
  templateMode: 'auto',
  enabledFields: ['order', 'customer', 'returnLogistics', 'printRemark']
})
assert.deepEqual(printConfig.enabledFields, ['order', 'customer', 'returnLogistics', 'printRemark'])
assert.ok(getDefaultPrintFieldKeys().includes('items'))
assert.equal(resolvePrintTemplate({ status: '已回寄' }, printConfig).title, '设备维修回寄清单')
assert.equal(resolvePrintTemplate({ status: '处理中' }, printConfig).title, '售后维修处理单')

assert.ok(PRODUCT_MODEL_CATALOG.length >= 5)
assert.ok(flattenProductModels().length >= 50)
assert.ok(getProductCategoryOptions().some(item => item.value === '牙科手机'))

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const adminSysFunction = readProjectFile('docte-master/uniCloud-alipay/cloudfunctions/cicada-admin-sys/index.obj.js')
const feedbackSchema = readProjectFile('docte-master/uniCloud-alipay/database/cicada_feedbacks.schema.json')
const adminApi = readProjectFile('pc-admin/src/api/admin.js')
const feedbackView = readProjectFile('pc-admin/src/views/Feedback.vue')

assert.match(adminSysFunction, /async\s+handleFeedback\s*\(/)
assert.match(adminSysFunction, /db\.collection\('cicada_feedbacks'\)/)
assert.match(adminSysFunction, /handle_remark/)
assert.match(adminSysFunction, /handle_time/)
assert.match(adminSysFunction, /handle_user_id/)

assert.match(feedbackSchema, /"handle_remark"/)
assert.match(feedbackSchema, /"handle_time"/)
assert.match(feedbackSchema, /"handle_user_id"/)
assert.match(feedbackSchema, /"handle_user_name"/)

assert.match(adminApi, /export\s+const\s+handleFeedback\s*=/)
assert.match(adminApi, /\$\{API_BASE\.adminSys\}\/handleFeedback/)

assert.match(feedbackView, /import\s+\{\s*getFeedbackList,\s*handleFeedback\s*\}/)
assert.match(feedbackView, /await\s+handleFeedback\(/)
assert.doesNotMatch(feedbackView, /currentFeedback\.value\.status\s*=\s*['"]已处理['"]/)

const assetConfig = readProjectFile('docte-master/config/cicada-assets.js')
const contentApi = readProjectFile('docte-master/api/content.js')
const productApi = readProjectFile('docte-master/api/product.js')
const repairApi = readProjectFile('docte-master/api/repair.js')
const cloudUtil = readProjectFile('docte-master/utils/cloud.js')

const projectUrl = (path) => new URL(`../${path}`, import.meta.url)

const requiredCdnAssets = [
  'brand-cicada-tooth-blue-original.png',
  'brand-cicada-tooth-blue.png',
  'logo-cicada-full.jpg',
  'logo-cicada-mark.jpg',
  'photo-building.jpg',
  'photo-factory.jpg',
  'qr-wechat.jpg',
  'survey-poster.png',
  'survey-qr-wechat.jpg'
]

for (const assetName of requiredCdnAssets) {
  const assetUrl = projectUrl(`docte-master/cdn-assets/cicada/${assetName}`)
  assert.ok(existsSync(assetUrl), `missing CDN asset: ${assetName}`)
  assert.ok(statSync(assetUrl).size > 0, `empty CDN asset: ${assetName}`)
}

assert.ok(existsSync(projectUrl('docte-master/static/new-logo.png')), 'missing local new logo asset')
assert.ok(existsSync(projectUrl('docte-master/static/default-user-avatar.png')), 'missing default user avatar asset')

assert.match(assetConfig, /brandToothBlueOriginal:\s*'https:\/\/mp-f0350304-ff3b-4fb8-afcb-ac5e3253da2a\.cdn\.bspapp\.com\/brand-cicada-tooth-blue-original\.png'/)
assert.match(assetConfig, /logoNew:\s*'\/static\/new-logo\.png'/)

for (const [name, source] of [
  ['content api', contentApi],
  ['product api', productApi],
  ['repair api', repairApi],
  ['cloud util', cloudUtil]
]) {
  assert.match(source, /100401/, `${name} should clear auth for extended unauthorized codes`)
  assert.match(source, /removeStorageSync\('token'\)/, `${name} should clear token`)
  assert.match(source, /removeStorageSync\('userInfo'\)/, `${name} should clear user info`)
  assert.match(source, /removeStorageSync\('isLoggedIn'\)/, `${name} should clear login flag`)
}

for (const functionName of ['cicada-client-user', 'cicada-maintenance']) {
  const packageUrl = projectUrl(`docte-master/uniCloud-alipay/cloudfunctions/${functionName}/package.json`)
  assert.ok(existsSync(packageUrl), `missing cloudfunction package: ${functionName}`)
  const pkg = readFileSync(packageUrl, 'utf8')
  assert.match(pkg, new RegExp(`"name"\\s*:\\s*"${functionName}"`))
  assert.match(pkg, new RegExp(`"path"\\s*:\\s*"/${functionName}"`))
}

console.log('[ok] launch readiness feature checks passed')
