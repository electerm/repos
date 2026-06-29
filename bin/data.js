// build data from locale data
import { config } from 'dotenv'
import { resolve } from 'path'
import { cwd, releaseData } from './common.js'
import fs from 'fs'
import dayjs from 'dayjs'

config()

function loadLocales () {
  const dataFolder = resolve(cwd, 'src/data')
  const files = fs.readdirSync(dataFolder).filter(f => f.endsWith('.json'))
  const locales = []
  for (const file of files) {
    const content = JSON.parse(fs.readFileSync(resolve(dataFolder, file), 'utf-8'))
    locales.push(content)
  }
  // Compute urls based on host
  const h = process.env.HOST
  for (const loc of locales) {
    loc.url = loc.slug
      ? `${h}/${loc.slug}/`
      : `${h}/`
  }
  return locales
}

function createReleaseData () {
  const data = releaseData
  if (!data) {
    return {
      assets: {
        linux: {},
        mac: {},
        windows: {}
      },
      version: '0.0.0'
    }
  }
  const assets = data.release.assets
  const version = data.release.tag_name
  const releaseNote = data.release.body.replace(/\r?\n-{3,}\r?\n\r?\nDownload下载:.*$/, '')
  console.log('version:', version)
  const dt = dayjs(assets[0].created_at).format('YYYY-MM-DD')

  return {
    assets: {
      linux: {},
      mac: {},
      windows: {}
    },
    version
  }
}

const locales = loadLocales()

export default {
  desc: 'Electerm Debian Repository',
  keywords: 'electerm,debian,repository,apt,setup,install,linux,terminal,ssh',
  siteName: 'electerm',
  host: process.env.HOST,
  langs: locales,
  ...createReleaseData()
}
