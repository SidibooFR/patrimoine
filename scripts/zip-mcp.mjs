// Archive le serveur MCP autonome (dist-mcp/) dans release/patrimoine-mcp-<version>.zip.
// Écrivain ZIP minimal (deflate + CRC32 de node:zlib) : aucune dépendance supplémentaire.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const src = path.join(root, "dist-mcp");
const outDir = path.join(root, "release");
const out = path.join(outDir, `patrimoine-mcp-${version}.zip`);

const files = fs.readdirSync(src).filter((f) => fs.statSync(path.join(src, f)).isFile());
if (!files.length) throw new Error("dist-mcp est vide : lance d'abord npm run build");

const readme = Buffer.from(
  `Serveur MCP Patrimoine ${version}\r\n\r\n` +
  `Prérequis : Node.js 22 ou plus récent.\r\n\r\n` +
  `Dans Claude Desktop (Paramètres > Développeur > Modifier la configuration) :\r\n\r\n` +
  `{\r\n  "mcpServers": {\r\n    "patrimoine": {\r\n      "command": "node",\r\n      "args": ["C:/chemin/vers/patrimoine-mcp/server.cjs"]\r\n    }\r\n  }\r\n}\r\n\r\n` +
  `Le serveur utilise la même base que l'application (%APPDATA%\\Patrimoine\\patrimoine.sqlite),\r\n` +
  `ou le fichier indiqué par la variable d'environnement PATRIMOINE_DB.\r\n`,
);
const entries = [...files.map((f) => ({ name: `patrimoine-mcp/${f}`, data: fs.readFileSync(path.join(src, f)) })), { name: "patrimoine-mcp/LISEZMOI.txt", data: readme }];

const now = new Date();
const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
const locals = [], centrals = [];
let offset = 0;
for (const e of entries) {
  const name = Buffer.from(e.name, "utf8");
  const comp = zlib.deflateRawSync(e.data, { level: 9 });
  const crc = zlib.crc32(e.data) >>> 0;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
  local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12); local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(e.data.length, 22); local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10);
  central.writeUInt16LE(dosTime, 12); central.writeUInt16LE(dosDate, 14); central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(e.data.length, 24); central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);
  locals.push(local, name, comp);
  centrals.push(central, name);
  offset += local.length + name.length + comp.length;
}
const cd = Buffer.concat(centrals);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, Buffer.concat([...locals, cd, end]));
console.log(`${path.relative(root, out)} (${entries.length} fichiers, ${(fs.statSync(out).size / 1e6).toFixed(1)} Mo)`);
