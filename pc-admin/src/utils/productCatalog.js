export const PRODUCT_MODEL_CATALOG = [
  {
    category: '牙科手机',
    models: [
      'CICADA CX207-F', 'CICADA CX207-G', 'CICADA CX207-H', 'CICADA CX235',
      'CICADA CX235C', 'CICADA CX235-1', 'CICADA CX235-2', 'CICADA CX235-3',
      'CICADA CX235-4', 'CICADA CX235-5', 'CICADA CX235-6', 'CICADA CX235-7'
    ]
  },
  {
    category: '低速套装',
    models: [
      'CICADA CX235-SET', 'CICADA CX235-M4', 'CICADA CX235-B2', 'CICADA CX235-C',
      'CICADA CX235-E', 'CICADA CX235-CA', 'CICADA CX235-SH', 'CICADA CX235-RA'
    ]
  },
  {
    category: '种植手机',
    models: [
      'CICADA Implant 20:1', 'CICADA Implant LED 20:1', 'CICADA Implant SG20',
      'CICADA Implant SG20L', 'CICADA Implant 1:1', 'CICADA Implant Contra Angle',
      'CICADA Implant External', 'CICADA Implant Mini'
    ]
  },
  {
    category: '洁牙设备',
    models: [
      'CICADA Ultrasonic Scaler UDS', 'CICADA Scaler LED', 'CICADA Scaler Built-in',
      'CICADA Scaler Handpiece', 'CICADA Air Polisher', 'CICADA Perio Scaler',
      'CICADA Endo Scaler', 'CICADA Scaling Tip Kit'
    ]
  },
  {
    category: '光固化与根管',
    models: [
      'CICADA Curing Light LED', 'CICADA Curing Light Pro', 'CICADA Apex Locator',
      'CICADA Endo Motor', 'CICADA Endo Motor Pro', 'CICADA Obturation Pen',
      'CICADA Gutta Cutter', 'CICADA Root Canal Kit'
    ]
  },
  {
    category: '空压与影像',
    models: [
      'CICADA Oil Free Compressor', 'CICADA Dental Compressor 30L',
      'CICADA Dental Compressor 60L', 'CICADA Intraoral Camera',
      'CICADA X-Ray Sensor', 'CICADA X-Ray Unit', 'CICADA Film Viewer'
    ]
  },
  {
    category: '配件耗材',
    models: [
      'CICADA Cartridge Standard', 'CICADA Cartridge LED', 'CICADA Bur Adapter',
      'CICADA Coupling 2H', 'CICADA Coupling 4H', 'CICADA Fiber Rod',
      'CICADA Spray Nozzle', 'CICADA Repair Kit'
    ]
  }
]

export const getProductCategoryOptions = () => PRODUCT_MODEL_CATALOG.map(item => ({
  label: item.category,
  value: item.category
}))

export const flattenProductModels = () => {
  return [...new Set(PRODUCT_MODEL_CATALOG.flatMap(item => item.models))].sort()
}

export const getModelsByCategory = (category = '') => {
  if (!category) return flattenProductModels()
  const matched = PRODUCT_MODEL_CATALOG.find(item => item.category === category)
  return matched ? [...matched.models] : []
}

export const findProductCategoryByModel = (model = '') => {
  const normalized = String(model || '').trim()
  if (!normalized) return ''
  const matched = PRODUCT_MODEL_CATALOG.find(item => item.models.includes(normalized))
  return matched ? matched.category : ''
}
