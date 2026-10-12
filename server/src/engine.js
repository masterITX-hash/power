export const STATUS = ["NORMAL", "WATCH", "WARNING", "CRITICAL", "OFFLINE"];

export function calculateRisk(reading, previous, threshold, alarmCount = 0) {
  if (reading.sensor_status === "OFFLINE") {
    return { risk_score: 100, status: "OFFLINE", flow_drop: 100, dp_rate: 0 };
  }

  const dpRange = Math.max(threshold.dp_critical - threshold.dp_normal, 0.1);
  const dpScore = clamp(((reading.differential_pressure - 0.4) / dpRange) * 100);
  const flowDrop = clamp(((threshold.design_flow - reading.flow_rate) / threshold.design_flow) * 100, 0, 100);
  const flowScore = clamp(flowDrop * 3.4);
  const dpRate = previous ? Math.max(0, reading.differential_pressure - previous.differential_pressure) : 0;
  const rateScore = clamp((dpRate / threshold.rate_warning) * 65);
  const alarmScore = clamp(alarmCount * 20);
  const sensorScore = reading.sensor_status === "DEGRADED" ? 65 : 0;
  const riskScore = Math.round(dpScore * 0.35 + flowScore * 0.25 + rateScore * 0.2 + alarmScore * 0.1 + sensorScore * 0.1);

  let status = riskScore <= 30 ? "NORMAL" : riskScore <= 50 ? "WATCH" : riskScore <= 70 ? "WARNING" : "CRITICAL";
  if (reading.differential_pressure > threshold.dp_critical || flowDrop >= 30) status = "CRITICAL";
  else if (reading.differential_pressure > threshold.dp_warning || flowDrop >= 20) status = maxStatus(status, "WARNING");
  else if (reading.differential_pressure > threshold.dp_normal || flowDrop >= 10) status = maxStatus(status, "WATCH");

  return { risk_score: Math.min(status === "CRITICAL" ? Math.max(riskScore, 72) : riskScore, 100), status, flow_drop: round(flowDrop), dp_rate: round(dpRate) };
}

export function recommendation(status) {
  const messages = {
    NORMAL: "Kondisi stabil. Lanjutkan monitoring rutin sesuai jadwal operasi.",
    WATCH: "Pantau tren differential pressure dan flow rate pada periode berikutnya.",
    WARNING: "Siapkan inspeksi filter, periksa valve, dan jadwalkan cleaning atau backwash.",
    CRITICAL: "Segera eskalasi ke supervisor dan maintenance. Lakukan cleaning atau backwash.",
    OFFLINE: "Periksa koneksi sensor, gateway komunikasi, dan integrasi SCADA/PLC."
  };
  return messages[status];
}

export function maxStatus(a, b) {
  const order = { NORMAL: 0, WATCH: 1, WARNING: 2, CRITICAL: 3, OFFLINE: 4 };
  return order[a] >= order[b] ? a : b;
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value) => Math.round(value * 100) / 100;
