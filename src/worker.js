export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Redirect all requests from electerm-repos.html5beta.com to repos.electerm.org
    if (url.hostname === "electerm-repos.html5beta.com") {
      const redirectUrl = `https://repos.electerm.org${url.pathname}${url.search}`;
      return Response.redirect(redirectUrl, 308);
    }

    let path = url.pathname;

    // API endpoint for country detection
    if (path === "/api/country") {
      const country = (request.cf && request.cf.country) || "";
      return new Response(JSON.stringify({ country }), {
        headers: { "content-type": "application/json" }
      });
    }

    // Handle Debian APT paths - serve metadata from ASSETS, redirect .deb files to mirror
    if (
      path.startsWith("/deb/dists/") ||
      path.startsWith("/deb/pool/") ||
      path === "/deb/public.key" ||
      path === "/deb/InRelease" ||
      path === "/deb/Release.gpg" ||
      path.startsWith("/cn/deb/dists/") ||
      path.startsWith("/cn/deb/pool/") ||
      path === "/cn/deb/public.key" ||
      path === "/cn/deb/InRelease" ||
      path === "/cn/deb/Release.gpg"
    ) {
      // Redirect .deb file requests to mirror (the .deb is not stored in the pool)
      if (path.endsWith(".deb")) {
        // Extract version from filename: electerm-{version}-linux-amd64.deb
        const match = path.match(/electerm-([\d.]+(?:-[a-z0-9.]+)?)-linux-amd64\.deb$/);
        if (match) {
          const version = match[1];
          const filename = path.split("/").pop();
          const realUrl = `https://github.com/electerm/electerm/releases/download/v${version}/${filename}`;
          const redirectUrl = `https://mirror.electerm.org/${realUrl}`;
          return Response.redirect(redirectUrl, 302);
        }
      }
      try {
        return await env.ASSETS.fetch(request);
      } catch (e) {
        return new Response("Not found: " + path, { status: 404 });
      }
    }

    // Map clean routes to index.html files
    const routeMap = {
      "/": "/index.html",
      "/deb": "/deb/index.html",
      "/deb/": "/deb/index.html",
      "/privacy-policy": "/privacy-policy/index.html",
      "/privacy-policy/": "/privacy-policy/index.html",
      "/cn": "/cn/index.html",
      "/cn/": "/cn/index.html",
      "/cn/deb": "/cn/deb/index.html",
      "/cn/deb/": "/cn/deb/index.html",
    };

    if (routeMap[path]) {
      try {
        return await env.ASSETS.fetch(new URL(routeMap[path], request.url));
      } catch (e) {
        return new Response("Not found: " + path, { status: 404 });
      }
    }

    // Handle other paths - try adding .html
    if (!path.endsWith(".html") && !path.includes(".")) {
      path = path + ".html";
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // Fallback
      try {
        return await env.ASSETS.fetch(new URL("/index.html", request.url));
      } catch (e2) {
        return new Response("Error: " + e2.message, { status: 500 });
      }
    }
  },
};
