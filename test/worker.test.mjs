import assert from "node:assert/strict";

import worker from "../src/worker.js";

const seen = [];
const env = {
  ASSETS: {
    fetch: async (req) => {
      seen.push(new URL(req.url));
      return new Response("asset");
    },
  },
};
const get = (url) => worker.fetch(new Request(url), env);

let r = await get("https://www.erasuite.dev/x?y=1");
assert.equal(r.status, 301);
assert.equal(r.headers.get("location"), "https://erasuite.dev/x?y=1");

r = await get("https://erasuite.dev/infra/");
assert.equal(r.headers.get("location"), "https://infra.erasuite.dev/");
r = await get("https://erasuite.dev/db");
assert.equal(r.headers.get("location"), "https://db.erasuite.dev/");

await get("https://mesh.erasuite.dev/");
assert.equal(seen.at(-1).pathname, "/mesh/");
await get("https://db.erasuite.dev/assets/style.css");
assert.equal(seen.at(-1).pathname, "/assets/style.css");
await get("https://erasuite.dev/");
assert.equal(seen.at(-1).pathname, "/");
await get("https://erasuite-site.example.workers.dev/infra/");
assert.equal(seen.at(-1).pathname, "/infra/");
console.log("worker routing: 8 cases passed");
