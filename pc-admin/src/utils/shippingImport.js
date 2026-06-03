import ExcelJS from 'exceljs'

const normalizeText = (value) => String(value ?? '').trim()

const pickCell = (row, keys) => {
  for (const key of keys) {
    const value = normalizeText(row[key])
    if (value) return value
  }
  return ''
}

const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const downloadShippingTemplate = async () => {
  const rows = [
    ['工单编号', '物流公司', '运单号'],
    ['DR2026... (请填写真实编号)', '顺丰速运 (必填)', 'SF123456... (必填)']
  ]
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('批量回寄发货模板')
  worksheet.addRows(rows)
  worksheet.columns = [{ width: 28 }, { width: 18 }, { width: 24 }]
  await downloadWorkbook(workbook, '批量回寄发货模板.xlsx')
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

export const parseShippingExcelBuffer = async (buffer) => {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const headers = []
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = normalizeText(cell.value)
  })

  const rows = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const rowData = {}
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber]
      if (key) rowData[key] = cell.value
    })
    rows.push(rowData)
  })
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
