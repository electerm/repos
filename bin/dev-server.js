import logger from 'morgan'
import { viewPath, env, staticPath, cwd } from './common.js'
import data from './data.js'
import express from 'express'
import stylus from 'stylus'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const devPort = env.SERVER_DEV_PORT || 6069
const host = env.SERVER_HOST || '127.0.0.1'
const h = `http://${host}:${devPort}`

// Update locale URLs for dev server
for (const loc of data.langs) {
  loc.url = loc.slug
    ? `${h}/${loc.slug}/`
    : `${h}/`
}

function renderPage (req, res, viewName, langSlug, overrides = {}) {
  const loc = data.langs.find(l => l.slug === langSlug)
  if (!loc) return res.status(404).send('Not found')
  res.render(viewName, {
    ...data,
    host: h,
    dev: true,
    cssUrl: '/index.bundle.css',
    langCode: loc.langCode,
    lang: loc.lang,
    langs: data.langs,
    currFlag: loc.flag,
    currName: loc.name,
    desc: loc.lang.desc,
    currentPage: '',
    ...overrides
  })
}

function createServer () {
  const app = express()

  app.use(logger('tiny'))
  app.use(express.json())
  app.use(express.urlencoded({
    extended: true
  }))

  app.use(express.static(staticPath))
  app.set('views', viewPath)
  app.set('view engine', 'pug')

  // Serve compiled CSS
  app.get('/index.bundle.css', (req, res) => {
    try {
      const files = [
        'src/css/basic.styl',
        'src/css/home.styl'
      ]
      let css = ''
      for (const file of files) {
        const filePath = resolve(cwd, file)
        const content = readFileSync(filePath, 'utf-8')
        const compiled = stylus(content)
          .set('filename', filePath)
          .set('compress', false)
          .render()
        css += compiled + '\n'
      }
      res.setHeader('Content-Type', 'text/css')
      res.send(css)
    } catch (err) {
      console.error('Stylus compilation error:', err)
      res.status(500).send('CSS compilation error')
    }
  })

  // API country endpoint
  app.get('/api/country', (req, res) => {
    const country = (req.headers['cf-ipcountry'] || req.ip === '127.0.0.1' ? 'AT' : req.ip).toUpperCase()
    res.json({ country })
  })

  // Index pages
  app.get('/', (req, res) => renderPage(req, res, 'index', '', { currentPage: '' }))
  app.get('/cn/', (req, res) => renderPage(req, res, 'index', 'cn', { url: `${h}/cn/`, currentPage: '' }))

  // Deb pages
  app.get('/deb', (req, res) => renderPage(req, res, 'deb', '', {
    url: `${h}/deb/`,
    currentPage: 'deb/',
    desc: data.langs.find(l => l.slug === '').lang.debSubtitle
  }))
  app.get('/cn/deb', (req, res) => renderPage(req, res, 'deb', 'cn', {
    url: `${h}/cn/deb/`,
    currentPage: 'deb/',
    desc: data.langs.find(l => l.slug === 'cn').lang.debSubtitle
  }))

  // Privacy policy page (English only)
  app.get('/privacy-policy', (req, res) => renderPage(req, res, 'privacy-policy', '', { url: `${h}/privacy-policy/`, currentPage: 'privacy-policy' }))

  app.listen(devPort, host, () => {
    console.log(`server started at http://${host}:${devPort}`)
  })
}

createServer()
