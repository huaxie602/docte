import http from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.MOCK_PORT || 8787)
const TOKEN = 'local-admin-token'

const now = Date.now()

const staff = [
  {
    _id: 'admin001',
    username: 'admin',
    name: 'System Admin',
    phone: '13800138000',
    role: 'admin',
    disabled: false,
    create_time: now - 86400000
  },
  {
    _id: 'engineer001',
    username: 'engineer01',
    name: 'Engineer One',
    phone: '13800138001',
    role: 'engineer',
    disabled: false,
    create_time: now - 43200000
  }
]

const categories = [
  { _id: 'cat001', category_name: '光固化系列', status: 'active', sort: 1 },
  { _id: 'cat002', category_name: '根管系列', status: 'active', sort: 2 },
  { _id: 'cat003', category_name: '种植系列', status: 'active', sort: 3 },
  { _id: 'cat004', category_name: '手机系列', status: 'active', sort: 4 },
  { _id: 'cat005', category_name: '其他产品', status: 'active', sort: 5 }
]

const faults = [
  {
    _id: 'fault001',
    category_id: 'cat001',
    fault_name: '光固化灯不亮或光强不足',
    related_questions: ['CV-215 光固化灯不亮', 'G6 光固化灯充电后亮度弱', '宽谱光固化灯固化慢'],
    check_steps: ['确认电池电量、充电底座、适配器和充电触点是否正常', '检查导光棒是否污染、裂纹、松动或未安装到位', '核对所选模式和时间设置，并用测光表确认实际输出'],
    fix_solutions: ['清洁或更换导光棒，重新插拔并充满电后复测', '更换电池、充电底座、按键膜或 LED 发光组件', '送修检测驱动板、散热结构和测光显示模块'],
    create_time: now - 7200000
  },
  {
    _id: 'fault002',
    category_id: 'cat002',
    fault_name: '根管预备机无法启动或扭矩异常',
    related_questions: ['根管预备机按键后不转', '根管马达工作中自动停机', '根管预备机扭矩报警'],
    check_steps: ['确认手柄电量、充电座、适配器和主机连接状态', '检查机头、锉针、传动轴是否安装到位或卡滞', '核对转速、扭矩、正反转和程序档位设置'],
    fix_solutions: ['清洁并重新安装机头和锉针，排除卡针后复位', '更换充电适配器、电池、按键组件或机头', '送修检测主板、电机、扭矩控制和保护电路'],
    create_time: now - 3600000
  },
  {
    _id: 'fault003',
    category_id: 'cat002',
    fault_name: '牙科根管长度测定仪读数不稳定',
    related_questions: ['根管长度测定仪显示跳动', '根尖定位仪连接后无反应', '测量线连接后读数忽高忽低'],
    check_steps: ['检查测量线、唇夹、锉夹和接口是否氧化、断线或松动', '确认根管内湿度、锉针接触和患者端回路状态', '使用标准测试环或备用附件交叉验证主机与附件'],
    fix_solutions: ['清洁接口并更换测量线、唇夹或锉夹', '重新校准并排除临床接触不良因素', '送修检测测量电路、显示模块和主板'],
    create_time: now - 1800000
  },
  {
    _id: 'fault004',
    category_id: 'cat002',
    fault_name: '热熔牙胶充填系统不升温或温控异常',
    related_questions: ['热熔牙胶枪不升温', '牙胶充填器温度显示异常', '牙胶尖切断器加热慢'],
    check_steps: ['确认电池电量、充电座、手柄和加热针安装状态', '检查温度档位、预热时间和加热针是否积碳或变形', '使用外部测温工具核对实际温度与显示温度'],
    fix_solutions: ['清洁或更换加热针、注射针和电池', '复位温度设置并更换充电座或手柄连接件', '送修检测温控传感器、加热片和主板'],
    create_time: now - 1200000
  },
  {
    _id: 'fault005',
    category_id: 'cat002',
    fault_name: '超声洁牙工作尖无振动或出水异常',
    related_questions: ['洁牙工作尖不振动', '洁牙工作尖出水少', '根管锉使用时断针或变形'],
    check_steps: ['确认工作尖型号、螺纹规格和主机兼容性', '检查工作尖是否磨损、变形、松动或水路堵塞', '检查主机功率、水压和安装扭矩是否符合要求'],
    fix_solutions: ['重新安装工作尖并清洁水路、喷孔和螺纹', '更换磨损或弯曲的工作尖、根管锉和密封件', '送修检测换能器、手柄线缆和主机驱动模块'],
    create_time: now - 900000
  },
  {
    _id: 'fault006',
    category_id: 'cat003',
    fault_name: '牙科种植机扭矩异常或脚踏无响应',
    related_questions: ['牙科种植机脚踏开关无反应', '种植机扭矩不稳定', '牙科低压电动马达自动停止'],
    check_steps: ['检查脚踏开关、马达线缆、主机接口和电源连接', '确认程序档位、转速、扭矩和冷却水设置', '排查弯机头负载、轴承卡滞或消毒进液'],
    fix_solutions: ['重新连接或更换脚踏开关、马达线和冷却水管', '清洁保养弯机头并复位转速/扭矩参数', '送修检测主控板、驱动模块和马达组件'],
    create_time: now - 800000
  },
  {
    _id: 'fault007',
    category_id: 'cat004',
    fault_name: '高速气涡轮手机异响或转速下降',
    related_questions: ['高速手机噪音变大', '气涡轮手机转速不足', '高速手机夹针不稳'],
    check_steps: ['检查供气压力、水雾和快接头密封圈', '确认车针规格、夹持状态和注油保养情况', '观察轴承、机芯、喷雾孔和夹头是否磨损或堵塞'],
    fix_solutions: ['清洁水路和喷孔，按规范注油保养', '更换密封圈、轴承、机芯或夹头', '严重磨损时更换整支手机或返厂维修'],
    create_time: now - 700000
  },
  {
    _id: 'fault008',
    category_id: 'cat004',
    fault_name: '低速气动马达手机和弯手机转速不稳',
    related_questions: ['低速气动马达转速不稳', '弯手机发热或异响', '喷砂洁牙机出粉异常'],
    check_steps: ['确认气压、水压、接头和密封圈状态', '检查弯手机传动、轴承、齿轮和润滑状态', '喷砂类设备检查粉罐、喷嘴、水路和气路堵塞情况'],
    fix_solutions: ['清洁气水通道并规范注油保养', '更换密封圈、轴承、齿轮、喷嘴或粉罐组件', '送修检测气水分配组件和传动部件'],
    create_time: now - 600000
  },
  {
    _id: 'fault009',
    category_id: 'cat005',
    fault_name: '树脂加热器不升温或无法恒温',
    related_questions: ['树脂加热器不升温', '树脂加热器温度过高', '复合树脂加热设备显示异常'],
    check_steps: ['确认电源、温度档位和加热腔接触状态', '使用外部测温工具核对实际温度', '检查传感器、加热片和显示面板是否异常'],
    fix_solutions: ['清洁加热腔并复位温度设置', '更换温控传感器、加热片或面板', '送修检测电源板和温控模块'],
    create_time: now - 500000
  },
  {
    _id: 'fault010',
    category_id: 'cat005',
    fault_name: '医用放大镜镜架松动或视野异常',
    related_questions: ['医用放大镜视野模糊', '放大镜镜架松动', '便携打磨机启动后抖动'],
    check_steps: ['检查镜片、镜筒、瞳距和佩戴角度是否正确', '检查镜架螺丝、铰链、鼻托和灯线固定状态', '便携打磨机检查手柄、轴承、电池和夹头'],
    fix_solutions: ['清洁镜片并重新调节瞳距、焦距和佩戴角度', '紧固或更换镜架、铰链、鼻托和灯线固定件', '便携打磨机送修检测电池、轴承、夹头和调速板'],
    create_time: now - 400000
  }
]

