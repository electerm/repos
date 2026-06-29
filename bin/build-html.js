import data from './data.js'
import { buildPug } from './build-bug.js'
import { resolve } from 'path'
import { cwd } from './common.js'
import fs from 'fs/promises'

async function main () {
  const h = process.env.HOST

  // Build index for each locale
  const indexFrom = resolve(cwd, 'src/views/index.pug')

  for (const loc of data.langs) {
    const { slug, langCode, lang, flag, name } = loc

    if (slug === '') {
      // English → /index.html
      const to = resolve(cwd, 'public/index.html')
      await buildPug(indexFrom, to, {
        ...data,
        langCode,
        lang,
        langs: data.langs,
        currFlag: flag,
        currName: name,
        desc: lang.desc,
        url: h,
        currentPage: '',
        cssUrl: '/index.bundle.css'
      })
      console.log(`✅ Built /index.html (en)`)
    } else {
      // Other locales → /{slug}/index.html
      const dir = resolve(cwd, `public/${slug}`)
      await fs.mkdir(dir, { recursive: true })
      await buildPug(indexFrom, resolve(dir, 'index.html'), {
        ...data,
        langCode,
        lang,
        langs: data.langs,
        currFlag: flag,
        currName: name,
        desc: lang.desc,
        url: `${h}/${slug}/`,
        currentPage: '',
        cssUrl: '/index.bundle.css'
      })
      console.log(`✅ Built /${slug}/index.html`)
    }
  }

  // Build deb page for each locale
  const debFrom = resolve(cwd, 'src/views/deb.pug')

  for (const loc of data.langs) {
    const { slug, langCode, lang, flag, name } = loc

    if (slug === '') {
      // English → /deb/index.html
      const dir = resolve(cwd, 'public/deb')
      await fs.mkdir(dir, { recursive: true })
      await buildPug(debFrom, resolve(dir, 'index.html'), {
        ...data,
        langCode,
        lang,
        langs: data.langs,
        currFlag: flag,
        currName: name,
        desc: lang.debSubtitle,
        url: `${h}/deb/`,
        currentPage: 'deb/',
        cssUrl: '/index.bundle.css'
      })
      console.log(`✅ Built /deb/index.html (en)`)
    } else {
      // Other locales → /{slug}/deb/index.html
      const dir = resolve(cwd, `public/${slug}/deb`)
      await fs.mkdir(dir, { recursive: true })
      await buildPug(debFrom, resolve(dir, 'index.html'), {
        ...data,
        langCode,
        lang,
        langs: data.langs,
        currFlag: flag,
        currName: name,
        desc: lang.debSubtitle,
        url: `${h}/${slug}/deb/`,
        currentPage: 'deb/',
        cssUrl: '/index.bundle.css'
      })
      console.log(`✅ Built /${slug}/deb/index.html`)
    }
  }

  // Build privacy policy page (English only)
  const privacyFrom = resolve(cwd, 'src/views/privacy-policy.pug')
  const enLoc = data.langs.find(l => l.slug === '')
  const privacyDir = resolve(cwd, 'public/privacy-policy')
  await fs.mkdir(privacyDir, { recursive: true })
  await buildPug(privacyFrom, resolve(privacyDir, 'index.html'), {
    ...data,
    langCode: enLoc.langCode,
    lang: enLoc.lang,
    langs: data.langs,
    currFlag: enLoc.flag,
    currName: enLoc.name,
    desc: 'Privacy Policy',
    url: `${h}/privacy-policy/`,
    currentPage: 'privacy-policy',
    cssUrl: '/index.bundle.css'
  })
  console.log(`✅ Built /privacy-policy/index.html`)

  const { version } = data
  await fs.writeFile(resolve(cwd, 'public/version.html'), version)
}

main()
