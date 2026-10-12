import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import http from "node:http";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { strToU8, zipSync } from "fflate";
import PDFDocument from "pdfkit";
import { Server } from "socket.io";
import { calculateRisk, recommendation } from "./engine.js";
import {
  createReading,
  getStore,
  persist,
  initializeStore,
  saveReadingToDb,
  saveAlarmToDb,
  saveThresholdsToDb,
  saveAuditLogToDb
} from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or local dir
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

// Initialize MySQL or JSON store asynchronously on startup
initializeStore().catch((err) => console.error("Database boot warning:", err.message));

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "df-ewdss-local-development-secret";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const app = express();
// Enable trust proxy for cPanel / LiteSpeed / Nginx / Cloudflare reverse proxies
app.set("trust proxy", 1);

// Flexible CORS: allow specified origins or allow dynamic reflection for same-origin & production domains
const corsOrigin = CLIENT_ORIGIN && CLIENT_ORIGIN !== "*"
  ? (CLIENT_ORIGIN.includes(",") ? CLIENT_ORIGIN.split(",").map((s) => s.trim()) : CLIENT_ORIGIN)
  : true;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }));

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Sesi tidak valid atau telah berakhir." });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Akses hanya untuk administrator." });
  next();
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function latestFor(unitId) {
  return getStore().sensorData.filter((item) => item.unit_id === unitId).at(-1);
}

function enrichedUnits() {
  return getStore().units.map((unit) => ({ ...unit, latest: latestFor(unit.id), recommendation: recommendation(unit.status) }));
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "DF-EWDSS API", timestamp: new Date().toISOString() }));

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = getStore().users.find((item) => item.email.toLowerCase() === String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ message: "Email atau password tidak sesuai." });
  }
  const safeUser = publicUser(user);
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: "8h" });
  const log = { id: Date.now(), user_id: user.id, action: "LOGIN", description: "Login berhasil", created_at: new Date().toISOString() };
  getStore().auditLogs.push(log);
  persist();
  saveAuditLogToDb(log);
  res.json({ token, user: safeUser });
});

app.use("/api", (req, res, next) => ["/health", "/integration/sensor-data"].includes(req.path) ? next() : authenticate(req, res, next));

app.get("/api/dashboard/summary", (_req, res) => {
  const units = getStore().units;
  const count = (status) => units.filter((unit) => unit.status === status).length;
  res.json({ total_units: units.length, normal: count("NORMAL"), watch: count("WATCH"), warning: count("WARNING"), critical: count("CRITICAL"), offline: count("OFFLINE"), active_alarms: getStore().alarms.filter((a) => !["RESOLVED"].includes(a.status)).length });
});

app.get("/api/units/status", (_req, res) => res.json(enrichedUnits()));

app.get("/api/sensor/latest", (req, res) => {
  const unitId = Number(req.query.unit_id);
  const result = latestFor(unitId);
  if (!result) return res.status(404).json({ message: "Data unit tidak ditemukan." });
  res.json(result);
});

app.get("/api/sensor/trend", (req, res) => {
  const unitId = Number(req.query.unit_id || 1);
  const hours = Math.min(Number(req.query.hours || 24), 720);
  const start = Date.now() - hours * 3_600_000;
  res.json(getStore().sensorData.filter((item) => item.unit_id === unitId && new Date(item.timestamp).getTime() >= start));
});

app.get("/api/alarms", (req, res) => {
  let alarms = [...getStore().alarms].reverse();
  if (req.query.status && req.query.status !== "ALL") alarms = alarms.filter((a) => a.status === req.query.status);
  if (req.query.level && req.query.level !== "ALL") alarms = alarms.filter((a) => a.level === req.query.level);
  res.json(alarms.map((alarm) => ({ ...alarm, unit: getStore().units.find((u) => u.id === alarm.unit_id) })));
});

app.post("/api/alarms/:id/acknowledge", (req, res) => updateAlarm(req, res, "ACKNOWLEDGED"));
app.post("/api/alarms/:id/resolve", (req, res) => updateAlarm(req, res, "RESOLVED"));

function updateAlarm(req, res, status) {
  const alarm = getStore().alarms.find((item) => item.id === Number(req.params.id));
  if (!alarm) return res.status(404).json({ message: "Alarm tidak ditemukan." });
  alarm.status = status;
  alarm.note = req.body?.note || alarm.note;
  alarm[status === "RESOLVED" ? "resolved_at" : "acknowledged_at"] = new Date().toISOString();
  const log = { id: Date.now(), user_id: req.user.id, action: `ALARM_${status}`, description: `Alarm #${alarm.id}`, created_at: new Date().toISOString() };
  getStore().auditLogs.push(log);
  persist();
  saveAlarmToDb(alarm);
  saveAuditLogToDb(log);
  io.emit("alarm:updated", alarm);
  res.json(alarm);
}

