# Panduan Lengkap Deploy DF-EWDSS ke Niagahoster

Dokumen ini berisi panduan langkah demi langkah untuk mengonlinekan aplikasi **DF-EWDSS (Debris Filter Early Warning and Decision Support System)** ke layanan hosting Niagahoster, baik menggunakan **cPanel / Cloud Hosting (Setup Node.js App)** maupun **VPS Niagahoster**.

---

## Ringkasan Perbaikan yang Telah Diterapkan

Folder proyek ini telah diperbaiki dan distandarisasi agar siap online (*production-ready*):

1. **Entry Point Root (`app.js`)**:
   Dibuat file `app.js` di root folder sebagai startup file standar yang kompatibel dengan CloudLinux Phusion Passenger pada cPanel Niagahoster.
2. **Penanganan Port Dinamis (`process.env.PORT`)**:
   Backend Express kini mendukung port numerik (misal `4000`) maupun Unix domain socket yang biasa diberikan oleh Phusion Passenger tanpa menyebabkan error `NaN`.
3. **CORS & WebSocket Fleksibel**:
   Socket.IO dan Express CORS dikonfigurasi dinamis agar mengenali domain produksi tanpa memblokir koneksi real-time.
4. **Trust Proxy Support**:
   Diaktifkan `app.set("trust proxy", 1)` agar *rate limiting* dan pencatatan IP berjalan normal di balik reverse proxy LiteSpeed / Apache / Nginx / Cloudflare di Niagahoster.
5. **Penyajian Otomatis SPA Frontend**:
   Backend secara otomatis menemukan dan menyajikan hasil build React (`client/dist`), serta mengarahkan rute halaman SPA tanpa merusak rute `/api/*`.
6. **Dependensi Root `package.json`**:
   Semua runtime dependencies backend dicatat di root `package.json` agar tombol **"Run NPM Install"** pada cPanel langsung menginstal seluruh modul yang dibutuhkan.
7. **Konfigurasi Server `.htaccess` & `ecosystem.config.cjs`**:
   Disediakan `.htaccess` siap pakai untuk cPanel/LiteSpeed dan `ecosystem.config.cjs` untuk pengguna VPS/PM2.
8. **Skrip Bundling Otomatis (`npm run bundle`)**:
   Tersedia perintah satu klik untuk mengemas seluruh file produksi menjadi `niagahoster-deploy.zip` bersih tanpa `node_modules` sampah.

---

## Cara 1: Deploy di cPanel / Cloud Hosting Niagahoster (Paling Umum)

Metode ini menggunakan fitur resmi cPanel Niagahoster: **Setup Node.js App**.

### Langkah 1: Buat Paket ZIP Siap Upload
Di komputer Anda (VS Code / terminal Laragon):
```bash
npm run bundle
```
Perintah ini akan mem-build frontend dan menghasilkan file **`niagahoster-deploy.zip`** di folder proyek.

### Langkah 2: Upload ke cPanel Niagahoster
1. Login ke **cPanel** Niagahoster Anda.
2. Buka menu **File Manager**.
3. Buat folder baru di luar `public_html` (misal di `/home/username/indonesian_power`) atau buat subfolder.
   > **Tips Rekomendasi:** Taruh file aplikasi di direktori `/home/username/indonesian_power`, bukan langsung di dalam `public_html`.
4. Upload file `niagahoster-deploy.zip` ke folder tersebut.
5. Klik kanan pada file `niagahoster-deploy.zip` lalu pilih **Extract**.

### Langkah 3: Konfigurasi di "Setup Node.js App"
1. Kembali ke beranda cPanel, cari dan buka menu **Setup Node.js App** (di bagian *Software*).
2. Klik tombol **Create Application**.
3. Isi kolom formulir sebagai berikut:
   - **Node.js version**: Pilih versi **20.x** (atau versi 18.x / 22.x yang tersedia).
   - **Application mode**: Pilih **Production**.
   - **Application root**: Masukkan path folder upload Anda, contoh: `indonesian_power`.
   - **Application URL**: Pilih domain atau subdomain Anda (misal `reoc.domainanda.com` atau domain utama).
   - **Application startup file**: Ketik `app.js`.
