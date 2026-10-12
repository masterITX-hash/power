import mysql from "mysql2/promise";

let pool = null;
let isConnected = false;

export function getDbConfig() {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST;
  if (!host) return null;

  return {
    host,
    port: Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306),
    user: process.env.DB_USER || process.env.MYSQL_USER,
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD,
    database: process.env.DB_NAME || process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
  };
}

export async function initDatabase(seedData) {
  const config = getDbConfig();
  if (!config) {
    console.log("ℹ️ Mode Database: Berkas JSON Lokal (DB_HOST belum dikonfigurasi).");
    return null;
  }

  try {
    console.log(`🔌 Menghubungkan ke MySQL Niagahoster di ${config.host}:${config.port}...`);
    pool = mysql.createPool(config);

    // Test connection
    const connection = await pool.getConnection();
    connection.release();
    isConnected = true;
    console.log("✅ Terhubung ke database MySQL Niagahoster!");

    // Create tables if not exist
    await createTables();

    // Check & seed if empty
    await bootstrapData(seedData);

    return pool;
  } catch (error) {
    console.error("⚠️ Gagal menghubungkan ke MySQL Niagahoster:", error.message);
    console.error("👉 Memakai fallback berkas JSON agar aplikasi tetap berjalan normal.");
    isConnected = false;
    pool = null;
    return null;
  }
}