app.get("/api/recommendations", (req, res) => {
  const units = req.query.unit_id ? getStore().units.filter((u) => u.id === Number(req.query.unit_id)) : getStore().units;
  res.json(units.map((u) => ({ unit_id: u.id, unit_name: `${u.plant} ${u.name}`, risk_score: u.risk_score, risk_level: u.status, recommendation_text: recommendation(u.status), action_priority: u.status === "CRITICAL" ? "SEGERA" : u.status === "WARNING" ? "TINGGI" : "RUTIN" })));
});

app.get("/api/settings/thresholds", (_req, res) => res.json(getStore().thresholds));
app.put("/api/settings/thresholds", requireAdmin, (req, res) => {
  const fields = ["dp_normal", "dp_warning", "dp_critical", "design_flow", "rate_warning"];
  for (const field of fields) {
    const value = Number(req.body[field]);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ message: `Nilai ${field} tidak valid.` });
  }
  if (!(req.body.dp_normal < req.body.dp_warning && req.body.dp_warning < req.body.dp_critical)) return res.status(400).json({ message: "Urutan threshold DP harus normal < warning < critical." });
  getStore().thresholds = Object.fromEntries(fields.map((field) => [field, Number(req.body[field])]));
  persist();
  saveThresholdsToDb(getStore().thresholds);
  res.json(getStore().thresholds);
});

app.get("/api/reports/daily", async (req, res) => {
  const format = String(req.query.format || "csv").toLowerCase();
  const rows = enrichedUnits().map((u) => ({ unit: `${u.plant} - ${u.name}`, filter: u.filter_name, status: u.status, risk: u.risk_score, dp: u.latest.differential_pressure, flow: u.latest.flow_rate, temperature: u.latest.temperature }));
  if (format === "xlsx") return sendExcel(res, rows);
  if (format === "pdf") return sendPdf(res, rows);
  const header = "Unit,Filter,Status,Risk Score,Differential Pressure,Flow Rate,Temperature\n";
  const body = rows.map((r) => `"${r.unit}","${r.filter}",${r.status},${r.risk},${r.dp},${r.flow},${r.temperature}`).join("\n");
  res.set({ "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="DF-EWDSS-${dateName()}.csv"` }).send(header + body);
});

async function sendExcel(res, rows) {
  const headers = Object.keys(rows[0]);
  const data = [headers.map((value) => value.toUpperCase()), ...rows.map((row) => headers.map((key) => row[key]))];
  const sheetRows = data.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => {
    const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
    return typeof value === "number" ? `<c r="${reference}" s="${rowIndex === 0 ? 1 : 0}"><v>${value}</v></c>` : `<c r="${reference}" t="inlineStr" s="${rowIndex === 0 ? 1 : 0}"><is><t>${xmlEscape(value)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const files = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Kondisi Unit" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="1" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>`),
    "xl/worksheets/sheet1.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${headers.map((_, index) => `<col min="${index + 1}" max="${index + 1}" width="22" customWidth="1"/>`).join("")}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${columnName(headers.length - 1)}${data.length}"/></worksheet>`)
  };
  const workbook = Buffer.from(zipSync(files, { level: 6 }));
  res.set({ "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="DF-EWDSS-${dateName()}.xlsx"` });
  res.end(workbook);
}

