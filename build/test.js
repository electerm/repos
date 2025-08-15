#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = dirname(__dirname)

async function testServer () {
  try {
    console.log('🧪 Testing Electerm Repository Server...\n')

    // Read release info from temp/release-info.json
    console.log('📖 Reading release info...')
    const releaseInfoPath = join(projectRoot, 'temp/release-info.json')
    const releaseInfoContent = await readFile(releaseInfoPath, 'utf-8')
    const releaseInfo = JSON.parse(releaseInfoContent)
    console.log(`✅ Release info loaded: ${releaseInfo.name} (${releaseInfo.tagName})`)

    // Read GPG secrets from temp/github-secrets.txt
    console.log('🔑 Reading GPG secrets...')
    const secretsPath = join(projectRoot, 'temp/github-secrets.txt')
    const secretsContent = await readFile(secretsPath, 'utf-8')

    // Extract GPG Key ID
    const gpgKeyIdMatch = secretsContent.match(/GPG_KEY_ID\s*Value:\s*([A-F0-9]+)/)
    if (!gpgKeyIdMatch) {
      throw new Error('Could not find GPG_KEY_ID in github-secrets.txt')
    }
    const gpgKeyId = gpgKeyIdMatch[1]
    console.log(`✅ GPG Key ID: ${gpgKeyId}`)

    // Extract GPG Private Key (base64 encoded)
    const gpgPrivateKeyMatch = secretsContent.match(/GPG_PRIVATE_KEY\s*Value:\s*([A-Za-z0-9+/=\s]+?)(?=\n\n|\n2\.|$)/s)
    if (!gpgPrivateKeyMatch) {
      throw new Error('Could not find GPG_PRIVATE_KEY in github-secrets.txt')
    }
    const gpgPrivateKey = gpgPrivateKeyMatch[1].replace(/\s/g, '')
    console.log(`✅ GPG Private Key loaded (${gpgPrivateKey.length} characters)`)

    // Get server configuration
    const serverPort = process.env.PORT || 3000
    const updatePath = process.env.UPDATE_PATH || '/repos-update'
    const serverUrl = `http://localhost:${serverPort}`

    console.log(`\n🌐 Server URL: ${serverUrl}`)
    console.log(`🔒 Update endpoint: ${updatePath}\n`)

    // Test 1: Health check
    console.log('🏥 Testing health endpoint...')
    try {
      const healthResponse = await fetch(`${serverUrl}/health`)
      const healthData = await healthResponse.json()

      if (healthResponse.ok) {
        console.log('✅ Health check passed:', healthData.status)
      } else {
        console.log('❌ Health check failed:', healthResponse.status)
      }
    } catch (error) {
      console.log('❌ Health check failed - Server may not be running:', error.message)
      console.log('💡 Please start the server first: npm start')
      return
    }

    // Test 2: Repository update endpoint
    console.log('\n📦 Testing repository update endpoint...')

    const requestBody = {
      releaseInfo,
      gpgKeyId,
      gpgPrivateKey
    }

    try {
      const updateResponse = await fetch(`${serverUrl}${updatePath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const updateData = await updateResponse.json()

      if (updateResponse.ok) {
        console.log('✅ Repository update successful!')
        console.log('📄 Response:', updateData.message)
        console.log('⏰ Timestamp:', updateData.timestamp)

        if (updateData.output) {
          console.log('\n📋 Build script output:')
          console.log(updateData.output)
        }
      } else {
        console.log('❌ Repository update failed:', updateResponse.status)
        console.log('📄 Error:', updateData.error || updateData.message)
      }
    } catch (error) {
      console.log('❌ Repository update failed:', error.message)
    }

    // Test 3: Check if files were created
    console.log('\n📁 Checking created files...')
    try {
      const reposResponse = await fetch(`${serverUrl}/deb/`)
      if (reposResponse.ok) {
        console.log('✅ Debian repository files are accessible')
      } else {
        console.log('⚠️  Debian repository may not be accessible yet')
      }
    } catch (error) {
      console.log('⚠️  Could not check repository files:', error.message)
    }

    console.log('\n🎉 Test completed!')
    console.log('💡 You can now check the repos/deb directory for generated files')
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('\n📋 Troubleshooting:')
    console.error('1. Make sure the server is running: npm start')
    console.error('2. Check that temp/release-info.json exists')
    console.error('3. Check that temp/github-secrets.txt contains GPG keys')
    console.error('4. Verify .env file has correct UPDATE_PATH')
  }
}

// Run the test
testServer()
