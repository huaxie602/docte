import { readdir, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDirs = [
	resolve(rootDir, 'unpackage/dist/build/mp-weixin/static'),
	resolve(rootDir, 'unpackage/dist/dev/mp-weixin/static')
]

const keepFiles = new Set([
	'brand-cicada-tooth-blue.png',
	'logo-banner.jpg',
	'logo-cicada-full.jpg',
	'logo-cicada-mark.jpg',
	'new-logo.png',
	'photo-factory.jpg',
	'qr-wechat.jpg',
	'survey-poster.png'
])

for (const dir of outputDirs) {
	let files = []
	try {
		files = await readdir(dir)
	} catch {
		continue
	}

	for (const file of files) {
		if (!keepFiles.has(file)) {
			await rm(resolve(dir, file), { force: true, recursive: true })
		}
	}

	console.log(`[prune-static] kept ${keepFiles.size} assets in ${dir}`)
}