function columnName(index) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  return name;
}

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function sendPdf(res, rows) {
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="DF-EWDSS-${dateName()}.pdf"` });
  const doc = new PDFDocument({ margin: 42, size: "A4" });
  doc.pipe(res);
  doc.fontSize(18).fillColor("#0F172A").text("DF-EWDSS - Laporan Kondisi Harian");
  doc.fontSize(9).fillColor("#64748B").text(`Dibuat: ${new Date().toLocaleString("id-ID")}`).moveDown();
  rows.forEach((row) => doc.fontSize(10).fillColor("#0F172A").text(`${row.unit} | ${row.status} | Risk ${row.risk} | DP ${row.dp} bar | Flow ${row.flow} m3/h`).moveDown(0.45));
  doc.end();
}

app.post("/api/integration/sensor-data", (req, res) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.SENSOR_API_KEY || "local-sensor-key")) return res.status(401).json({ message: "API key tidak valid." });
  const unit = getStore().units.find((u) => u.id === Number(req.body.unit_id));
  if (!unit) return res.status(404).json({ message: "Unit tidak ditemukan." });
  const dp = Number(req.body.pressure_inlet) - Number(req.body.pressure_outlet);
  const item = createReading(unit.id, Date.now(), dp, Number(req.body.flow_rate), req.body.sensor_status || "ONLINE");
  processReading(unit, item);
  res.status(201).json(item);
});

app.get("/api/docs", (_req, res) => res.json({ name: "DF-EWDSS API", version: "1.0.0", authentication: "Bearer JWT", endpoints: ["POST /api/auth/login", "GET /api/dashboard/summary", "GET /api/units/status", "GET /api/sensor/latest?unit_id=1", "GET /api/sensor/trend?unit_id=1&hours=24", "GET /api/alarms", "POST /api/alarms/:id/acknowledge", "POST /api/alarms/:id/resolve", "GET /api/recommendations", "GET|PUT /api/settings/thresholds", "GET /api/reports/daily?format=pdf|xlsx|csv"] }));

function processReading(unit, item) {
  const store = getStore();
  const previous = latestFor(unit.id);
  const recentAlarms = store.alarms.filter((a) => a.unit_id === unit.id && Date.now() - new Date(a.triggered_at).getTime() < 86_400_000).length;
  const risk = calculateRisk(item, previous, store.thresholds, recentAlarms);
  Object.assign(item, risk);
  store.sensorData.push(item);
  store.sensorData = store.sensorData.filter((row) => Date.now() - new Date(row.timestamp).getTime() < 30 * 86_400_000);
  const previousStatus = unit.status;
  unit.status = risk.status;
  unit.risk_score = risk.risk_score;
  if (["WARNING", "CRITICAL", "OFFLINE"].includes(risk.status) && previousStatus !== risk.status) {
    const code = risk.status === "OFFLINE" ? "SENSOR-OFFLINE" : "FILTER-RISK";
    const openAlarm = store.alarms.find((alarm) => alarm.unit_id === unit.id && alarm.code === code && alarm.status !== "RESOLVED");
    if (!openAlarm) {
      const alarm = { id: Math.max(0, ...store.alarms.map((a) => a.id)) + 1, unit_id: unit.id, code, name: risk.status === "OFFLINE" ? "Sensor tidak terhubung" : `Risiko filter ${risk.status.toLowerCase()}`, level: risk.status === "OFFLINE" ? "CRITICAL" : risk.status, message: recommendation(risk.status), status: "ACTIVE", triggered_at: item.timestamp, note: "" };
      store.alarms.push(alarm);
      saveAlarmToDb(alarm);
      io.emit("alarm:new", { ...alarm, unit });
    } else if (risk.status === "CRITICAL") {
      openAlarm.level = "CRITICAL";
      openAlarm.message = recommendation(risk.status);
      saveAlarmToDb(openAlarm);
    }
  }
  persist();
  saveReadingToDb(item);
  io.emit("sensor:update", { unit: { ...unit, latest: item, recommendation: recommendation(unit.status) }, summary: buildSummary() });
}

function buildSummary() {
  const units = getStore().units;
  const count = (s) => units.filter((u) => u.status === s).length;
  return { total_units: units.length, normal: count("NORMAL"), watch: count("WATCH"), warning: count("WARNING"), critical: count("CRITICAL"), offline: count("OFFLINE"), active_alarms: getStore().alarms.filter((a) => a.status !== "RESOLVED").length };
}

function simulate() {
  const store = getStore();
  if (!store.simulator.enabled) return;
  store.simulator.tick = (store.simulator.tick || 0) + 1;
  for (const unit of store.units) {
    const last = latestFor(unit.id);
    const wave = Math.sin(store.simulator.tick / 5 + unit.id);
    let dp = Math.max(0.5, last.differential_pressure + (Math.random() - 0.49) * 0.05 + wave * 0.008);
    let flow = Math.max(3800, last.flow_rate + (Math.random() - 0.5) * 35 - (dp - last.differential_pressure) * 240);
    let status = "ONLINE";
    if (unit.id === 2) { dp = Math.max(2.05, dp); flow = Math.min(flow || 5250, 5280); }
    if (unit.id === 8) { dp = 0; flow = 0; status = "OFFLINE"; }
    processReading(unit, createReading(unit.id, Date.now(), dp, flow, status));
  }
}

const dateName = () => new Date().toISOString().slice(0, 10);
setInterval(simulate, 5000);

// Resolve static client directory (support workspace, standalone root, or public folders)
const possibleRoots = [
  path.resolve(__dirname, "../../client/dist"),
  path.resolve(__dirname, "../client/dist"),
  path.resolve(process.cwd(), "client/dist"),
  path.resolve(process.cwd(), "dist"),
  path.resolve(process.cwd(), "public")
];
const root = possibleRoots.find((dir) => fs.existsSync(path.join(dir, "index.html")));

if (root) {
  app.use(express.static(root));
  // SPA fallback for all non-API GET requests
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) {
      return res.sendFile(path.join(root, "index.html"));
    }
    next();
  });
}

// 404 handler for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Endpoint API tidak ditemukan." });
});

// Fallback 404 handler
app.use((_req, res) => {
  res.status(404).send("DF-EWDSS - Halaman tidak ditemukan.");
});

// Start listening
server.listen(PORT, () => {
  const isSocket = typeof PORT === "string" && (PORT.startsWith("/") || PORT.startsWith("\\"));
  console.log(`DF-EWDSS API aktif di ${isSocket ? PORT : `http://localhost:${PORT}`}`);
});

export { app, server, io };
