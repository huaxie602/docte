import brandToothBlue from '@/static/brand-cicada-tooth-blue.png'
import brandToothBlueOriginal from '@/static/brand-cicada-tooth-blue-original.png'
import logoMark from '@/static/logo-cicada-mark.jpg'
import logoFull from '@/static/logo-cicada-full.jpg'
import logoNew from '@/static/new-logo.png'
import photoFactory from '@/static/photo-factory.jpg'
import photoBuilding from '@/static/photo-building.jpg'
import qrWechat from '@/static/qr-wechat.jpg'
import surveyPoster from '@/static/survey-poster.png'
import surveyQrWechat from '@/static/survey-qr-wechat.jpg'

const cdnBaseUrl = 'https://mp-f0350304-ff3b-4fb8-afcb-ac5e3253da2a.cdn.bspapp.com'
const useCdnAssets = import.meta.env.VITE_USE_CDN_ASSETS !== 'false'

const cdnAsset = (name, fallback) => (useCdnAssets ? `${cdnBaseUrl}/${name}` : fallback)

export const cicadaAssets = {
	brandToothBlue: cdnAsset('brand-cicada-tooth-blue.png', brandToothBlue),
	brandToothBlueOriginal: cdnAsset('brand-cicada-tooth-blue.png', brandToothBlueOriginal),
	logoMark: cdnAsset('logo-cicada-mark.jpg', logoMark),
	logoFull: cdnAsset('logo-cicada-full.jpg', logoFull),
	logoNew: cdnAsset('new-logo.png', logoNew),
	photoFactory: cdnAsset('photo-factory.jpg', photoFactory),
	photoBuilding: cdnAsset('photo-building.jpg', photoBuilding),
	qrWechat: cdnAsset('qr-wechat.jpg', qrWechat),
	surveyPoster: cdnAsset('survey-poster.png', surveyPoster),
	surveyQrWechat: cdnAsset('survey-qr-wechat.jpg', surveyQrWechat)
}