const orders = [
  {
    _id: 'order001',
    order_no: 'WX20260609001',
    status: 'pending',
    user_id: 'user001',
    create_time: now - 3600000,
    update_time: now - 1800000,
    ship_out_info: {
      name: 'Zhang San',
      phone: '13900139000',
      unit: 'Demo Dental Clinic',
      region: 'Shanghai',
      detail: 'No. 88 Test Road',
      logistics_company: 'SF Express',
      logistics_no: 'SF1000000001'
    },
    ship_back_info: {
      name: 'Zhang San',
      phone: '13900139000',
      unit: 'Demo Dental Clinic',
      region: 'Shanghai',
      detail: 'No. 88 Test Road'
    },
    itemsList: [
      {
        _id: 'item001',
        product_name: 'LED Curing Light',
        product_model: 'CV-215(G6)A',
        sn: 'SN-A001',
        buy_date: '2026-05-20',
        fault_desc: 'Light output is weak after charging',
        quantity: 1,
        media_urls: []
      }
    ],
    invoice_info: {
      need_invoice: true,
      title: 'Demo Dental Clinic',
      tax_no: '91310000TEST0001',
      status: 'pending',
      remark: ''
    },
    quote_status: 'pending',
    parts_fee: 0,
    labor_fee: 0,
    total_price: 0,
    payment_status: 'pending',
    payment_proofs: [],
    timeline: [
      { title: 'Order submitted', desc: 'Local mock data', time: now - 3600000 }
    ]
  },
  {
    _id: 'order002',
    order_no: 'WX20260609002',
    status: 'fixing',
    user_id: 'user002',
    create_time: now - 86400000,
    update_time: now - 1200000,
    ship_out_info: {
      name: 'Li Si',
      phone: '13900139001',
      unit: 'Sample Clinic',
      region: 'Hangzhou',
      detail: 'No. 12 Cloud Street',
      logistics_company: 'YTO',
      logistics_no: 'YT1000000002'
    },
    ship_back_info: {
      name: 'Li Si',
      phone: '13900139001',
      unit: 'Sample Clinic',
      region: 'Hangzhou',
      detail: 'No. 12 Cloud Street',
      logistics_company: '',
      logistics_no: ''
    },
    itemsList: [
      {
        _id: 'item002',
        product_name: 'Brushless Endo Motor',
        product_model: 'T-Fine-II (Smart)',
        sn: 'SN-B002',
        buy_date: '2026-03-18',
        fault_desc: 'Motor stops intermittently during use',
        quantity: 1,
        media_urls: []
      }
    ],
    invoice_info: {
      need_invoice: false,
      title: '',
      tax_no: '',
      status: 'none',
      remark: ''
    },
    quote_status: 'issued',
    quote_items: [
      { name: 'Handpiece cable', desc: 'Replace worn motor cable', partsFee: 260, laborFee: 80 }
    ],
    parts_fee: 260,
    labor_fee: 80,
    total_price: 340,
    payment_status: 'uploaded',
    payment_proofs: [{ url: '', name: 'transfer-proof.png', time: now - 600000 }],
    timeline: [
      { title: 'Received', desc: 'Device arrived at service center', time: now - 80000000 },
      { title: 'Repairing', desc: 'Engineer is checking the issue', time: now - 1200000 }
    ]
  }
]

