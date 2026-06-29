import { config as conf } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { exec } from 'child_process'

conf()

export const cwd = process.cwd()
export const env = process.env
export const isProd = env.NODE_ENV === 'production'
const packPath = resolve(cwd, 'package.json')
const releasePath = resolve(cwd, 'data/electerm-github-release.json')
export const releaseData = existsSync(releasePath)
  ? JSON.parse(readFileSync(releasePath, 'utf-8'))
  : null
export const pack = JSON.parse(readFileSync(packPath, 'utf-8'))
export const version = pack.version
export const viewPath = resolve(cwd, 'src/views')
export const staticPath = resolve(cwd, 'src/static')

export function exe (command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      resolve(stdout.trim())
    })
  })
}
