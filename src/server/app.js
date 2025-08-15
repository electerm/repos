import express from 'express'
import { exec } from 'child_process'
import { promisify } from 'util'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const execAsync = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const app = express()
const PORT = process.env.PORT || 3000
const UPDATE_PATH = process.env.UPDATE_PATH || '/repos-update'

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Repository update endpoint (configurable path for security)
app.post(UPDATE_PATH, async (req, res) => {
  try {
    const { releaseInfo, gpgKeyId, gpgPrivateKey } = req.body

    // Log the whole request body for debugging
    // console.log('Request body:', JSON.stringify(req.body, null, 2))

    // Validate required parameters
    if (!releaseInfo || !gpgKeyId || !gpgPrivateKey) {
      return res.status(400).json({
        error: 'Missing required parameters: releaseInfo, gpgKeyId, gpgPrivateKey'
      })
    }

    console.log('Creating debian repository with params:', {
      releaseInfo: typeof releaseInfo,
      gpgKeyId: gpgKeyId ? 'provided' : 'missing',
      gpgPrivateKey: gpgPrivateKey ? 'provided' : 'missing'
    })

    // Parse release info to extract amd64 .deb asset
    let debAsset = null
    let releaseTag = ''
    let releaseDate = ''

    try {
      const release = typeof releaseInfo === 'string' ? JSON.parse(releaseInfo) : releaseInfo
      releaseTag = release.tagName || ''
      releaseDate = release.publishedAt || release.createdAt || ''

      // Find the amd64 .deb asset
      const amd64Asset = release.assets.find(asset =>
        asset.name.includes('amd64') && asset.name.endsWith('.deb')
      )

      if (amd64Asset) {
        debAsset = {
          name: amd64Asset.name,
          url: amd64Asset.browser_download_url,
          downloadUrl: amd64Asset.browser_download_url // Use the browser download URL
        }
        console.log(`Found amd64 .deb asset: ${debAsset.name}`)
        console.log(`Download URL: ${debAsset.downloadUrl}`)
      } else {
        console.log('No amd64 .deb asset found in release')
      }
    } catch (error) {
      console.error('Error parsing release info:', error)
      return res.status(400).json({
        error: 'Invalid release info format',
        message: error.message
      })
    }

    // Set environment variables for the build script
    const env = {
      ...process.env,
      GPG_KEY_ID: gpgKeyId,
      GPG_PRIVATE_KEY: gpgPrivateKey,
      RELEASE_TAG: releaseTag,
      RELEASE_DATE: releaseDate
    }

    // Add .deb asset information if available
    if (debAsset) {
      env.DEB_ASSET_NAME = debAsset.name
      env.DEB_ASSET_URL = debAsset.downloadUrl
    }

    // Execute build-deb.sh script
    const buildScriptPath = join(__dirname, '../../build/build-deb.sh')
    console.log('Executing build script:', buildScriptPath)

    const { stdout, stderr } = await execAsync(`bash "${buildScriptPath}"`, {
      env,
      cwd: join(__dirname, '../..')
    })

    console.log('Build script output:', stdout)
    if (stderr) {
      console.warn('Build script stderr:', stderr)
    }

    res.json({
      success: true,
      message: 'Debian repository created successfully',
      output: stdout,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error creating debian repository:', error)
    res.status(500).json({
      error: 'Failed to create debian repository',
      message: error.message,
      timestamp: new Date().toISOString()
    })
  }
})

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Electerm Repository Server',
    endpoints: {
      '/health': 'Health check'
    }
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`Electerm repos server running on port ${PORT}`)
  console.log(`Repository update endpoint: ${UPDATE_PATH}`)
})

export default app
