# DEBRIS FILTER EARLY WARNING AND DECISION SUPPORT SYSTEM
## Web-Based Dashboard Monitoring System for REOC PLN Indonesia Power

> Dokumen ini adalah spesifikasi awal dalam format Markdown untuk pengembangan aplikasi web-based dashboard monitoring **Debris Filter Early Warning and Decision Support System** pada lingkungan **REOC PLN Indonesia Power**. Sistem dirancang sebagai platform pemantauan, peringatan dini, dan pendukung keputusan terhadap kondisi debris filter untuk membantu operator mendeteksi potensi penyumbatan, penurunan performa aliran, dan risiko gangguan operasi.

---

# 1. Nama Aplikasi

**Debris Filter Early Warning and Decision Support System**

Singkatan: **DF-EWDSS**

Nama lengkap:

**Debris Filter Early Warning and Decision Support System for REOC PLN Indonesia Power**

---

# 2. Latar Belakang

Pada sistem pembangkit listrik, debris filter berfungsi menyaring kotoran, sampah, lumpur, material organik, dan partikel lain yang terbawa oleh aliran air pendingin atau sistem intake. Kondisi debris filter yang tersumbat dapat menyebabkan penurunan debit aliran, peningkatan differential pressure, penurunan efisiensi pendinginan, peningkatan beban pompa, hingga potensi gangguan operasi unit pembangkit.

Dalam operasi pembangkit modern, pemantauan debris filter tidak cukup hanya dilakukan secara manual atau berdasarkan inspeksi berkala. Diperlukan sistem berbasis dashboard yang mampu membaca data sensor secara real-time atau near real-time, mendeteksi anomali, memberikan peringatan dini, serta membantu operator mengambil keputusan berdasarkan level risiko.

Aplikasi **Debris Filter Early Warning and Decision Support System** dirancang sebagai sistem pemantauan berbasis web untuk mendukung REOC PLN Indonesia Power dalam monitoring, analisis kondisi, peringatan dini, dan rekomendasi tindakan terhadap debris filter secara terpusat, cepat, dan terukur.

---

# 3. Tujuan Pengembangan

Tujuan utama aplikasi:

1. Membuat dashboard monitoring debris filter berbasis web.
2. Menampilkan kondisi debris filter secara real-time atau near real-time.
3. Mendeteksi indikasi awal penyumbatan debris filter.
4. Memberikan status peringatan dini berbasis parameter operasional.
5. Membantu operator menentukan tindakan berdasarkan level risiko.
6. Menyimpan histori data sensor dan kejadian alarm.
7. Menyediakan laporan kondisi debris filter.
8. Mendukung pengambilan keputusan operasional pada lingkungan REOC PLN Indonesia Power.

---

# 4. Ruang Lingkup Sistem

Sistem mencakup:

1. Monitoring parameter debris filter.
2. Dashboard visual kondisi unit.
3. Early Warning System.
4. Decision Support System.
5. Manajemen alarm.
6. Histori data sensor.
7. Laporan operasional.
8. Manajemen user dan role.
9. Integrasi data sensor, SCADA, PLC, OPC-UA, MQTT, REST API, atau CSV import.
10. Analitik rule-based recommendation.

Sistem ini **tidak mengambil alih kontrol fisik peralatan secara otomatis**. Sistem hanya memberikan informasi, peringatan, dan rekomendasi kepada operator.

---

# 5. Pengguna Sistem

## 5.1 Operator REOC

Hak akses:

- melihat dashboard real-time;
- menerima alarm;
- melihat rekomendasi tindakan;
- menambahkan catatan tindak lanjut;
- menandai alarm sebagai acknowledged.

## 5.2 Supervisor

Hak akses:

- melihat seluruh dashboard;
- melihat laporan harian, mingguan, bulanan;
- mengevaluasi histori alarm;
- memvalidasi tindak lanjut operator;
- melihat performa unit.

## 5.3 Engineer / Maintenance

Hak akses:

- melihat trend sensor;
- menganalisis histori debris filter;
- menambahkan jadwal inspeksi;
- melihat rekomendasi maintenance;
- export data.

