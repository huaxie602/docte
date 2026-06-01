import * as XLSX from 'xlsx'

const normalizeText = (value) => String(value ?? '').trim()

const pickCell = (row, keys) => {
  for (const key of keys) {
    const value = normalizeText(row[key])
    if (value) return value
  }
  return ''
}

export const downloadShippingTemplate = () => {
  const rows = [
    ['工单编号', '物流公司', '运单号'],
    ['DR2026... (请填写真实编号)', '顺丰速运 (必填)', 'SF123456... (必填)']
  ]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 24 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '批量回寄发货模板')
  XLSX.writeFile(workbook, '批量回寄发货模板.xlsx')
}

export const normalizeShippingRows = (rows = []) => {
  return rows
    .map((row = {}) => ({
      orderNo: pickCell(row, ['orderNo', 'order_no', '工单编号', '工单号']),
      returnCompany: pickCell(row, ['returnCompany', 'return_company', 'logistics_company', '回寄物流公司', '物流公司']),
      returnNo: pickCell(row, ['returnNo', 'return_no', 'logistics_no', 'trackingNo', '回寄运单号', '运单号', '快递单号'])
    }))
    .filter(item => item.orderNo || item.returnCompany || item.returnNo)
}

export const parseShippingExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return normalizeShippingRows(rows)
}

export const parseShippingExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        resolve(parseShippingExcelBuffer(event.target.result))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
