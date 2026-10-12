# DF-EWDSS

Debris Filter Early Warning and Decision Support System untuk monitoring REOC PLN Indonesia Power. Aplikasi mencakup dashboard real-time, simulator sensor, risk scoring, alarm management, rekomendasi tindakan, historical trend, threshold setting, dan ekspor PDF/Excel/CSV.

## Menjalankan aplikasi

Persyaratan: Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Backend API berjalan di `http://localhost:4000`.

Build produksi:

```bash
npm run build
npm start
```

Setelah build, aplikasi dan API tersedia dari `http://localhost:4000`.

## Akun demo

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@reoc.local` | `Admin123!` |
| Operator | `operator@reoc.local` | `Operator123!` |
| Supervisor | `supervisor@reoc.local` | `Supervisor123!` |
| Engineer | `engineer@reoc.local` | `Engineer123!` |

Hanya administrator yang dapat mengubah threshold. Semua password tersimpan sebagai bcrypt hash.

## Data lokal

Prototype menyimpan data persisten di `server/data/database.json` supaya dapat dijalankan tanpa service eksternal. File dibuat otomatis pada proses pertama dan diabaikan Git. Struktur service dan model mengikuti rancangan PostgreSQL pada dokumen spesifikasi sehingga adapter penyimpanan dapat dipindahkan ke PostgreSQL/TimescaleDB pada deployment enterprise.

Simulator menghasilkan data baru setiap 5 detik dan mengirim pembaruan melalui Socket.IO. Unit kondisi warning dan sensor offline disediakan pada seed agar seluruh alur early warning dapat langsung diuji.

## API utama

Dokumentasi machine-readable tersedia melalui `GET /api/docs` setelah autentikasi.

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/auth/login` | Login JWT |
| GET | `/api/dashboard/summary` | Ringkasan seluruh unit |
| GET | `/api/units/status` | Kondisi dan data terbaru unit |
| GET | `/api/sensor/trend?unit_id=1&hours=24` | Histori sensor |
| GET | `/api/alarms` | Alarm aktif dan histori |
| POST | `/api/alarms/:id/acknowledge` | Acknowledge alarm |
| POST | `/api/alarms/:id/resolve` | Resolve alarm |
| GET | `/api/recommendations` | Rekomendasi DSS |
| GET/PUT | `/api/settings/thresholds` | Konfigurasi threshold |
| GET | `/api/reports/daily?format=pdf` | Ekspor `pdf`, `xlsx`, atau `csv` |
| POST | `/api/integration/sensor-data` | Ingest data sensor |

Endpoint selain login memerlukan header `Authorization: Bearer <token>`. Endpoint integrasi juga memerlukan `x-api-key` sesuai `SENSOR_API_KEY`.

## Risk scoring

Skor risiko dihitung dari differential pressure 35%, flow degradation 25%, rate of change 20%, alarm frequency 10%, dan sensor health 10%. Aturan threshold tetap menjadi override agar tekanan kritis, penurunan aliran besar, atau sensor offline tidak tertahan oleh rata-rata bobot.

## Pengujian

```bash
npm test
npm run build
```

Variabel lingkungan dapat disalin dari `.env.example`. HTTPS, secret eksternal, PostgreSQL/TimescaleDB, backup, dan reverse proxy wajib dikonfigurasi sebelum deployment produksi.