## 5.4 Administrator

Hak akses:

- mengelola user;
- mengelola role;
- mengatur threshold alarm;
- mengatur daftar unit;
- mengelola parameter sistem;
- melakukan konfigurasi integrasi data.

---

# 6. Modul Utama Aplikasi

## 6.1 Dashboard Monitoring

Fitur:

- daftar unit pembangkit;
- status debris filter tiap unit;
- status normal, watch, warning, critical, offline;
- nilai differential pressure;
- debit inlet dan outlet;
- temperatur air;
- arus motor/pump current opsional;
- status pompa;
- status valve;
- alarm aktif;
- grafik real-time;
- indikator warna.

Status warna:

| Status | Warna | Makna |
|---|---|---|
| Normal | Hijau | Kondisi aman |
| Watch | Biru | Perlu dipantau |
| Warning | Kuning | Ada indikasi gangguan awal |
| Critical | Merah | Risiko tinggi, perlu tindakan segera |
| Offline | Abu-abu | Data tidak tersedia |

---

## 6.2 Early Warning System

Parameter utama:

1. Differential Pressure.
2. Flow Rate.
3. Pressure Inlet.
4. Pressure Outlet.
5. Rate of Change Differential Pressure.
6. Filter Cleaning Frequency.
7. Alarm History.
8. Pump Load / Motor Current opsional.
9. Temperature Cooling Water opsional.
10. Sensor Health.

Contoh aturan:

```text
Jika differential pressure > threshold_warning
AND flow rate turun lebih dari 10%
THEN status = WARNING.
```

```text
Jika differential pressure > threshold_critical
OR flow rate turun lebih dari 25%
THEN status = CRITICAL.
```

```text
Jika data sensor tidak update lebih dari 5 menit
THEN status = OFFLINE.
```

---

## 6.3 Decision Support System

Decision Support System memberi rekomendasi tindakan berdasarkan kondisi sistem.

| Kondisi | Rekomendasi |
|---|---|
| Differential pressure naik perlahan | Pantau trend dan jadwalkan inspeksi |
| Differential pressure tinggi | Lakukan backwash atau cleaning |
| Flow rate turun signifikan | Periksa debris filter dan jalur inlet |
| Alarm berulang dalam 24 jam | Lakukan inspeksi fisik filter |
| Sensor tidak update | Periksa koneksi data atau perangkat sensor |
| Kondisi critical | Eskalasi ke supervisor dan maintenance |

Formula skor risiko:

```text
risk_score =
(dp_score * 0.35)
+ (flow_score * 0.25)
+ (rate_change_score * 0.20)
+ (alarm_frequency_score * 0.10)
+ (sensor_health_score * 0.10)
```

Kategori risiko:

| Risk Score | Level |
|---|---|
| 0 - 30 | Normal |
| 31 - 50 | Watch |
| 51 - 70 | Warning |
| 71 - 100 | Critical |

---

## 6.4 Alarm Management

Fitur:

- daftar alarm aktif;
- alarm priority;
- alarm acknowledgement;
- catatan operator;
- waktu alarm muncul;
- waktu alarm selesai;
- status alarm;
- riwayat alarm;
- filter berdasarkan unit, tanggal, level, dan status.

Level alarm:

1. Info.
2. Watch.
3. Warning.
4. Critical.

Status alarm:

1. Active.
2. Acknowledged.
3. Resolved.
4. Escalated.

---

## 6.5 Trend and Historical Data

Fitur:

- grafik trend differential pressure;
- grafik flow rate;
- grafik pressure inlet dan outlet;
- grafik risk score;
- grafik alarm frequency;
- filter tanggal;
- export CSV, Excel, dan PDF;
- perbandingan antar unit.

Periode tampilan:

- 1 jam terakhir;
- 6 jam terakhir;
- 24 jam terakhir;
- 7 hari;
- 30 hari;
- custom range.

---

## 6.6 Report Management

Jenis laporan:

1. Laporan kondisi harian debris filter.
2. Laporan alarm harian.
3. Laporan trend differential pressure.
4. Laporan status unit.
5. Laporan rekomendasi maintenance.
6. Laporan downtime atau sensor offline.
7. Laporan tindakan operator.

Format export:

- PDF;
- Excel;
- CSV.

---

# 7. Arsitektur Sistem

## 7.1 Arsitektur Umum

```text
Sensor / SCADA / PLC / OPC-UA / MQTT
            |
            v
Data Collector Service
            |
            v
Backend API + Data Processing Engine
            |
            v
Database + Time-Series Storage
            |
            v
Web Dashboard REOC
            |
            v
Operator / Supervisor / Engineer
```

## 7.2 Arsitektur Detail

```text
+-----------------------------------------------------------+
|                   Web Dashboard Frontend                  |
| React / Vue / Next.js                                     |
| - Dashboard Monitoring                                    |
| - Alarm Page                                              |
| - Trend Chart                                             |
| - DSS Recommendation                                      |
| - Report Page                                             |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                     Backend API Service                   |
| Laravel / Node.js / FastAPI                               |
| - Authentication                                          |
| - Sensor Data API                                         |
| - Alarm Engine                                            |
| - Risk Scoring Engine                                     |
| - Decision Support Engine                                 |
| - Report Generator                                        |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                         Database                          |
| PostgreSQL / MySQL / TimescaleDB                          |
| - User                                                    |
| - Unit                                                    |
| - Sensor Data                                             |
| - Alarm                                                   |
| - Recommendation                                          |
| - Report                                                  |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|                    Data Integration Layer                 |
| OPC-UA / MQTT / REST API / CSV Import                     |
| - SCADA                                                   |
| - PLC                                                     |
| - Sensor Gateway                                          |
| - Data Logger                                             |
+-----------------------------------------------------------+
```

---

# 8. Rekomendasi Teknologi

## 8.1 Opsi 1: Laravel Fullstack

Frontend:

- Laravel Blade;
- Tailwind CSS;
- Chart.js / Apache ECharts;
- Leaflet jika perlu peta.

Backend:

- Laravel;
- MySQL / PostgreSQL;
- Laravel Sanctum;
- Laravel Scheduler;
- Laravel Queue;
- Laravel Excel;
- DomPDF.

Kelebihan:

- cepat dibuat;
- cocok untuk dashboard internal;
- mudah membuat admin panel;
- mudah membuat laporan PDF/Excel.

## 8.2 Opsi 2: Laravel API + React

Frontend:

- React.js;
- Vite;
- Tailwind CSS;
- Recharts / ECharts;
- Axios;
- React Router.

Backend:

- Laravel REST API;
- PostgreSQL / MySQL;
- Laravel Sanctum;
- Queue Worker;
- Scheduler.

Kelebihan:

- tampilan modern;
- dashboard responsif;
- grafik interaktif;
- cocok untuk pengembangan jangka panjang.

## 8.3 Opsi 3: Node.js + React

Frontend:

- React.js;
- Tailwind CSS;
- Apache ECharts;
- Socket.IO Client.

Backend:

- Node.js;
- Express.js;
- Socket.IO;
- PostgreSQL;
- TimescaleDB;
- MQTT.js;
- OPC-UA Client.

Kelebihan:

- kuat untuk real-time;
- cocok jika data sensor dikirim terus-menerus;
- mudah integrasi MQTT dan WebSocket.

## 8.4 Rekomendasi Utama

Untuk sistem monitoring REOC, rekomendasi utama:

```text
Frontend: React.js + Tailwind CSS
Backend: Node.js / Express.js
Realtime: Socket.IO
Database: PostgreSQL + TimescaleDB
Integration: MQTT / OPC-UA / REST API
Chart: Apache ECharts
Authentication: JWT
```

Jika prioritas adalah cepat jadi dan mudah maintenance:

```text
Laravel + React + PostgreSQL
```

---

# 9. Database Design

## 9.1 users

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password TEXT,
    role VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 9.2 power_units