4. Di bagian **Environment variables**, tambahkan variabel berikut:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (masukkan teks acak panjang untuk keamanan JWT)
   - `SENSOR_API_KEY` = (masukkan API key sensor Anda)
   - `CLIENT_ORIGIN` = `*`
5. Klik tombol **Create** di kanan atas.

### Langkah 4: Install Dependencies di Server
1. Setelah aplikasi terbuat, pada halaman aplikasi tersebut cari tombol **Run NPM Install**.
2. Klik tombol **Run NPM Install** dan tunggu beberapa saat hingga muncul notifikasi sukses instalasi modul.
   *(Jika tombol tidak aktif, Anda juga bisa menjalankan `npm install --omit=dev` melalui menu cPanel Terminal).*

### Langkah 5: Restart dan Uji Coba
1. Klik tombol **Restart** di panel Node.js App.
2. Buka alamat domain/subdomain Anda di browser.
3. Aplikasi DF-EWDSS akan langsung tampil online!

---

## Cara 2: Deploy di VPS Niagahoster (KVM VPS / Ubuntu / Debian)

Jika Anda menyewa VPS di Niagahoster:

### 1. Persiapan Server
Hubungkan ke VPS via SSH:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

### 2. Upload / Clone Kode
```bash
cd /var/www
git clone <URL_REPO_ANDA> indonesian_power
cd indonesian_power
npm install
npm run build
```

### 3. Konfigurasi Environment
```bash
cp .env.production.example .env
nano .env
# Sesuaikan PORT=4000, JWT_SECRET, SENSOR_API_KEY
```

### 4. Jalankan Aplikasi dengan PM2
```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 5. Konfigurasi Nginx Reverse Proxy
Buat file konfigurasi Nginx:
```bash
sudo nano /etc/nginx/sites-available/df-ewdss
```
Isi dengan konfigurasi berikut:
```nginx
server {
    listen 80;
    server_name reoc.domainanda.com;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Aktifkan dan restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/df-ewdss /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Pasang SSL Gratis (HTTPS)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d reoc.domainanda.com
```

---

## Akun Login Default Sistem

Setelah aplikasi online, gunakan akun berikut untuk masuk ke Control Center:

| Role | Email | Password | Hak Akses |
|---|---|---|---|
| **Administrator** | `admin@reoc.local` | `Admin123!` | Monitoring, Alarm, dan Konfigurasi Threshold |
| **Operator** | `operator@reoc.local` | `Operator123!` | Dashboard, Monitoring, dan Acknowledge Alarm |
| **Supervisor** | `supervisor@reoc.local` | `Supervisor123!` | Monitoring, Review Tindakan, dan Laporan |
| **Engineer** | `engineer@reoc.local` | `Engineer123!` | Analisis Historis Trend dan Diagnosa Unit |

---

## Troubleshooting Kendala Umum di Niagahoster

1. **Muncul pesan 503 Service Unavailable di cPanel**:
   - Pastikan versi Node.js dipilih **20.x** (atau minimal 18.x).
   - Pastikan **Application startup file** diisi `app.js` (bukan kosong).
   - Klik tombol **Restart** pada menu Setup Node.js App.
   - Cek log error di file `stderr.log` di dalam folder aplikasi Anda di File Manager.

2. **Error `Cannot find module 'express'`**:
   - Anda belum mengklik tombol **Run NPM Install** di menu cPanel Setup Node.js App.
   - Klik tombol **Run NPM Install**, lalu restart aplikasi.

3. **Status Sensor atau Alarm tidak update real-time**:
   - Periksa apakah domain Anda menggunakan Cloudflare. Jika ya, pastikan fitur **WebSockets** di dashboard Cloudflare (menu Network -> WebSockets) dalam kondisi **ON**.
   - Socket.IO di aplikasi ini sudah dilengkapi fallback ke HTTP Long-Polling otomatis jika WebSocket terhalang proxy hosting.

4. **Database tidak tersimpan / reset saat restart**:
   - Data lokal disimpan di `server/data/database.json`.
   - Pastikan folder `server/data` memiliki izin tulis (*write permission*, chmod 755 atau 775) di File Manager cPanel.
