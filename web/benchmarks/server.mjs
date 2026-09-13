import http from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { execFileSync } from "node:child_process";
const root = process.cwd(),
  port = Number(process.argv[2] || 4350),
  output = resolve(".local/benchmark"),
  cache = new Map();
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Choose a benchmark port from 1024 to 65535");
// Keep the comparison source reproducible without checking old copies into Git.
const revision = execFileSync(
  "git",
  ["rev-parse", "--verify", process.argv[3] || "HEAD"],
  { encoding: "utf8" },
).trim();
const baseline = resolve(".local/baseline/public");
await mkdir(baseline, { recursive: true });
for (const name of execFileSync(
  "git",
  ["ls-tree", "-r", "--name-only", revision, "web/public"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")) {
  if (!/^web\/public\/[^/]+\.(js|css)$/.test(name)) continue;
  await writeFile(
    resolve(baseline, name.slice("web/public/".length)),
    execFileSync("git", ["show", `${revision}:${name}`], {
      maxBuffer: 5_000_000,
    }),
  );
}
await mkdir(output, { recursive: true });
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".glb": "model/gltf-binary",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost"),
        path = url.pathname;
      if (
        req.method === "POST" &&
        /^\/bench\/(capture|report)\/(baseline|optimized)(\/[a-z0-9-]+)?$/.test(
          path,
        )
      ) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const suffix = path.includes("/capture/") ? ".rgba" : ".json";
        await writeFile(
          resolve(
            output,
            path.slice(7).replaceAll("/", "-") + "-" + Date.now() + suffix,
          ),
          Buffer.concat(chunks),
        );
        res.end("saved");
        return;
      }
      let file;
      if (path === "/") file = "web/benchmarks/index.html";
      else if (path.startsWith("/bench/"))
        file = "web/benchmarks/" + path.slice(7);
      else if (path.startsWith("/baseline/"))
        file = ".local/baseline/public/" + path.slice(10);
      else if (path.startsWith("/current/"))
        file = "web/public/" + path.slice(9);
      else if (path.startsWith("/assets/source/"))
        file = "web/public/assets/" + path.slice(15);
      else if (path.startsWith("/assets/runtime/"))
        file = "web/public/assets/runtime/" + path.slice(16);
      else if (path.startsWith("/vendor/three/"))
        file = "node_modules/three/" + path.slice(14);
      else if (path.startsWith("/vendor/bvh/"))
        file = "node_modules/three-mesh-bvh/" + path.slice(12);
      else throw Error("Not found");
      file = resolve(file);
      if (!file.startsWith(root + "/")) throw Error();
      let data = await readFile(file);
      const headers = {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      };
      if (
        path.startsWith("/assets/") &&
        req.headers["accept-encoding"]?.includes("br")
      ) {
        const stamp = (await stat(file)).mtimeMs,
          key = file + stamp;
        let compressed = cache.get(key);
        if (!compressed) {
          compressed = brotliCompressSync(data, {
            params: { [constants.BROTLI_PARAM_QUALITY]: 6 },
          });
          cache.set(key, compressed);
        }
        data = compressed;
        headers["Content-Encoding"] = "br";
      }
      headers["Content-Length"] = data.length;
      res.writeHead(200, headers);
      res.end(data);
    } catch (error) {
      console.error(req.url, error.message);
      res.writeHead(404);
      res.end(error.message);
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log("Benchmark http://127.0.0.1:" + port),
  );
