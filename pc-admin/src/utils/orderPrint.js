const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

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

const buildPrintSection = (order) => {
  const rows = [
    ['工单编号', order.id],
    ['提交时间', order.submitTime],
    ['当前状态', order.status],
    ['诊所/单位', order.clinicName],
    ['联系人', order.customerName],
    ['联系电话', order.phone],
    ['回寄地址', order.address],
    ['产品明细', formatOrderItems(order.itemsList)],
    ['寄出物流', `${order.logisticsCompany || ''} ${order.logisticsNo || ''}`.trim()],
    ['回寄物流', `${order.returnCompany || ''} ${order.returnNo || ''}`.trim()],
    ['随件留言', order.printRemark]
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

export const openPrintWindow = (printOrders = []) => {
  if (!printOrders.length) return true
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) return false

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
  return true
}
