import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { zipSync } from "fflate";

const rootDir = process.cwd();
const outputFile = path.join(rootDir, "niagahoster-deploy.zip");

console.log("=== MEMPERSIAPKAN PAKET DEPLOYMENT NIAGAHOSTER ===");

// 1. Build frontend terlebih dahulu
console.log("1. Memeriksa & mem-build frontend (client/dist)...");
try {
  execSync("npm run build", { stdio: "inherit" });
} catch (error) {
  console.error("Gagal melakukan build frontend:", error);
  process.exit(1);
}

// 2. Kumpulkan file yang perlu disertakan
console.log("2. Mengumpulkan file-file produksi...");

const zipEntries = {};

function addFileToZip(filePath, relativePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath);
    // Format path dengan forward slash untuk zip kompatibilitas Linux
    const normalizedKey = relativePath.replace(/\\/g, "/");
    zipEntries[normalizedKey] = new Uint8Array(content);
  }
}

function addDirectoryToZip(dirPath, relativeBase = "") {
  if (!fs.existsSync(dirPath)) return;
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    const relPath = relativeBase ? `${relativeBase}/${item.name}` : item.name;
    if (item.isDirectory()) {
      addDirectoryToZip(fullPath, relPath);
    } else {
      addFileToZip(fullPath, relPath);
    }
  }
}

// Daftar file root
const rootFiles = [
  "app.js",
  "package.json",
  ".htaccess",
  "ecosystem.config.cjs",
  ".env",
  ".env.example",
  ".env.production.example",
  "README.md",
  "PANDUAN_DEPLOY_NIAGAHOSTER.md"
];

for (const file of rootFiles) {
  addFileToZip(path.join(rootDir, file), file);
}

// Tambahkan server
addFileToZip(path.join(rootDir, "server/package.json"), "server/package.json");
addFileToZip(path.join(rootDir, "server/src/index.js"), "server/src/index.js");
addFileToZip(path.join(rootDir, "server/src/engine.js"), "server/src/engine.js");
addFileToZip(path.join(rootDir, "server/src/store.js"), "server/src/store.js");
addFileToZip(path.join(rootDir, "server/src/db.js"), "server/src/db.js");
addFileToZip(path.join(rootDir, "server/data/schema.sql"), "server/data/schema.sql");
addFileToZip(path.join(rootDir, "server/data/.gitkeep"), "server/data/.gitkeep");

// Tambahkan hasil build frontend
addDirectoryToZip(path.join(rootDir, "client/dist"), "client/dist");

console.log(`3. Mengompresi ${Object.keys(zipEntries).length} file ke ${path.basename(outputFile)}...`);

const zippedBuffer = Buffer.from(zipSync(zipEntries, { level: 6 }));
fs.writeFileSync(outputFile, zippedBuffer);

const sizeInMB = (zippedBuffer.length / (1024 * 1024)).toFixed(2);
console.log(`\nBERHASIL! Paket deployment telah dibuat:`);
console.log(`-> File: ${outputFile} (${sizeInMB} MB)`);
console.log(`\nSilakan upload file 'niagahoster-deploy.zip' ini ke cPanel File Manager Niagahoster dan ekstrak!`);