const feedbacks = [
  {
    _id: 'fb001',
    type: 'suggestion',
    contact_value: '13900139000',
    content: 'Local feedback sample',
    status: 'pending',
    create_time: now - 5400000
  }
]

let settings = {
  warranty_policy: '本店售出的 CICADA 思科达牙科设备提供 90 天免费保修服务。保修范围覆盖正常使用下出现的非人为性能故障，常见设备包括光固化系列、根管系列、种植系列、手机系列、树脂加热器、医用放大镜、便携打磨机和牙科医师椅等。人为跌落、进水、私自拆机、非原厂耗材或异常消毒导致的损坏不在免费保修范围内。',
  fee_description: '1. 检测费：免费。\n2. 保修期内：符合免费保修条件的设备免收维修费。\n3. 保修期外或非保修范围：根据检测结果收取配件费和人工维修费，报价确认后再维修。\n4. 易耗件、导光棒、测量线、密封圈、轴承、喷嘴等配件按实际更换情况计费。',
  company_name: 'Foshan Cicada Dental Instrument Co., Ltd',
  contact_phone: '+86-0757-85775667',
  contact_email: 'info@cicadadental.com',
  contact_address: 'B5-2F, Guangdong New Light Source Industrial Base, South of Luocun Avenue, Nanhai, Foshan, Guangdong',
  print_config: JSON.stringify({
    title: 'Repair Return Sheet',
    paperSize: 'A4',
    copies: 1,
    showSignature: true,
    footer: 'Local mock print footer.'
  })
}

