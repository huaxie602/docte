import { copyFile, mkdir, rm, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceDir = resolve(rootDir, 'static')
const outputDir = resolve(rootDir, 'unpackage/dist/build/mp-weixin')
const targetDir = resolve(outputDir, 'static')
const assetFiles = [
	'brand-cicada-tooth-blue.png',
	'logo-banner.jpg',
	'logo-cicada-full.jpg',
	'logo-cicada-mark.jpg',
	'new-logo.png',
	'photo-factory.jpg',
	'qr-wechat.jpg',
	'survey-poster.png'
]

await stat(sourceDir)
await mkdir(outputDir, { recursive: true })
await rm(targetDir, { recursive: true, force: true })
await mkdir(targetDir, { recursive: true })

for (const file of assetFiles) {
	await copyFile(resolve(sourceDir, file), resolve(targetDir, file))
}

console.log(`[copy-static] copied ${assetFiles.length} assets to ${targetDir}`)
