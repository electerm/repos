# Electerm Repository Server

A Node.js Express server for hosting and managing Electerm package repositories, specifically designed to serve Debian packages and repository metadata.

## Overview

This server provides:
- Static file serving for repository files
- REST API endpoint for creating/updating Debian repositories
- Automated build process for repository generation
- GitHub Actions integration for CI/CD

## Features

- **Static File Hosting**: Serves repository files from the `repos` folder
- **Debian Repository Management**: Automated creation and management of `.deb` package repositories
- **GitHub Actions Integration**: Accepts repository updates via POST requests from GitHub Actions
- **ESM Module Support**: Built with modern ES modules
- **Express.js Framework**: Fast and minimal web framework

## Installation

1. Clone the repository:
```bash
git clone https://github.com/electerm/repos.git
cd repos
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on port 3000 by default (or the port specified in the `PORT` environment variable).

## API Endpoints

### GET /
Root endpoint that provides basic server information and available endpoints.

### GET /health
Health check endpoint that returns server status and timestamp.

### POST /deb
Creates or updates a Debian repository with the provided parameters.

**Request Body:**
```json
{
  "releaseInfo": "Release information or metadata",
  "gpgKeyId": "GPG key identifier",
  "gpgPrivateKey": "GPG private key for signing"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Debian repository created successfully",
  "output": "Build script output",
  "timestamp": "2025-08-15T10:30:00.000Z"
}
```

### Static Files
All files in the `repos` folder are served statically. For example:
- `https://your-domain.com/deb/` - Debian repository files
- `https://your-domain.com/deb/public.key` - GPG public key

## Repository Structure

```
├── build/
│   └── build-deb.sh          # Debian repository build script
├── repos/                    # Static files served by the server
│   └── deb/                  # Debian repository (created automatically)
├── src/
│   ├── deb-build/           # Template files for Debian repository
│   │   ├── index.html       # Repository information page
│   │   └── public.key       # GPG public key
│   └── server/
│       └── app.js           # Main Express server
├── package.json
└── README.md
```

## Build Process

When the `/deb` endpoint is called:

1. The server validates the required parameters (`releaseInfo`, `gpgKeyId`, `gpgPrivateKey`)
2. Creates the `repos/deb` directory if it doesn't exist
3. Sets environment variables for the build script
4. Executes `build/build-deb.sh` which copies files from `src/deb-build` to `repos/deb`
5. Returns the build results

## GitHub Actions Integration

This server is designed to work with GitHub Actions for automated repository updates. Example workflow:

```yaml
- name: Update Repository
  run: |
    curl -X POST https://your-server.com/deb \
      -H "Content-Type: application/json" \
      -d '{
        "releaseInfo": "${{ github.event.release.body }}",
        "gpgKeyId": "${{ secrets.GPG_KEY_ID }}",
        "gpgPrivateKey": "${{ secrets.GPG_PRIVATE_KEY }}"
      }'
```

## Deployment

### Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

### Production Deployment

1. **VPS Deployment**:
```bash
# Clone and setup
git clone https://github.com/electerm/repos.git
cd repos
npm install

# Start with PM2 (recommended)
npm install -g pm2
pm2 start src/server/app.js --name "electerm-repos"
pm2 startup
pm2 save
```

2. **Docker Deployment**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

3. **Nginx Reverse Proxy** (recommended):
```nginx
server {
    listen 80;
    server_name electerm-repos.html5beta.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Repository URLs

- **Production**: `https://electerm-repos.html5beta.com/deb`
- **Local Development**: `http://localhost:3000/deb`

## Adding to APT Sources

Users can add the repository to their system with:

```bash
# Add the GPG key
curl -fsSL https://electerm-repos.html5beta.com/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/electerm.gpg

# Add the repository
echo "deb [signed-by=/usr/share/keyrings/electerm.gpg] https://electerm-repos.html5beta.com/deb stable main" | sudo tee /etc/apt/sources.list.d/electerm.list

# Update package list
sudo apt update

# Install Electerm
sudo apt install electerm
```

## Development

### Running in Development

```bash
npm start
```

### Testing the API

```bash
# Health check
curl http://localhost:3000/health

# Test repository creation
curl -X POST http://localhost:3000/deb \
  -H "Content-Type: application/json" \
  -d '{
    "releaseInfo": "Test release",
    "gpgKeyId": "test-key-id",
    "gpgPrivateKey": "test-private-key"
  }'
```

## Security Considerations

- **GPG Keys**: Private keys are passed via request body and should be handled securely
- **HTTPS**: Always use HTTPS in production
- **Input Validation**: Server validates required parameters
- **Environment**: Keep sensitive data in environment variables or secrets management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [Electerm](https://github.com/electerm/electerm) - Modern terminal/ssh/sftp client
- [Electerm Website](https://electerm.html5beta.com) - Official website

## Support

For issues and questions:
- GitHub Issues: [https://github.com/electerm/repos/issues](https://github.com/electerm/repos/issues)
- Main Project: [https://github.com/electerm/electerm](https://github.com/electerm/electerm)