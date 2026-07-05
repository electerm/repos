// use dotenv to load environment variables from .env file
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.dirname(__dirname)
const RELEASE_DATA_FILE = path.join(PROJECT_ROOT, 'data', 'electerm-github-release.json')
const BUILD_RPM_SCRIPT = path.join(PROJECT_ROOT, 'build', 'build-rpm.sh')

async function buildRpm () {
  console.log('Loading release data from:', RELEASE_DATA_FILE)

  // Load release data
  const releaseData = JSON.parse(fs.readFileSync(RELEASE_DATA_FILE, 'utf8'))
  const release = releaseData.release

  // Find the .rpm asset for x86_64 (non-legacy)
  const rpmAsset = release.assets.find(asset =>
    asset.name.includes('.rpm') && asset.name.includes('x86_64') && !asset.name.includes('-legacy')
  )

  if (!rpmAsset) {
    throw new Error('No .rpm asset found for x86_64 architecture')
  }

  console.log('Found .rpm asset:', rpmAsset.name)

  // Prepare environment variables
  const env = {
    ...process.env,
    GPG_KEY_ID: process.env.GPG_KEY_ID || '',
    GPG_PRIVATE_KEY: process.env.GPG_PRIVATE_KEY || '',
    RELEASE_TAG: release.tag_name,
    RELEASE_DATE: release.published_at,
    RPM_ASSET_NAME: rpmAsset.name,
    RPM_ASSET_URL: rpmAsset.browser_download_url
  }

  // Pass RPM_FILE_PATH if it exists
  if (process.env.RPM_FILE_PATH) {
    env.RPM_FILE_PATH = process.env.RPM_FILE_PATH
  }

  console.log('Environment variables prepared:')
  console.log('- RELEASE_TAG:', env.RELEASE_TAG)
  console.log('- RELEASE_DATE:', env.RELEASE_DATE)
  console.log('- RPM_ASSET_NAME:', env.RPM_ASSET_NAME)
  console.log('- RPM_ASSET_URL:', env.RPM_ASSET_URL)
  if (env.RPM_FILE_PATH) {
    console.log('- RPM_FILE_PATH:', env.RPM_FILE_PATH)
  }

  // Run build-rpm.sh script
  console.log('Running build-rpm.sh script...')

  const buildProcess = spawn('bash', [BUILD_RPM_SCRIPT], {
    env,
    stdio: 'inherit'
  })

  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ RPM repository build completed successfully!')
    } else {
      console.error('❌ RPM repository build failed with code:', code)
      process.exit(1)
    }
  })

  buildProcess.on('error', (error) => {
    console.error('❌ Failed to start build process:', error)
    process.exit(1)
  })
}

// Run the build process
buildRpm()