const guides = [
  { _id: 'guide001', type: 'quick', category: 'Quick guide', desc: 'Quick start guide', file_name: '', file_url: '', file_type: '', sort: 1, update_time: now },
  { _id: 'guide002', type: 'repair', category: 'Repair guide', desc: 'Repair workflow guide', file_name: '', file_url: '', file_type: '', sort: 2, update_time: now },
  { _id: 'guide003', type: 'query', category: 'Query guide', desc: 'Progress query guide', file_name: '', file_url: '', file_type: '', sort: 3, update_time: now },
  { _id: 'guide004', type: 'invoice', category: 'Invoice guide', desc: 'Invoice application guide', file_name: '', file_url: '', file_type: '', sort: 4, update_time: now }
]

const ok = (data = undefined, extra = {}) => (
  data === undefined ? { code: 0, ...extra } : { code: 0, data, ...extra }
)

const fail = (msg = 'Local mock error', code = -1) => ({ code, msg })

const sendJson = (res, payload, statusCode = 200) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  })
  res.end(JSON.stringify(payload))
}

const readBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const requireToken = (body) => {
  if (!body.token && !String(body.Authorization || '').includes(TOKEN)) {
    return fail('Local login expired', 401)
  }
  return null
}

const filterOrders = (body) => {
  const keyword = String(body.keyword || '').trim().toLowerCase()
  const status = body.status
  let list = orders

  if (status) list = list.filter(order => order.status === status)
  if (keyword) {
    list = list.filter(order => JSON.stringify(order).toLowerCase().includes(keyword))
  }
  if (body.deviceModel) {
    list = list.filter(order => (order.itemsList || []).some(item => item.product_model === body.deviceModel))
  }

  return list
}

const orderMetrics = () => {
  const pendingStatuses = new Set(['pending', 'sent', 'received'])
  const repairingStatuses = new Set(['inspecting', 'fixing', 'processing'])
  return {
    pendingCount: orders.filter(order => pendingStatuses.has(order.status)).length,
    todayCount: orders.filter(order => now - order.create_time < 86400000).length,
    totalCount: orders.length,
    newOrders: orders.length,
    pendingOrders: orders.filter(order => pendingStatuses.has(order.status)).length,
    repairingOrders: orders.filter(order => repairingStatuses.has(order.status)).length,
    completedOrders: orders.filter(order => order.status === 'completed').length,
    avgHandleHours: 8.5,
    quotePendingOrders: orders.filter(order => order.quote_status === 'pending').length,
    invoicePendingOrders: orders.filter(order => order.invoice_info?.need_invoice && order.invoice_info?.status !== 'issued').length,
    totalOrders: orders.length,
    totalFeedbacks: feedbacks.length,
    pendingFeedbacks: feedbacks.filter(item => item.status === 'pending').length
  }
}