async function createTables() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL DEFAULT 'operator',
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS units (
      id INT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      plant VARCHAR(150) NOT NULL,
      location VARCHAR(100) NOT NULL,
      filter_name VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      risk_score INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS thresholds (
      id INT PRIMARY KEY DEFAULT 1,
      dp_normal DECIMAL(5,2) NOT NULL DEFAULT 1.40,
      dp_warning DECIMAL(5,2) NOT NULL DEFAULT 2.00,
      dp_critical DECIMAL(5,2) NOT NULL DEFAULT 2.60,
      design_flow INT NOT NULL DEFAULT 6500,
      rate_warning DECIMAL(5,2) NOT NULL DEFAULT 0.25,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensor_data (
      id VARCHAR(100) PRIMARY KEY,
      unit_id INT NOT NULL,
      timestamp VARCHAR(50) NOT NULL,
      pressure_inlet DECIMAL(6,2) NOT NULL,
      pressure_outlet DECIMAL(6,2) NOT NULL,
      differential_pressure DECIMAL(6,2) NOT NULL,
      flow_rate INT NOT NULL,
      temperature DECIMAL(5,2) NOT NULL,
      pump_current DECIMAL(6,2) NOT NULL,
      valve_position INT NOT NULL,
      sensor_status VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
      risk_score INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'NORMAL',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_unit_time (unit_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS alarms (
      id INT AUTO_INCREMENT PRIMARY KEY,
      unit_id INT NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(150) NOT NULL,
      level VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      triggered_at VARCHAR(50) NOT NULL,
      acknowledged_at VARCHAR(50) NULL,
      resolved_at VARCHAR(50) NULL,
      note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT PRIMARY KEY,
      user_id INT NOT NULL,
      action VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      created_at VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function bootstrapData(seedData) {
  if (!pool || !seedData) return;

  // 1. Users
  const [userRows] = await pool.query("SELECT COUNT(*) as cnt FROM users");
  if (userRows[0].cnt === 0) {
    for (const u of seedData.users) {
      await pool.query(
        "INSERT INTO users (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)",
        [u.id, u.name, u.email, u.role, u.password_hash]
      );
    }
  }

  // 2. Units
  const [unitRows] = await pool.query("SELECT COUNT(*) as cnt FROM units");
  if (unitRows[0].cnt === 0) {
    for (const u of seedData.units) {
      await pool.query(
        "INSERT INTO units (id, code, name, plant, location, filter_name, status, risk_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [u.id, u.code, u.name, u.plant, u.location, u.filter_name, u.status, u.risk_score]
      );
    }
  }

  // 3. Thresholds
  const [thRows] = await pool.query("SELECT COUNT(*) as cnt FROM thresholds");
  if (thRows[0].cnt === 0) {
    const t = seedData.thresholds;
    await pool.query(
      "INSERT INTO thresholds (id, dp_normal, dp_warning, dp_critical, design_flow, rate_warning) VALUES (1, ?, ?, ?, ?, ?)",
      [t.dp_normal, t.dp_warning, t.dp_critical, t.design_flow, t.rate_warning]
    );
  }

  // 4. Alarms
  const [alarmRows] = await pool.query("SELECT COUNT(*) as cnt FROM alarms");
  if (alarmRows[0].cnt === 0) {
    for (const a of seedData.alarms) {
      await pool.query(
        "INSERT INTO alarms (id, unit_id, code, name, level, message, status, triggered_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [a.id, a.unit_id, a.code, a.name, a.level, a.message, a.status, a.triggered_at, a.note || ""]
      );
    }
  }
}

export async function loadStateFromDb() {
  if (!pool || !isConnected) return null;

  try {
    const [users] = await pool.query("SELECT id, name, email, role, password_hash FROM users");
    const [units] = await pool.query("SELECT id, code, name, plant, location, filter_name, status, risk_score FROM units");
    const [th] = await pool.query("SELECT dp_normal, dp_warning, dp_critical, design_flow, rate_warning FROM thresholds LIMIT 1");
    const [alarms] = await pool.query("SELECT id, unit_id, code, name, level, message, status, triggered_at, acknowledged_at, resolved_at, note FROM alarms ORDER BY id DESC LIMIT 50");
    const [sensorData] = await pool.query("SELECT id, unit_id, timestamp, pressure_inlet, pressure_outlet, differential_pressure, flow_rate, temperature, pump_current, valve_position, sensor_status, risk_score, status FROM sensor_data ORDER BY created_at DESC LIMIT 300");
    const [auditLogs] = await pool.query("SELECT id, user_id, action, description, created_at FROM audit_logs ORDER BY id DESC LIMIT 50");

    const thresholds = th[0] ? {
      dp_normal: Number(th[0].dp_normal),
      dp_warning: Number(th[0].dp_warning),
      dp_critical: Number(th[0].dp_critical),
      design_flow: Number(th[0].design_flow),
      rate_warning: Number(th[0].rate_warning)
    } : null;

    return {
      users,
      units,
      thresholds,
      alarms: alarms.reverse(),
      sensorData: sensorData.reverse(),
      auditLogs
    };
  } catch (err) {
    console.error("Gagal membaca state dari MySQL:", err.message);
    return null;
  }
}

export async function saveReadingToDb(reading) {
  if (!pool || !isConnected) return;
  try {
    await pool.query(
      `INSERT INTO sensor_data (id, unit_id, timestamp, pressure_inlet, pressure_outlet, differential_pressure, flow_rate, temperature, pump_current, valve_position, sensor_status, risk_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status=VALUES(status), risk_score=VALUES(risk_score)`,
      [
        reading.id,
        reading.unit_id,
        reading.timestamp,
        reading.pressure_inlet,
        reading.pressure_outlet,
        reading.differential_pressure,
        reading.flow_rate,
        reading.temperature,
        reading.pump_current,
        reading.valve_position,
        reading.sensor_status,
        reading.risk_score || 0,
        reading.status || "NORMAL"
      ]
    );

    await pool.query(
      "UPDATE units SET status = ?, risk_score = ? WHERE id = ?",
      [reading.status || "NORMAL", reading.risk_score || 0, reading.unit_id]
    );
  } catch (err) {
    console.error("Gagal simpan sensor ke MySQL:", err.message);
  }
}

export async function saveAlarmToDb(alarm) {
  if (!pool || !isConnected) return;
  try {
    await pool.query(
      `INSERT INTO alarms (id, unit_id, code, name, level, message, status, triggered_at, acknowledged_at, resolved_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status=VALUES(status), acknowledged_at=VALUES(acknowledged_at), resolved_at=VALUES(resolved_at), note=VALUES(note)`,
      [
        alarm.id,
        alarm.unit_id,
        alarm.code,
        alarm.name,
        alarm.level,
        alarm.message,
        alarm.status,
        alarm.triggered_at,
        alarm.acknowledged_at || null,
        alarm.resolved_at || null,
        alarm.note || null
      ]
    );
  } catch (err) {
    console.error("Gagal simpan alarm ke MySQL:", err.message);
  }
}

export async function saveThresholdsToDb(t) {
  if (!pool || !isConnected) return;
  try {
    await pool.query(
      "UPDATE thresholds SET dp_normal = ?, dp_warning = ?, dp_critical = ?, design_flow = ?, rate_warning = ? WHERE id = 1",
      [t.dp_normal, t.dp_warning, t.dp_critical, t.design_flow, t.rate_warning]
    );
  } catch (err) {
    console.error("Gagal simpan thresholds ke MySQL:", err.message);
  }
}

export async function saveAuditLogToDb(log) {
  if (!pool || !isConnected) return;
  try {
    await pool.query(
      "INSERT INTO audit_logs (id, user_id, action, description, created_at) VALUES (?, ?, ?, ?, ?)",
      [log.id, log.user_id, log.action, log.description, log.created_at]
    );
  } catch (err) {
    console.error("Gagal simpan audit log ke MySQL:", err.message);
  }
}
