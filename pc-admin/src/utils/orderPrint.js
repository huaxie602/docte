const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const defaultPrintConfig = {
  title: '设备维修回寄单',
  paperSize: 'A4',
  copies: 1,
  showSignature: true,
  templateMode: 'auto',
  enabledFields: ['order', 'customer', 'items', 'inboundLogistics', 'returnLogistics', 'printRemark'],
  footer: '感谢您的信任！为了您的设备健康，建议定期维护保养。'
}

const printFieldDefinitions = [
  { key: 'order', label: '工单信息' },
  { key: 'customer', label: '客户信息' },
  { key: 'items', label: '产品明细' },
  { key: 'inboundLogistics', label: '寄入物流' },
  { key: 'returnLogistics', label: '回寄物流' },
  { key: 'printRemark', label: '随件留言' },
  { key: 'invoice', label: '发票信息' }
]

export const getDefaultPrintFieldKeys = () => printFieldDefinitions.map(field => field.key)
export const getPrintFieldDefinitions = () => [...printFieldDefinitions]

export const parsePrintConfig = (value) => {
  const mergeConfig = (config = {}) => ({
    ...defaultPrintConfig,
    ...config,
    enabledFields: Array.isArray(config.enabledFields) && config.enabledFields.length
      ? config.enabledFields
      : [...defaultPrintConfig.enabledFields]
  })

  if (!value) return mergeConfig()
  if (typeof value === 'object') return mergeConfig(value)
  try {
    return mergeConfig(JSON.parse(value))
  } catch (error) {
    return mergeConfig()
  }
}

export const resolvePrintTemplate = (order = {}, rawConfig = {}) => {
  const config = parsePrintConfig(rawConfig)
  if (config.templateMode && config.templateMode !== 'auto') {
    const titleMap = {
      'repair-sheet': '售后维修处理单',
      'return-list': '设备维修回寄清单',
      'repair-receipt': config.title || defaultPrintConfig.title
    }
    return { key: config.templateMode, title: titleMap[config.templateMode] || config.title || defaultPrintConfig.title }
  }

  const status = String(order.status || '')
  if (['已回寄', '已发货', '已完成', '已处理'].some(item => status.includes(item))) {
    return { key: 'return-list', title: '设备维修回寄清单' }
  }
  if (['处理中', '维修中', '已签收'].some(item => status.includes(item))) {
    return { key: 'repair-sheet', title: '售后维修处理单' }
  }
  return { key: 'repair-receipt', title: config.title || defaultPrintConfig.title }
}

export const formatOrderItems = (items = []) => {
  return items.map((item, index) => {
    const lines = [
      `产品${index + 1}: ${item.product_name || '-'}`,
      `型号: ${item.product_model || '-'}`,
      `SN: ${item.sn || '-'}`,
      `购买日期: ${item.buy_date || '-'}`,
      `故障描述: ${item.fault_desc || '-'}`
    ]
    return lines.join('；')
  }).join('\n')
}

const getPaperStyle = (paperSize) => {
  if (paperSize === 'A5') return '@page { size: A5; margin: 12mm; } body { margin: 12mm; }'
  if (paperSize === 'receipt-80') return '@page { size: 80mm auto; margin: 4mm; } body { margin: 4mm; } td { font-size: 12px; }'
  return '@page { size: A4; margin: 18mm; } body { margin: 18mm; }'
}

const buildPrintRows = (order = {}, config = {}) => {
  const enabled = new Set(config.enabledFields || defaultPrintConfig.enabledFields)
  const rows = []

  if (enabled.has('order')) {
    rows.push(['工单编号', order.id], ['提交时间', order.submitTime], ['当前状态', order.status])
  }
  if (enabled.has('customer')) {
    rows.push(['诊所/单位', order.clinicName], ['联系人', order.customerName], ['联系电话', order.phone], ['回寄地址', order.address])
  }
  if (enabled.has('items')) rows.push(['产品明细', formatOrderItems(order.itemsList)])
  if (enabled.has('inboundLogistics')) rows.push(['寄入物流', `${order.logisticsCompany || ''} ${order.logisticsNo || ''}`.trim()])
  if (enabled.has('returnLogistics')) rows.push(['回寄物流', `${order.returnCompany || ''} ${order.returnNo || ''}`.trim()])
  if (enabled.has('invoice')) rows.push(['发票信息', `${order.invoiceTitle || ''} ${order.taxId || ''}`.trim()])
  if (enabled.has('printRemark')) rows.push(['随件留言', order.printRemark])

  return rows
}

const buildPrintSection = (order, config) => {
  const template = resolvePrintTemplate(order, config)
  const rows = buildPrintRows(order, config)

  return `
    <section class="print-section">
      <h1>${escapeHtml(template.title)}</h1>
      <table>
        ${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value || '-')}</td></tr>`).join('')}
      </table>
      ${config.showSignature ? '<div class="signature">工程师签字：____________　客户签收：____________</div>' : ''}
      <div class="footer">
        <span>${escapeHtml(config.footer || '')}</span>
        <span>打印时间：${escapeHtml(new Date().toLocaleString('zh-CN', { hour12: false }))}</span>
      </div>
    </section>
  `
}

export const openPrintWindow = (printOrders = [], rawConfig = {}) => {
  if (!printOrders.length) return true
  const config = parsePrintConfig(rawConfig)
  const copies = Math.min(Math.max(Number(config.copies) || 1, 1), 5)
  const expandedOrders = Array.from({ length: copies }).flatMap(() => printOrders)
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return false

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>工单打印-${escapeHtml(printOrders.map(item => item.id).join('_'))}</title>
        <style>
          ${getPaperStyle(config.paperSize)}
          body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #1d2129; }
          h1 { font-size: 22px; margin: 0 0 18px; text-align: center; }
          table { width: 100%; border-collapse: collapse; }
          td { border: 1px solid #dcdfe6; padding: 10px 12px; font-size: 14px; vertical-align: top; white-space: pre-line; }
          td:first-child { width: 120px; background: #f5f7fa; font-weight: 700; }
          .signature { margin-top: 24px; display: flex; justify-content: space-between; font-size: 14px; }
          .footer { margin-top: 24px; display: flex; justify-content: space-between; gap: 24px; font-size: 13px; color: #606266; }
          .print-section { page-break-after: always; }
          .print-section:last-child { page-break-after: auto; }
        </style>
      </head>
      <body>
        ${expandedOrders.map(order => buildPrintSection(order, config)).join('')}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  return true
}