const handleAdminSys = (method, body) => {
  if (method === 'adminLogin') {
    if (body.username === 'admin' && body.password === 'admin123') {
      return ok(undefined, {
        msg: 'Local login success',
        token: TOKEN,
        userId: 'admin001',
        role: 'admin',
        isAdmin: true,
        isEngineer: false,
        user: {
          _id: 'admin001',
          username: 'admin',
          name: 'System Admin',
          role: 'admin'
        }
      })
    }
    return fail('Wrong local username or password')
  }

  const authError = requireToken(body)
  if (authError) return authError

  if (method === 'changeMyPassword') return ok()
  if (method === 'getFeedbackStats') {
    return ok({ unreadCount: feedbacks.filter(item => item.status === 'pending').length })
  }
  if (method === 'getFeedbackList') return ok(feedbacks)
  if (method === 'getSettings') return ok(settings)
  if (method === 'saveSettings') {
    settings = { ...settings, ...(body.settings || {}) }
    return ok(settings)
  }
  if (method === 'getGuides') return ok(guides)
  if (method === 'uploadGuideFile') {
    return ok({
      fileName: body.fileName,
      fileUrl: `http://localhost:${PORT}/mock-files/${encodeURIComponent(body.fileName || 'guide-file')}`,
      fileType: body.fileType || ''
    })
  }
  if (method === 'updateGuide') {
    const guide = guides.find(item => item._id === body.guide_id)
    if (guide) {
      Object.assign(guide, {
        file_name: body.file_name ?? guide.file_name,
        file_url: body.file_url ?? guide.file_url,
        file_type: body.file_type ?? guide.file_type,
        desc: body.desc ?? guide.desc,
        update_time: Date.now()
      })
    }
    return ok(guide || {})
  }
  if (method === 'resetUserPassword') return ok()
  if (method === 'manageStaff') {
    if (body.action === 'list') return ok(staff)
    if (body.action === 'add') {
      const next = {
        _id: randomUUID(),
        username: body.staff?.username || `staff${staff.length + 1}`,
        name: body.staff?.name || '',
        phone: body.staff?.phone || '',
        role: body.staff?.role || 'engineer',
        disabled: false,
        create_time: Date.now()
      }
      staff.push(next)
      return ok(next)
    }
    if (body.action === 'edit') {
      const item = staff.find(user => user._id === body.staff?._id)
      if (item) Object.assign(item, body.staff)
      return ok(item || {})
    }
    if (body.action === 'disable') {
      const item = staff.find(user => user._id === body.staff?._id)
      if (item) item.disabled = body.staff?.disabled !== false
      return ok(item || {})
    }
  }

  return fail(`Unknown local admin-sys method: ${method}`)
}

