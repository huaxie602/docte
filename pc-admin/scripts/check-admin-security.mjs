import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const repoRoot = path.resolve(projectRoot, '..')

const adminSysPath = path.join(repoRoot, 'docte-master', 'uniCloud-alipay', 'cloudfunctions', 'cicada-admin-sys', 'index.obj.js')
const requestPath = path.join(projectRoot, 'src', 'utils', 'request.js')

const adminSysSource = fs.readFileSync(adminSysPath, 'utf8')
const requestSource = fs.readFileSync(requestPath, 'utf8')

const forbiddenLogPatterns = [
  /console\.log\([^)]*password/is,
  /console\.log\([^)]*密码/is,
  /console\.log\([^)]*token/is,
  /console\.log\([^)]*httpInfo/is,
  /console\.log\([^)]*解析后的参数/is,
  /console\.log\([^)]*数据库查询结果/is,
  /console\.log\([^)]*接收到的参数/is,
  /console\.log\([^)]*登录请求/is
]

let failed = false

for (const pattern of forbiddenLogPatterns) {
  if (pattern.test(adminSysSource)) {
    console.error(`[fail] cicada-admin-sys contains sensitive debug logging: ${pattern}`)
    failed = true
  }
}

if (!requestSource.includes("localStorage.getItem('adminToken')") && !requestSource.includes('localStorage.getItem("adminToken")')) {
  console.error('[fail] request interceptor does not read adminToken from localStorage')
  failed = true
}

if (!/Authorization\s*=\s*`Bearer \$\{[^}]+}/.test(requestSource)) {
  console.error('[fail] request interceptor does not attach Authorization Bearer token')
  failed = true
}

if (!failed) {
  console.log('[ok] admin security checks passed')
} else {
  process.exitCode = 1
}
