// Serves erasuite.dev and the product subdomains from one set of static files.
// db.erasuite.dev/x is served from /db/x; shared files under /assets/ stay at the root.
const ROOT = "erasuite.dev";
const PRODUCTS = new Set(["db", "infra", "mesh"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    if (host === `www.${ROOT}`) {
      url.hostname = ROOT;
      return Response.redirect(url.toString(), 301);
    }

    const sub = host.endsWith(`.${ROOT}`) ? host.slice(0, -ROOT.length - 1) : null;
    if (sub && PRODUCTS.has(sub)) {
      const shared = url.pathname.startsWith("/assets/") || url.pathname === "/robots.txt";
      if (!shared) url.pathname = `/${sub}${url.pathname}`;
      return env.ASSETS.fetch(new Request(url.toString(), request));
    }

    if (host === ROOT) {
      const match = url.pathname.match(/^\/(db|infra|mesh)(\/.*)?$/);
      if (match) {
        const rest = match[2] && match[2] !== "/" ? match[2] : "/";
        return Response.redirect(`https://${match[1]}.${ROOT}${rest}${url.search}`, 301);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