const handleAdminOrder = (method, body) => {
  const authError = requireToken(body)
  if (authError) return authError

  if (method === 'getStatistics') return ok(orderMetrics())
  if (method === 'getTodoSummary') {
    const metrics = orderMetrics()
    return ok({
      groups: [
        { key: 'pending', title: 'Pending orders', desc: 'Orders waiting for first handling', count: metrics.pendingOrders },
        { key: 'quote', title: 'Quote pending', desc: 'Orders waiting for quote', count: metrics.quotePendingOrders },
        { key: 'invoice', title: 'Invoice pending', desc: 'Orders waiting for invoice handling', count: metrics.invoicePendingOrders }
      ]
    })
  }
  if (method === 'getDashboardSummary') {
    return ok({
      metrics: orderMetrics(),
      trend: [
        { label: '2026-06-07', newOrders: 1, completedOrders: 0, pendingOrders: 1 },
        { label: '2026-06-08', newOrders: 0, completedOrders: 1, pendingOrders: 1 },
        { label: '2026-06-09', newOrders: 1, completedOrders: 0, pendingOrders: 2 }
      ]
    })
  }
  if (method === 'getAdminOrderList') {
    const list = filterOrders(body)
    const page = Number(body.page || 1)
    const pageSize = Number(body.pageSize || list.length || 20)
    const start = (page - 1) * pageSize
    return ok({
      list: list.slice(start, start + pageSize),
      total: list.length,
      deviceModels: [...new Set(orders.flatMap(order => (order.itemsList || []).map(item => item.product_model).filter(Boolean)))]
    })
  }

  const orderId = body.order_id || body.orderId
  const order = orders.find(item => item._id === orderId)
  if (method === 'updateOrderStatus' && order) {
    order.status = body.status || order.status
    order.update_time = Date.now()
    return ok(order)
  }
  if (method === 'updateRemarks' && order) {
    order.admin_remark = body.adminRemark || ''
    order.print_remark = body.printRemark || ''
    order.update_time = Date.now()
    return ok(order)
  }
  if (method === 'updateInvoiceStatus' && order) {
    order.invoice_info = {
      ...(order.invoice_info || {}),
      ...(body.invoice || {}),
      status: body.status || order.invoice_info?.status
    }
    order.update_time = Date.now()
    return ok(order)
  }
  if (method === 'updateOrderQuote' && order) {
    const quote = body.quote || {}
    order.quote_items = quote.items || order.quote_items || []
    order.quote_status = quote.status || 'issued'
    order.quote_remark = quote.remark || ''
    order.parts_fee = order.quote_items.reduce((sum, item) => sum + Number(item.partsFee || item.parts_fee || 0), 0)
    order.labor_fee = order.quote_items.reduce((sum, item) => sum + Number(item.laborFee || item.labor_fee || 0), 0)
    order.total_price = order.parts_fee + order.labor_fee
    order.update_time = Date.now()
    return ok(order)
  }
  if (method === 'updatePaymentStatus' && order) {
    order.payment_status = body.status || 'paid'
    order.update_time = Date.now()
    return ok(order)
  }
  if (method === 'addTimeline' && order) {
    order.timeline = order.timeline || []
    order.timeline.push({ title: body.title, desc: body.desc, time: Date.now() })
    order.update_time = Date.now()
    return ok(order)
  }
  if (method === 'batchUpdateShipping' || method === 'batchImportReturnLogistics' || method === 'batchImportLogistics') {
    return ok({ success: true, total: Array.isArray(body.rows) ? body.rows.length : 0, failed: [] })
  }

  return fail(`Unknown local admin-order method: ${method}`)
}

const handleAdminKb = (method, body) => {
  const authError = requireToken(body)
  if (authError) return authError

  if (method === 'manageCategories') {
    if (body.action === 'list') return ok(categories)
    if (body.action === 'add') {
      const next = { _id: randomUUID(), ...(body.data || {}), sort: categories.length + 1 }
      categories.push(next)
      return ok(next)
    }
    if (body.action === 'update') {
      const item = categories.find(category => category._id === body.id)
      if (item) Object.assign(item, body.data || {})
      return ok(item || {})
    }
    if (body.action === 'delete') {
      const index = categories.findIndex(category => category._id === body.id)
      if (index >= 0) categories.splice(index, 1)
      return ok()
    }
  }

  if (method === 'manageFaultKb') {
    if (body.action === 'list') return ok(faults)
    if (body.action === 'add') {
      const next = { _id: randomUUID(), ...(body.data || {}), create_time: Date.now() }
      faults.push(next)
      return ok(next)
    }
    if (body.action === 'update') {
      const item = faults.find(fault => fault._id === body.id)
      if (item) Object.assign(item, body.data || {})
      return ok(item || {})
    }
    if (body.action === 'delete') {
      const index = faults.findIndex(fault => fault._id === body.id)
      if (index >= 0) faults.splice(index, 1)
      return ok()
    }
  }

  return fail(`Unknown local admin-kb method: ${method}`)
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, ok())
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const [, service, method] = url.pathname.split('/')

  if (url.pathname.startsWith('/mock-files/')) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    res.end('Local mock file')
    return
  }

  const body = await readBody(req)
  let payload

  if (service === 'cicada-admin-sys') payload = handleAdminSys(method, body)
  else if (service === 'cicada-admin-order') payload = handleAdminOrder(method, body)
  else if (service === 'cicada-admin-kb') payload = handleAdminKb(method, body)
  else payload = fail(`Unknown local service: ${service}`)

  sendJson(res, payload)
})

server.listen(PORT, () => {
  console.log(`Local mock backend running at http://localhost:${PORT}`)
  console.log('Login with admin / admin123')
})
