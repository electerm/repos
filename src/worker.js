// First-party mirror endpoints for GitHub release assets.
//
// .deb/.rpm downloads used to be redirected to mirror.electerm.org, which in
// turn forwarded to the community proxy gh-proxy.org. That proxy is unreliable
// (frequent timeouts), so we now redirect straight to first-party CDNs:
//   - Mainland China  -> AtomGit official mirror (domestic CDN, fast/stable in CN)
//   - everywhere else -> Cloudflare R2 (electerm-store.html5beta.com)
const ATOMGIT_RELEASE_BASE =
  "https://atomgit.com/electerm/electerm/releases/download";
const R2_BASE = "https://electerm-store.html5beta.com/r";

/**
 * Build the download URL of a release asset, choosing a mirror by client country.
 * @param {string} version - release version without the leading "v", e.g. "5.5.66"
 * @param {string} filename - release asset file name
 * @param {string} country - ISO 3166-1 alpha-2 country code from request.cf
 * @returns {string} absolute download URL
 */
function releaseAssetUrl(version, filename, country) {
  const isCN = String(country || "").toUpperCase() === "CN";
  return isCN
    ? `${ATOMGIT_RELEASE_BASE}/v${version}/${filename}`
    : `${R2_BASE}/${filename}`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const country = (request.cf && request.cf.country) || "";

    // Redirect all requests from electerm-repos.html5beta.com to repos.electerm.org
    if (url.hostname === "electerm-repos.html5beta.com") {
      const redirectUrl = `https://repos.electerm.org${url.pathname}${url.search}`;
      return Response.redirect(redirectUrl, 308);
    }

    const path = url.pathname;

    // API endpoint for country detection
    if (path === "/api/country") {
      const country = (request.cf && request.cf.country) || "";
      return new Response(JSON.stringify({ country }), {
        headers: { "content-type": "application/json" }
      });
    }

    // Redirect .deb file requests to mirror (the .deb is not stored in the pool)
    // Static metadata files (dists/, pool/, public.key, InRelease, Release.gpg)
    // are served automatically by Cloudflare static assets before the worker runs.
    if (path.endsWith(".deb")) {
      const match = path.match(/electerm-([\d.]+(?:-[a-z0-9.]+)?)-linux-amd64\.deb$/);
      if (match) {
        const version = match[1];
        const filename = path.split("/").pop();
        const redirectUrl = releaseAssetUrl(version, filename, country);
        return Response.redirect(redirectUrl, 302);
      }
    }

    // Redirect .rpm file requests to mirror (the .rpm is not stored in the repo)
    // Static metadata files (repodata/, public.key) are served automatically
    // by Cloudflare static assets before the worker runs.
    if (path.endsWith(".rpm")) {
      const match = path.match(/electerm-([\d.]+(?:-[a-z0-9.]+)?)-linux-(x86_64|aarch64|armv7l)\.rpm$/);
      if (match) {
        const version = match[1];
        const filename = path.split("/").pop();
        const redirectUrl = releaseAssetUrl(version, filename, country);
        return Response.redirect(redirectUrl, 302);
      }
    }

    // Fallback: serve the static 404 page with proper 404 status
    return serveNotFound(env);
  },
};

async function serveNotFound(env) {
  try {
    const notFoundUrl = new URL("https://placeholder/404.html");
    const res = await env.ASSETS.fetch(new Request(notFoundUrl));
    if (res.ok) {
      return new Response(res.body, {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-cache",
        },
      });
    }
  } catch (_) {
    // fall through to plain text fallback
  }
  return new Response("Not found", { status: 404 });
}
