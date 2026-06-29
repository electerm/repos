export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname;

    // API endpoint for country detection
    if (path === "/api/country") {
      const country = (request.cf && request.cf.country) || "";
      return new Response(JSON.stringify({ country }), {
        headers: { "content-type": "application/json" }
      });
    }

    // Handle Debian APT paths - serve directly from ASSETS
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
