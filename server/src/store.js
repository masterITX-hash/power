import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
const file = path.join(directory, "database.json");

const unitSeed = [
  ["SURALAYA-01", "Unit 1", "PLTU Suralaya", "Banten", "DF-A"],
  ["SURALAYA-02", "Unit 2", "PLTU Suralaya", "Banten", "DF-B"],
  ["PRIOK-01", "Blok 1", "PLTGU Tanjung Priok", "Jakarta", "DF-A"],
  ["GRATI-01", "Blok 1", "PLTGU Grati", "Pasuruan", "DF-A"],
  ["PERAK-01", "Unit 1", "PLTGU Perak", "Surabaya", "DF-A"],
  ["BALI-01", "Blok 1", "PLTG Pemaron", "Bali", "DF-A"],
  ["ADIPALA-01", "Unit 1", "PLTU Adipala", "Cilacap", "DF-A"],
  ["LABUAN-01", "Unit 1", "PLTU Labuan", "Banten", "DF-A"]
];

function seed() {
  const thresholds = { dp_normal: 1.4, dp_warning: 2, dp_critical: 2.6, design_flow: 6500, rate_warning: 0.25 };
  const now = Date.now();
  const units = unitSeed.map((item, index) => ({
    id: index + 1,
    code: item[0],
    name: item[1],
    plant: item[2],
    location: item[3],
    filter_name: `Debris Filter ${item[4]}`,
    status: index === 1 ? "WARNING" : index === 4 ? "WATCH" : index === 7 ? "OFFLINE" : "NORMAL",
    risk_score: index === 1 ? 63 : index === 4 ? 42 : index === 7 ? 100 : 18 + index
  }));
  const sensorData = [];
  for (const unit of units) {
    for (let i = 35; i >= 0; i--) {
      const t = now - i * 5 * 60 * 1000;
      const wave = Math.sin((i + unit.id) / 4);
      let dp = 0.75 + unit.id * 0.045 + wave * 0.12;
      let flow = 6420 - unit.id * 18 - wave * 70;
      if (unit.id === 2) { dp += 1.15 + (35 - i) * 0.012; flow -= 1120; }
      if (unit.id === 5) { dp += 0.65; flow -= 620; }
      if (unit.id === 8) { dp = 0; flow = 0; }
      sensorData.push(reading(unit.id, t, dp, flow, unit.id === 8 ? "OFFLINE" : "ONLINE"));
    }
  }
  return {
    users: [
      user(1, "Administrator", "admin@reoc.local", "admin", "Admin123!"),
      user(2, "Operator REOC", "operator@reoc.local", "operator", "Operator123!"),
      user(3, "Supervisor Shift", "supervisor@reoc.local", "supervisor", "Supervisor123!"),
      user(4, "Engineer Maintenance", "engineer@reoc.local", "engineer", "Engineer123!")
    ],
    units,
    sensorData,
    thresholds,
    alarms: [
      { id: 1, unit_id: 2, code: "DP-HIGH", name: "Differential pressure tinggi", level: "WARNING", message: "DP melewati 2.0 bar dan aliran menurun.", status: "ACTIVE", triggered_at: new Date(now - 22 * 60000).toISOString(), note: "" },
      { id: 2, unit_id: 8, code: "SENSOR-OFFLINE", name: "Sensor tidak terhubung", level: "CRITICAL", message: "Tidak ada pembaruan data lebih dari 5 menit.", status: "ESCALATED", triggered_at: new Date(now - 38 * 60000).toISOString(), note: "Tim instrumentasi dihubungi." },
      { id: 3, unit_id: 5, code: "FLOW-DROP", name: "Penurunan flow rate", level: "WATCH", message: "Flow rate turun lebih dari 10% terhadap desain.", status: "ACKNOWLEDGED", triggered_at: new Date(now - 65 * 60000).toISOString(), acknowledged_at: new Date(now - 48 * 60000).toISOString(), note: "Dalam pemantauan operator." }
    ],
    auditLogs: [],
    simulator: { enabled: true, tick: 0 }
  };
}

function user(id, name, email, role, password) {
  return { id, name, email, role, password_hash: bcrypt.hashSync(password, 10) };
}

function reading(unitId, timestamp, dp, flow, sensorStatus) {
  const pressureOut = sensorStatus === "OFFLINE" ? 0 : 1.18 + Math.sin(timestamp / 900000) * 0.05;
  return {
    id: `${unitId}-${timestamp}`,
    unit_id: unitId,
    timestamp: new Date(timestamp).toISOString(),
    pressure_inlet: round(pressureOut + dp),
    pressure_outlet: round(pressureOut),
    differential_pressure: round(dp),
    flow_rate: Math.round(flow),
    temperature: sensorStatus === "OFFLINE" ? 0 : round(28.2 + unitId * 0.18 + Math.sin(timestamp / 700000)),
    pump_current: sensorStatus === "OFFLINE" ? 0 : round(108 + unitId * 1.3 + dp * 5),
    valve_position: sensorStatus === "OFFLINE" ? 0 : Math.round(91 - dp * 2),
    sensor_status: sensorStatus
  };
}

import {
  initDatabase,
  loadStateFromDb,
  saveReadingToDb,
  saveAlarmToDb,
  saveThresholdsToDb,
  saveAuditLogToDb
} from "./db.js";

fs.mkdirSync(directory, { recursive: true });
let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch {
  data = seed();
  persist();
}

export async function initializeStore() {
  try {
    const pool = await initDatabase(data);
    if (pool) {
      const dbState = await loadStateFromDb();
      if (dbState) {
        if (dbState.users?.length) data.users = dbState.users;
        if (dbState.units?.length) data.units = dbState.units;
        if (dbState.thresholds) data.thresholds = dbState.thresholds;
        if (dbState.alarms?.length) data.alarms = dbState.alarms;
        if (dbState.sensorData?.length) data.sensorData = dbState.sensorData;
        if (dbState.auditLogs?.length) data.auditLogs = dbState.auditLogs;
        console.log("📊 Data state aktif tersinkronisasi dengan MySQL Niagahoster.");
      }
    }
  } catch (err) {
    console.error("Inisialisasi MySQL error:", err.message);
  }
}

export function getStore() { return data; }
export function persist() {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Gagal menulis file store:", e.message);
  }
}
export function createReading(unitId, timestamp, dp, flow, status = "ONLINE") { return reading(unitId, timestamp, dp, flow, status); }
export function resetStore() { data = seed(); persist(); return data; }
export { saveReadingToDb, saveAlarmToDb, saveThresholdsToDb, saveAuditLogToDb };

function round(value) { return Math.round(value * 100) / 100; }

