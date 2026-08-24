<h1 align="center" style="padding-top: 60px;padding-bottom: 40px;">
    <a href="https://electerm.org">
        <img src="https://github.com/electerm/electerm-resource/raw/master/static/images/electerm.png", alt="" />
    </a>
</h1>

[English](README.md) | [中文](README.cn.md)

# Electerm 软件包仓库

[![许可证: MIT](https://img.shields.io/badge/许可证-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electerm](https://img.shields.io/badge/Electerm-仓库-blue)](https://repos.electerm.org)

[Electerm](https://github.com/electerm/electerm) 的官方软件包仓库托管项目 — 终端/SSH/SFTP/Telnet/串口/RDP/VNC/Spice 客户端。

线上地址：**<https://repos.electerm.org>**

## 项目功能

本项目构建并提供两个 GPG 签名的 Linux 软件包仓库：

| 仓库 | 格式 | 适用发行版 | 地址 |
|---|---|---|---|
| Debian/APT | `.deb` | Debian、Ubuntu 等 | `https://repos.electerm.org/deb` |
| RPM/YUM | `.rpm` | Fedora、RHEL、CentOS 等 | `https://repos.electerm.org/rpm` |

两个仓库共用**同一把 GPG 公钥**进行签名和验证。软件包文件本身不存储在服务器上 — Worker 会将 `.deb`/`.rpm` 下载请求重定向到 GitHub Releases（通过镜像）。

## 技术栈

- **Cloudflare Workers** — 生产环境托管（`src/worker.js`）
- **Cloudflare Assets** — 静态文件服务（`public/` 目录）
- **Pug** — HTML 模板引擎
- **Stylus** — CSS 预处理器
- **Express** — 仅用于本地开发服务器
- **GitHub Actions** — CI/CD，Electerm 新版本发布时自动部署

## 项目结构

```
├── .github/workflows/
│   └── deploy-on-release.yml    # CI/CD：构建并部署到 Cloudflare
├── bin/
│   ├── build                    # 完整构建脚本
│   ├── build-css.js             # 编译 Stylus → CSS
│   ├── build-html.js            # 编译 Pug → HTML（所有语言）
│   ├── build-deb.js             # 构建 Debian 仓库元数据
│   ├── build-rpm.js             # 构建 RPM 仓库元数据
│   ├── fetch-release-info.js    # 从 GitHub API 获取最新发布信息
│   ├── dev-server.js            # 本地开发服务器（Express）
│   └── sitemap.js               # 生成 sitemap.xml
├── build/
│   ├── build-deb.sh             # Debian 仓库构建脚本（dpkg-deb、apt 元数据）
│   └── build-rpm.sh             # RPM 仓库构建脚本（createrepo_c）
├── src/
│   ├── worker.js                # Cloudflare Worker 入口
│   ├── css/                     # Stylus 样式文件
│   ├── data/                    # 语言 JSON 文件（en、zh-cn）
│   ├── static/                  # 静态资源（public.key、robots.txt 等）
│   └── views/                   # Pug 模板
│       ├── index.pug            # 首页
│       ├── deb.pug              # Debian 仓库配置页
│       ├── rpm.pug              # RPM 仓库配置页
│       └── parts/               # 共享组件（页头、页脚等）
├── public/                      # 构建输出（由 Cloudflare 提供服务）
├── wrangler.toml                # Cloudflare Workers 配置
└── package.json
```

## 构建流程

运行 `npm run build`（或 `./bin/build`）会依次执行：

1. 从 GitHub API 获取最新发布信息
2. 编译 Stylus → `public/index.bundle.css`
3. 复制静态资源到 `public/`
4. 编译 Pug 模板 → HTML（每种语言）
5. 构建 Debian 仓库元数据（`public/deb/`）
6. 构建 RPM 仓库元数据（`public/rpm/`）
7. 生成 `sitemap.xml`

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器，访问 http://127.0.0.1:6069
npm run dev
```

开发服务器（`bin/dev-server.js`）使用 Express 实时渲染 Pug 页面 — 修改 HTML 无需构建步骤。

如需完整的生产构建：

```bash
# 复制 sample.env 并填写密钥
cp sample.env .env

# 运行完整构建
npm run build
```

## 环境变量

| 变量 | 必需 | 说明 |
|---|---|---|
| `GITHUB_TOKEN` | 是 | GitHub API 令牌，用于获取发布信息 |
| `GPG_KEY_ID` | 否 | GPG 密钥 ID，用于签名仓库元数据 |
| `GPG_PRIVATE_KEY` | 否 | Base64 编码的 GPG 私钥 |
| `DEB_FILE_PATH` | 否 | 本地 `.deb` 文件路径（跳过下载） |
| `RPM_FILE_PATH` | 否 | 本地 `.rpm` 文件路径（跳过下载） |
| `SERVER_DEV_PORT` | 否 | 开发服务器端口（默认：6069） |

## 部署

部署通过 GitHub Actions 自动完成（`.github/workflows/deploy-on-release.yml`）：

- **推送到 `main` 分支时** — 构建并部署到 Cloudflare Workers
- **收到 `electerm-release` repository_dispatch 时** — 由 Electerm 新版本发布触发
- **手动触发** — 通过 GitHub Actions 界面

所需 GitHub Secrets：
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `GPG_KEY_ID`
- `GPG_PRIVATE_KEY`

## 安装说明

### Debian/Ubuntu（APT）

```bash
# 添加 GPG 密钥
curl -fsSL https://repos.electerm.org/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/electerm.gpg

# 添加仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/electerm.gpg] https://repos.electerm.org/deb stable main" | sudo tee /etc/apt/sources.list.d/electerm.list

# 更新并安装
sudo apt update
sudo apt install electerm
```

### Fedora/RHEL/CentOS（RPM）

```bash
# 导入 GPG 密钥
sudo rpm --import https://repos.electerm.org/rpm/public.key

# 添加仓库
sudo tee /etc/yum.repos.d/electerm.repo <<EOF
[electerm]
name=Electerm Repository
baseurl=https://repos.electerm.org/rpm/
enabled=1
gpgcheck=0
repo_gpgcheck=1
gpgkey=https://repos.electerm.org/rpm/public.key
EOF

# 安装
sudo dnf install electerm   # 或：sudo yum install electerm
```

## 贡献

1. Fork 本仓库
2. 创建功能分支
3. 进行修改
4. 使用 `npm run dev` 测试
5. 提交 Pull Request

## 关于 electerm

开源终端/ssh/telnet/serialport/RDP/VNC/Spice/sftp/ftp客户端(Linux, Mac, Windows, Android, HarmonyOS)。

除了主流的 Windows/macOS/Linux/Android，electerm 还支持鸿蒙(HarmonyOS)，以及老旧系统——如 Ubuntu 18、Windows 7、macOS 10+，以及国产特殊 Linux 发行版如 UOS、麒麟(Kylin)、龙芯(LoongArch，含旧世界与新世界)。

<p>
  <a href="https://electerm.org">主页 / 下载</a> ·
  <a href="https://theme.electerm.org">主题</a> ·
  <a href="https://github.com/electerm/electerm-web-docker">Docker</a> ·
  <a href="https://demo.electerm.org">在线演示</a> ·
  <a href="https://github.com/electerm/electerm-android">Android</a> ·
  <a href="https://github.com/electerm/electerm-harmony">鸿蒙</a> ·
  <a href="https://appgallery.huawei.com/app/detail?id=org.electerm.electerm">华为应用市场</a> ·
  <a href="https://www.microsoft.com/store/apps/9NCN7272GTFF">微软商店</a> ·
  <a href="https://snapcraft.io/electerm">Snap 商店</a> ·
  <a href="https://repos.electerm.org/deb">deb 仓库</a> ·
  <a href="https://repos.electerm.org/rpm">rpm 仓库</a>
</p>

<div>🌐 <strong><a href="https://cloud.electerm.org">electerm 在线版</a></strong> — 公共免费在线 electerm 应用</div>
<div>🤖 <strong><a href="https://ai.electerm.org">electerm AI</a></strong> — 免费为 electerm 用户提供 AI</div>
<div>💻 <strong><a href="https://github.com/electerm/electerm-web">electerm-web</a></strong> — 运行于浏览器(支持移动设备)的 web app 版本</div>

## 许可证

[MIT](LICENSE)

## 相关项目

- [Electerm](https://github.com/electerm/electerm) — 终端/SSH/SFTP/Telnet/串口/RDP/VNC/Spice 客户端
- [Electerm 官网](https://electerm.org)
