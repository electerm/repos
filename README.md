# Electerm Repositories

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electerm](https://img.shields.io/badge/Electerm-Repo-blue)](https://repos.electerm.org)

[English](README.md) | [简体中文](README.cn.md)

Official package repository hosting for [Electerm](https://github.com/electerm/electerm) — a terminal/SSH/SFTP/Telnet/Serial/RDP/VNC/Spice client.

Live at **<https://repos.electerm.org>**

## What This Project Does

This project builds and serves two GPG-signed Linux package repositories:

| Repository | Format | Distros | URL |
|---|---|---|---|
| Debian/APT | `.deb` | Debian, Ubuntu, etc. | `https://repos.electerm.org/deb` |
| RPM/YUM | `.rpm` | Fedora, RHEL, CentOS, etc. | `https://repos.electerm.org/rpm` |

Both repositories share the **same GPG public key** for signing and verification. Package files themselves are not stored — the worker redirects `.deb`/`.rpm` download requests to GitHub Releases via a mirror.

## Tech Stack

- **Cloudflare Workers** — production hosting (`src/worker.js`)
- **Cloudflare Assets** — static file serving (`public/` directory)
- **Pug** — HTML templating
- **Stylus** — CSS preprocessing
- **Express** — local dev server only
- **GitHub Actions** — CI/CD, auto-deploys on new Electerm releases

## Project Structure

```
├── .github/workflows/
│   └── deploy-on-release.yml    # CI/CD: build + deploy to Cloudflare
├── bin/
│   ├── build                    # Full build script
│   ├── build-css.js             # Compile Stylus → CSS
│   ├── build-html.js            # Compile Pug → HTML (all locales)
│   ├── build-deb.js             # Build Debian repo metadata
│   ├── build-rpm.js             # Build RPM repo metadata
│   ├── fetch-release-info.js    # Fetch latest release from GitHub API
│   ├── dev-server.js            # Local dev server (Express)
│   └── sitemap.js               # Generate sitemap.xml
├── build/
│   ├── build-deb.sh             # Debian repo build script (dpkg-deb, apt metadata)
│   └── build-rpm.sh             # RPM repo build script (createrepo_c)
├── src/
│   ├── worker.js                # Cloudflare Worker entry point
│   ├── css/                     # Stylus stylesheets
│   ├── data/                    # Locale JSON files (en, zh-cn)
│   ├── static/                  # Static assets (public.key, robots.txt, etc.)
│   └── views/                   # Pug templates
│       ├── index.pug            # Landing page
│       ├── deb.pug              # Debian repo setup page
│       ├── rpm.pug              # RPM repo setup page
│       └── parts/               # Shared partials (header, footer, etc.)
├── public/                      # Build output (served by Cloudflare)
├── wrangler.toml                # Cloudflare Workers config
└── package.json
```

## Build Pipeline

Running `npm run build` (or `./bin/build`) executes:

1. Fetch latest release info from GitHub API
2. Compile Stylus → `public/index.bundle.css`
3. Copy static assets to `public/`
4. Compile Pug templates → HTML (for each locale)
5. Build Debian repository metadata (`public/deb/`)
6. Build RPM repository metadata (`public/rpm/`)
7. Generate `sitemap.xml`

## Local Development

```bash
# Install dependencies
npm install

# Start dev server at http://127.0.0.1:6069
npm run dev
```

The dev server (`bin/dev-server.js`) uses Express to serve pages with hot Pug rendering — no build step needed for HTML changes.

For a full production build:

```bash
# Copy sample.env and fill in secrets
cp sample.env .env

# Run full build
npm run build
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Yes | GitHub API token for fetching release info |
| `GPG_KEY_ID` | No | GPG key ID for signing repo metadata |
| `GPG_PRIVATE_KEY` | No | Base64-encoded GPG private key |
| `DEB_FILE_PATH` | No | Local `.deb` file path (skip download) |
| `RPM_FILE_PATH` | No | Local `.rpm` file path (skip download) |
| `SERVER_DEV_PORT` | No | Dev server port (default: 6069) |

## Deployment

Deployment is automated via GitHub Actions (`.github/workflows/deploy-on-release.yml`):

- **On push to `main`** — builds and deploys to Cloudflare Workers
- **On `electerm-release` repository_dispatch** — triggered by new Electerm releases
- **Manual dispatch** — via GitHub Actions UI

GitHub Secrets required:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GPG_KEY_ID`
- `GPG_PRIVATE_KEY`

## Installation Instructions

### Debian/Ubuntu (APT)

```bash
# Add the GPG key
curl -fsSL https://repos.electerm.org/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/electerm.gpg

# Add the repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/electerm.gpg] https://repos.electerm.org/deb stable main" | sudo tee /etc/apt/sources.list.d/electerm.list

# Update and install
sudo apt update
sudo apt install electerm
```

### Fedora/RHEL/CentOS (RPM)

```bash
# Import the GPG key
sudo rpm --import https://repos.electerm.org/rpm/public.key

# Add the repository
sudo tee /etc/yum.repos.d/electerm.repo <<EOF
[electerm]
name=Electerm Repository
baseurl=https://repos.electerm.org/rpm/
enabled=1
gpgcheck=0
repo_gpgcheck=1
gpgkey=https://repos.electerm.org/rpm/public.key
EOF

# Install
sudo dnf install electerm   # or: sudo yum install electerm
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run dev`
5. Submit a pull request

## License

[MIT](LICENSE)

## Related Projects

- [Electerm](https://github.com/electerm/electerm) — Terminal/SSH/SFTP/Telnet/Serial/RDP/VNC/Spice client
- [Electerm Website](https://electerm.org) — Official website
