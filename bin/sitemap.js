import fs from 'fs/promises'
import { createSitemap } from 'sitemaps'
import { cwd } from './common.js'
import { resolve } from 'path'
import dayjs from 'dayjs'
import data from './data.js'

const fmt = 'YYYY-MM-DD'

async function buildSiteMap () {
  const urls = []
  const host = data.host || 'https://repos.electerm.org'

  // Index pages for each locale
  for (const loc of data.langs) {
    const idxPath = loc.slug
      ? `public/${loc.slug}/index.html`
      : 'public/index.html'
    try {
      const state = await fs.stat(resolve(cwd, idxPath))
      urls.push({
        loc: loc.slug ? `${host}/${loc.slug}/` : host,
        lastmod: dayjs(state.mtime).format(fmt),
        changefreq: 'weekly',
        priority: 1
      })
    } catch (e) {}
  }

  // Deb pages for each locale
  for (const loc of data.langs) {
    const debPath = loc.slug
      ? `public/${loc.slug}/deb/index.html`
      : 'public/deb/index.html'
    try {
      const state = await fs.stat(resolve(cwd, debPath))
      urls.push({
        loc: loc.slug ? `${host}/${loc.slug}/deb/` : `${host}/deb/`,
        lastmod: dayjs(state.mtime).format(fmt),
        changefreq: 'weekly',
        priority: 0.9
      })
    } catch (e) {}
  }

  // Privacy policy page (English only)
  try {
    const state = await fs.stat(resolve(cwd, 'public/privacy-policy/index.html'))
    urls.push({
      loc: `${host}/privacy-policy/`,
      lastmod: dayjs(state.mtime).format(fmt),
      changefreq: 'monthly',
      priority: 0.5
    })
  } catch (e) {}

  createSitemap({
    filePath: resolve(cwd, 'public/sitemap.xml'),
    urls
  })
}

buildSiteMap()
