// Puppet Studio: the browser animation editor for the 3D birds.
//
//   npm run editor        -> http://localhost:5174
//
// A small local API saves straight into the repo:
//   GET  /api/episodes            list of clip names
//   GET  /api/episodes/<name>     a clip (content/episodes/<name>.anim.json)
//   PUT  /api/episodes/<name>     validate and save a clip
//   GET  /api/poses/<name>        a pose file (content/poses/<name>.json)
//   PUT  /api/poses/<name>        save a pose file
// Only those two folders can be written, and names are restricted to [a-z0-9-].

import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { formatClip, validateClip, type Clip } from "../src/world3d/anim/clip";

const ROOT = path.resolve(__dirname, "..");
const DIRS = {
  episodes: { dir: path.join(ROOT, "content", "episodes"), ext: ".anim.json" },
  poses: { dir: path.join(ROOT, "content", "poses"), ext: ".json" },
};

const readBody = (req: import("node:http").IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => resolve(s));
    req.on("error", reject);
  });

const saveApi = (): Plugin => ({
  name: "puppet-studio-api",
  configureServer(server) {
    server.middlewares.use("/api", async (req, res) => {
      const send = (code: number, body: unknown) => {
        res.statusCode = code;
        res.setHeader("Content-Type", "application/json");
        res.end(typeof body === "string" ? body : JSON.stringify(body));
      };
      try {
        const [, kind, name] = (req.url ?? "").split("?")[0].split("/");
        const spec = DIRS[kind as keyof typeof DIRS];
        if (!spec) return send(404, { error: "unknown collection" });
        fs.mkdirSync(spec.dir, { recursive: true });
        if (!name) {
          if (req.method !== "GET") return send(405, { error: "method" });
          const names = fs
            .readdirSync(spec.dir)
            .filter((f) => f.endsWith(spec.ext))
            .map((f) => f.slice(0, -spec.ext.length))
            .sort();
          return send(200, names);
        }
        if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) return send(400, { error: "name must be lowercase letters, digits and dashes" });
        const file = path.join(spec.dir, name + spec.ext);
        if (req.method === "GET") {
          if (!fs.existsSync(file)) return send(404, { error: "not found" });
          return send(200, fs.readFileSync(file, "utf8"));
        }
        if (req.method === "PUT") {
          const data = JSON.parse(await readBody(req));
          let text: string;
          if (kind === "episodes") {
            const errs = validateClip(data);
            if (errs.length) return send(422, { error: errs.join("; ") });
            text = formatClip({ ...(data as Clip), name });
          } else {
            text = JSON.stringify(data, null, 2) + "\n";
          }
          fs.writeFileSync(file, text);
          return send(200, { saved: path.relative(ROOT, file) });
        }
        return send(405, { error: "method" });
      } catch (e) {
        return send(500, { error: String(e) });
      }
    });
  },
});

export default defineConfig({
  root: __dirname,
  plugins: [react(), saveApi()],
  server: { port: 5174, strictPort: false, fs: { allow: [ROOT] } },
  build: { outDir: path.join(ROOT, "out", "editor-build"), emptyOutDir: true },
});