```sql
CREATE TABLE power_units (
    id SERIAL PRIMARY KEY,
    unit_code VARCHAR(50),
    unit_name VARCHAR(100),
    location VARCHAR(150),
    plant_name VARCHAR(150),
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 9.3 debris_filters

```sql
CREATE TABLE debris_filters (
    id SERIAL PRIMARY KEY,
    unit_id INT,
    filter_code VARCHAR(50),
    filter_name VARCHAR(100),
    filter_type VARCHAR(100),
    design_flow_rate FLOAT,
    design_pressure FLOAT,
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 9.4 sensor_data

```sql
CREATE TABLE sensor_data (
    id BIGSERIAL PRIMARY KEY,
    unit_id INT,
    filter_id INT,
    timestamp TIMESTAMP,
    pressure_inlet FLOAT,
    pressure_outlet FLOAT,
    differential_pressure FLOAT,
    flow_rate FLOAT,
    temperature FLOAT,
    pump_current FLOAT,
    valve_position FLOAT,
    sensor_status VARCHAR(50),
    created_at TIMESTAMP
);
```

## 9.5 alarms

```sql
CREATE TABLE alarms (
    id BIGSERIAL PRIMARY KEY,
    unit_id INT,
    filter_id INT,
    alarm_code VARCHAR(50),
    alarm_name VARCHAR(150),
    alarm_level VARCHAR(50),
    alarm_message TEXT,
    status VARCHAR(50),
    triggered_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    acknowledged_by INT,
    operator_note TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 9.6 recommendations

```sql
CREATE TABLE recommendations (
    id BIGSERIAL PRIMARY KEY,
    unit_id INT,
    filter_id INT,
    alarm_id INT,
    risk_score FLOAT,
    risk_level VARCHAR(50),
    recommendation_text TEXT,
    action_priority VARCHAR(50),
    created_at TIMESTAMP
);
```

## 9.7 threshold_settings

```sql
CREATE TABLE threshold_settings (
    id SERIAL PRIMARY KEY,
    filter_id INT,
    parameter_name VARCHAR(100),
    normal_min FLOAT,
    normal_max FLOAT,
    warning_min FLOAT,
    warning_max FLOAT,
    critical_min FLOAT,
    critical_max FLOAT,
    unit VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 9.8 audit_logs

```sql
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(150),
    description TEXT,
    ip_address VARCHAR(100),
    created_at TIMESTAMP
);
```

---

# 10. API Specification

## 10.1 Authentication

```text
POST /api/auth/login
```

Request:

```json
{
  "email": "operator@reoc.local",
  "password": "password123"
}
```

Response:

```json
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "name": "Operator REOC",
    "role": "operator"
  }
}
```

## 10.2 Dashboard Summary

```text
GET /api/dashboard/summary
```

Response:

```json
{
  "total_units": 12,
  "normal": 8,
  "watch": 2,
  "warning": 1,
  "critical": 1,
  "offline": 0,
  "active_alarms": 5
}
```

## 10.3 Unit Status

```text
GET /api/units/status
```

Response:

```json
[
  {
    "unit_id": 1,
    "unit_name": "Unit 1",
    "filter_name": "Debris Filter A",
    "differential_pressure": 1.8,
    "flow_rate": 6200,
    "risk_score": 42,
    "status": "WATCH"
  }
]
```

## 10.4 Latest Sensor Data

```text
GET /api/sensor/latest?unit_id=1
```

Response:

```json
{
  "unit_id": 1,
  "timestamp": "2026-10-12T14:00:00",
  "pressure_inlet": 3.2,
  "pressure_outlet": 1.6,
  "differential_pressure": 1.6,
  "flow_rate": 6100,
  "temperature": 29.5,
  "sensor_status": "ONLINE"
}
```

## 10.5 Historical Trend

```text
GET /api/sensor/trend?unit_id=1&start=2026-10-01&end=2026-10-12
```

## 10.6 Active Alarms

```text
GET /api/alarms/active
```

## 10.7 Acknowledge Alarm

```text
POST /api/alarms/:id/acknowledge
```

Request:

```json
{
  "note": "Operator telah melakukan pengecekan awal."
}
```

## 10.8 Resolve Alarm

```text
POST /api/alarms/:id/resolve
```

Request:

```json
{
  "note": "Cleaning debris filter telah dilakukan."
}
```

## 10.9 Recommendation

```text
GET /api/recommendations?unit_id=1
```

## 10.10 Report Export

```text
GET /api/reports/daily?date=2026-10-12&format=pdf
GET /api/reports/monthly?month=2026-10&format=xlsx
```

---

# 11. Rule-Based Early Warning Logic

## 11.1 Differential Pressure Rule

```pseudo
IF differential_pressure <= normal_max:
    status = NORMAL
ELSE IF differential_pressure > normal_max
AND differential_pressure <= warning_max:
    status = WATCH
ELSE IF differential_pressure > warning_max
AND differential_pressure <= critical_max:
    status = WARNING
ELSE IF differential_pressure > critical_max:
    status = CRITICAL
```

## 11.2 Flow Rate Rule

```pseudo
flow_drop_percentage =
((design_flow_rate - current_flow_rate) / design_flow_rate) * 100

IF flow_drop_percentage < 10:
    flow_status = NORMAL
ELSE IF flow_drop_percentage >= 10 AND flow_drop_percentage < 20:
    flow_status = WATCH
ELSE IF flow_drop_percentage >= 20 AND flow_drop_percentage < 30:
    flow_status = WARNING
ELSE:
    flow_status = CRITICAL
```

## 11.3 Rate of Change Rule

```pseudo
dp_rate =
(current_differential_pressure - previous_differential_pressure) / time_interval

IF dp_rate > rate_threshold:
    status = WARNING
```

## 11.4 Combined Risk Score

```pseudo
risk_score =
(dp_score * 0.35)
+ (flow_score * 0.25)
+ (dp_rate_score * 0.20)
+ (alarm_frequency_score * 0.10)
+ (sensor_health_score * 0.10)

IF risk_score <= 30:
    risk_level = NORMAL
ELSE IF risk_score <= 50:
    risk_level = WATCH
ELSE IF risk_score <= 70:
    risk_level = WARNING
ELSE:
    risk_level = CRITICAL
```

---

# 12. Decision Support Rules

## 12.1 Normal

```text
Kondisi debris filter normal. Lanjutkan monitoring rutin.
```

## 12.2 Watch

```text
Terjadi indikasi perubahan parameter. Operator disarankan memantau trend differential pressure dan flow rate selama periode berikutnya.
```

## 12.3 Warning

```text
Terdeteksi potensi penyumbatan awal pada debris filter. Disarankan melakukan pengecekan kondisi filter, memastikan valve berfungsi normal, dan mempersiapkan tindakan cleaning/backwash.
```

## 12.4 Critical

```text
Kondisi debris filter berada pada level kritis. Segera lakukan eskalasi kepada supervisor dan tim maintenance. Pertimbangkan tindakan cleaning/backwash serta pemeriksaan fisik untuk mencegah gangguan operasi.
```

## 12.5 Offline

```text
Data sensor tidak tersedia. Periksa koneksi perangkat, gateway komunikasi, atau integrasi data SCADA/PLC.
```

---

# 13. UI/UX Dashboard

## 13.1 Halaman Login

Komponen:

- logo aplikasi;
- nama sistem;
- input email;
- input password;
- tombol login;
- informasi versi aplikasi.

## 13.2 Halaman Main Dashboard

Komponen:

1. Navbar.
2. Sidebar menu.
3. Summary card.
4. Unit status grid.
5. Real-time trend chart.
6. Active alarm panel.
7. Recommendation panel.
8. Last update indicator.

Layout:

```text
+-------------------------------------------------------------+
| Header: Debris Filter EWDSS - REOC PLN Indonesia Power      |
+---------------------+---------------------------------------+
| Sidebar             | Summary Cards                         |
| - Dashboard         | Normal | Watch | Warning | Critical    |
| - Monitoring        +---------------------------------------+
| - Alarm             | Unit Status Grid                      |
| - Trend             +---------------------------------------+
| - Report            | Trend Chart + Recommendation Panel    |
| - Setting           +---------------------------------------+
+---------------------+---------------------------------------+
```

## 13.3 Halaman Monitoring Detail

Komponen:

- pilihan unit;
- diagram debris filter;
- nilai sensor terbaru;
- status risk score;
- grafik trend;
- alarm aktif;
- rekomendasi tindakan;
- histori 24 jam.

## 13.4 Halaman Alarm

Komponen:

- tabel alarm aktif;
- filter unit;
- filter level;
- filter status;
- tombol acknowledge;
- tombol resolve;
- detail alarm;
- catatan operator.

## 13.5 Halaman Trend

Komponen:

- filter unit;
- filter tanggal;
- chart differential pressure;
- chart flow rate;
- chart pressure inlet/outlet;
- chart risk score;
- tombol export.

## 13.6 Halaman Report

Komponen:

- report harian;
- report mingguan;
- report bulanan;
- export PDF;
- export Excel;
- preview laporan.

## 13.7 Halaman Setting

Komponen:

- manajemen unit;
- manajemen debris filter;
- threshold setting;
- user management;
- role management;
- integration setting.

---

# 14. Desain Warna

Gunakan tema industrial modern.

```text
Primary Dark: #0F172A
Primary Blue: #2563EB
Industrial Cyan: #0891B2
Success Green: #16A34A
Warning Yellow: #F59E0B
Critical Red: #DC2626
Neutral Gray: #64748B
Background: #F8FAFC
Panel Dark: #1E293B
```

---

# 15. Komponen Frontend

```text
components/
├── Layout/
│   ├── Sidebar.jsx
│   ├── Topbar.jsx
│   └── PageContainer.jsx
├── Dashboard/
│   ├── SummaryCard.jsx
│   ├── UnitStatusCard.jsx
│   ├── RiskGauge.jsx
│   ├── ActiveAlarmPanel.jsx
│   └── RecommendationPanel.jsx
├── Charts/
│   ├── DifferentialPressureChart.jsx
│   ├── FlowRateChart.jsx
│   ├── RiskScoreChart.jsx
│   └── AlarmFrequencyChart.jsx
├── Alarm/
│   ├── AlarmTable.jsx
│   ├── AlarmLevelBadge.jsx
│   └── AlarmActionModal.jsx
├── Monitoring/
│   ├── FilterDiagram.jsx
│   ├── SensorValueCard.jsx
│   └── UnitSelector.jsx
└── Report/
    ├── ReportFilter.jsx
    └── ExportButton.jsx
```

---

# 16. Backend Service

```text
services/
├── sensorCollectorService.js
├── earlyWarningService.js
├── riskScoringService.js
├── decisionSupportService.js
├── alarmService.js
├── reportService.js
├── notificationService.js
└── integrationService.js
```

Scheduler:

```text
Setiap 5 detik:
- ambil data sensor terbaru;
- hitung differential pressure;
- hitung flow drop;
- hitung risk score;
- cek alarm;
- simpan data;
- broadcast ke dashboard.

Setiap 1 menit:
- cek sensor offline;
- cek alarm berulang;
- update status unit.

Setiap 1 hari:
- generate report harian.
```

---

# 17. Integrasi Data

## 17.1 MQTT

Topic contoh:

```text
reoc/unit01/debris_filter/sensor
reoc/unit01/debris_filter/status
reoc/unit01/debris_filter/alarm
```

Payload:

```json
{
  "unit_id": "UNIT01",
  "filter_id": "DF01",
  "timestamp": "2026-10-12T14:00:00",
  "pressure_inlet": 3.2,
  "pressure_outlet": 1.6,
  "flow_rate": 6100,
  "temperature": 29.5,
  "pump_current": 120.5,
  "valve_position": 85
}
```

## 17.2 OPC-UA

Data node contoh:

```text
Unit01.DebrisFilter.PressureInlet
Unit01.DebrisFilter.PressureOutlet
Unit01.DebrisFilter.FlowRate
Unit01.DebrisFilter.Temperature
Unit01.DebrisFilter.PumpCurrent
```

## 17.3 REST API

```text
POST /api/integration/sensor-data
```

## 17.4 CSV Import

Format:

```csv
timestamp,unit_id,filter_id,pressure_inlet,pressure_outlet,flow_rate,temperature,pump_current
2026-10-12 14:00:00,UNIT01,DF01,3.2,1.6,6100,29.5,120.5
```

---

# 18. Notification System

Notifikasi dapat dikirim melalui:

1. Dashboard popup.
2. Browser notification.
3. Email.
4. WhatsApp gateway opsional.
5. Telegram bot opsional.
6. Microsoft Teams opsional.

Contoh notifikasi:

```text
[CRITICAL] Unit 1 - Debris Filter A
Differential pressure mencapai 2.8 bar.
Rekomendasi: Segera lakukan pengecekan dan cleaning/backwash.
```

---

# 19. Security Requirement

Sistem harus memiliki:

1. Login user.
2. Role-based access control.
3. JWT/session authentication.
4. Audit log.
5. Password hashing.
6. Input validation.
7. Rate limiting.
8. CORS policy.
9. HTTPS saat deployment.
10. Backup database.
11. Log aktivitas user.
12. API key untuk endpoint integrasi sensor.

---

# 20. Testing Plan

## 20.1 Functional Test

- login user;
- lihat dashboard;
- baca data sensor;
- tampilkan grafik;
- trigger alarm;
- acknowledge alarm;
- resolve alarm;
- export report;
- ubah threshold.

## 20.2 Early Warning Test

Skenario:

1. Differential pressure normal.
2. Differential pressure naik ke watch.
3. Differential pressure naik ke warning.
4. Differential pressure naik ke critical.
5. Flow rate turun signifikan.
6. Sensor tidak update.
7. Alarm berulang.

## 20.3 User Acceptance Test

User:

- operator;
- supervisor;
- maintenance engineer;
- admin.

Aspek:

- kemudahan pemantauan;
- kejelasan alarm;
- kecepatan rekomendasi;
- kemudahan laporan;
- akurasi status risiko.

---

# 21. Deployment Lokal

## 21.1 Development

```bash
git clone <repository>
cd debris-filter-ewdss
```

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## 21.2 Production Internal

Rekomendasi:

- Linux server;
- Nginx reverse proxy;
- PM2 untuk Node.js;
- PostgreSQL/TimescaleDB;
- SSL internal;
- backup harian;
- monitoring service.

---

# 22. Prompt untuk Cursor / OpenCode

```text
Buatkan aplikasi web-based dashboard bernama Debris Filter Early Warning and Decision Support System untuk monitoring sistem REOC PLN Indonesia Power.

Aplikasi ini digunakan untuk memantau kondisi debris filter pada unit pembangkit. Sistem harus mampu menampilkan data sensor, menghitung differential pressure, mendeteksi potensi penyumbatan filter, memberikan alarm dini, menghitung risk score, dan memberikan rekomendasi tindakan kepada operator.

Gunakan stack:
- Frontend: React.js + Vite + Tailwind CSS
- Chart: Apache ECharts
- Backend: Node.js + Express.js
- Realtime: Socket.IO
- Database: PostgreSQL
- Optional time-series: TimescaleDB
- Authentication: JWT
- Integration mock: MQTT simulator atau CSV sensor generator

Fitur wajib:
1. Login user dengan role admin, operator, supervisor, engineer.
2. Main dashboard dengan summary status unit.
3. Unit status card untuk setiap debris filter.
4. Monitoring detail per unit.
5. Grafik real-time differential pressure.
6. Grafik flow rate.
7. Grafik risk score.
8. Alarm management.
9. Acknowledge alarm.
10. Resolve alarm.
11. Decision support recommendation.
12. Threshold setting.
13. Historical trend.
14. Report export PDF/Excel.
15. Sensor simulator untuk testing lokal.
16. API documentation.
17. README cara menjalankan project.

Parameter sensor:
- pressure_inlet
- pressure_outlet
- differential_pressure
- flow_rate
- temperature
- pump_current
- valve_position
- sensor_status

Early warning rules:
- normal, watch, warning, critical, offline.
- differential pressure threshold.
- flow rate drop threshold.
- rate of change differential pressure.
- alarm frequency.
- sensor health.

Decision support:
- jika normal: monitoring rutin.
- jika watch: pantau trend.
- jika warning: siapkan inspeksi dan cleaning/backwash.
- jika critical: eskalasi supervisor dan maintenance.
- jika offline: cek koneksi sensor/gateway.

UI harus modern, industrial, responsive, dominan warna biru gelap, cyan, hijau, kuning, dan merah. Buat tampilan profesional seperti dashboard monitoring control center.
```

---

# 23. Prompt Singkat

```text
Buat aplikasi dashboard web Debris Filter Early Warning and Decision Support System untuk REOC PLN Indonesia Power. Frontend React Vite Tailwind, backend Express, realtime Socket.IO, database PostgreSQL. Fitur: login role, dashboard status unit, monitoring debris filter, sensor data, differential pressure, flow rate, early warning normal/watch/warning/critical/offline, alarm management, acknowledge/resolve alarm, risk score, decision support recommendation, trend chart, report export, threshold setting, dan sensor simulator lokal.
```

---

# 24. Acceptance Criteria

Project dianggap selesai jika:

1. User dapat login sesuai role.
2. Dashboard menampilkan summary status unit.
3. Sistem menampilkan data sensor terbaru.
4. Differential pressure dihitung otomatis.
5. Flow rate ditampilkan.
6. Risk score dihitung otomatis.
7. Status normal/watch/warning/critical muncul sesuai rule.
8. Alarm muncul ketika threshold terlampaui.
9. Operator dapat acknowledge alarm.
10. Operator dapat resolve alarm.
11. Sistem menampilkan rekomendasi tindakan.
12. Grafik trend dapat difilter berdasarkan waktu.
13. Laporan dapat diekspor.
14. Admin dapat mengatur threshold.
15. Sensor simulator dapat menghasilkan data dummy.
16. Sistem berjalan lokal di browser.
17. README tersedia lengkap.

---

# 25. Roadmap Pengembangan

## Phase 1: Prototype

- login;
- dashboard;
- sensor simulator;
- unit status;
- alarm rule sederhana;
- trend chart.

## Phase 2: Decision Support

- risk score;
- recommendation engine;
- alarm history;
- report export;
- threshold setting.

## Phase 3: Integration

- MQTT integration;
- OPC-UA integration;
- SCADA data gateway;
- real-time notification.

## Phase 4: Predictive Analytics

- anomaly detection;
- trend prediction;
- predictive maintenance;
- machine learning risk model.

## Phase 5: Enterprise Deployment

- high availability;
- centralized logging;
- backup automation;
- cybersecurity hardening;
- integration with enterprise system.

---

# 26. Narasi Singkat untuk Proposal

Debris Filter Early Warning and Decision Support System merupakan aplikasi dashboard berbasis web yang dirancang untuk mendukung pemantauan kondisi debris filter pada lingkungan REOC PLN Indonesia Power. Sistem ini membaca parameter operasional seperti tekanan inlet, tekanan outlet, differential pressure, flow rate, temperatur, serta status sensor untuk menentukan kondisi debris filter secara real-time atau near real-time. Berdasarkan parameter tersebut, sistem menghitung risk score dan memberikan status kondisi berupa normal, watch, warning, critical, atau offline.

Selain sebagai sistem monitoring, aplikasi ini juga berfungsi sebagai early warning system dan decision support system. Ketika parameter operasi menunjukkan indikasi penyumbatan atau penurunan performa aliran, sistem akan menghasilkan alarm serta memberikan rekomendasi tindakan seperti pemantauan trend, inspeksi fisik, cleaning/backwash, atau eskalasi kepada supervisor dan tim maintenance. Dengan adanya sistem ini, proses pengambilan keputusan operator menjadi lebih cepat, terdokumentasi, dan berbasis data sehingga dapat membantu mengurangi risiko gangguan operasi pembangkit.
