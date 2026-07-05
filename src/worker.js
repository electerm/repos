export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

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
        const realUrl = `https://github.com/electerm/electerm/releases/download/v${version}/${filename}`;
        const redirectUrl = `https://mirror.electerm.org/${realUrl}`;
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
        const realUrl = `https://github.com/electerm/electerm/releases/download/v${version}/${filename}`;
        const redirectUrl = `https://mirror.electerm.org/${realUrl}`;
        return Response.redirect(redirectUrl, 302);
      }
    }

    // Fallback: let Cloudflare serve static assets or return 404
    return new Response("Not found: " + path, { status: 404 });
  },
};
