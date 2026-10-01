# Katalog Rumah Pilihan Keluarga (Cimahi Selatan, Margaasih, Nanjung)

Mobile-friendly property finder web application designed specifically for family decision-making. Built with a dark-mode reverse engineering of Pinhome's information architecture.

## 🎨 Design Specs
- **Color Palette:**
  - Base Canvas: `#17181D`
  - Card Surface: `#1E2128` (Elevated `#262B34`)
  - Slate Accent & Hairline Borders: `#506872`
  - Typography: `#FFFFF3` (Warm Off-White)
  - WhatsApp Accent: `#25D366`
- **Typography & Geometry:** Clean system font stack, purposeful 8px to 12px radii, zero em-dashes.

## 🚀 Fitur Utama
1. **Dua Kategori Utama (Pinhome Style):**
   - **Rumah Second (Utama):** Fokus rumah bekas bernilai tinggi dengan harga realistis, legalitas SHM, dan siap 3 kamar tidur tanpa renovasi besar.
   - **Cluster Baru / Indent:** Referensi cluster perumahan baru developer (seperti Parahyangan Garden City).
2. **Interactive Swipeable Gallery:**
   - Swipe foto langsung dengan jari di HP (touch event listener).
   - Tombol panah di desktop.
   - Counter foto (e.g. 1/4) dan klik foto untuk inspeksi Lightbox layar penuh.
3. **Analisis Kebutuhan 4 Orang (3 Kamar):**
   - Evaluasi kelayakan kamar untuk Ayah, Ibu, dan anak-anak.
4. **Kalkulasi Sisa Modal Usaha Mobil Bekas Ayah:**
   - Menghitung estimasi sisa uang tunai dari penjualan rumah TKI 1 (target Rp 700-720 Jt) setelah membeli rumah tersebut.
5. **Akses Langsung Kontak:**
   - Tombol hijau WhatsApp (`wa.me`) dengan pesan otomatis yang menyebutkan nama unit dan harga.
   - Tombol "Cek Sumber" menuju listing Instagram / portal asli.

## 📂 Struktur File
```text
/root/bandung-house-finder/
├── index.html            # Single page app entrypoint
├── css/
│   └── styles.css        # Pinhome dark-mode styling system
├── js/
│   └── app.js            # Dynamic rendering, carousel swipe, filter engine
├── data/
│   └── listings.json     # Decoupled listings data (CRON / scraper ready)
├── package.json
├── vercel.json           # Vercel zero-config static deployment
└── README.md
```

## 🌐 Cara Deploy ke Vercel

### Opsi A: Menggunakan Vercel CLI dari Desktop
Di terminal komputer lokal Anda:
```bash
# Salin folder dari VPS ke komputer lokal
scp -r root@<IP_VPS>:/root/bandung-house-finder ./bandung-house-finder

# Masuk ke direktori dan jalankan Vercel CLI
cd bandung-house-finder
vercel deploy --prod
```

### Opsi B: Push ke GitHub & Hubungkan ke Vercel Dashboard
1. Buat repository baru di GitHub (misal: `bandung-house-finder`).
2. Masukkan remote origin dan push folder ini.
3. Buka dashboard Vercel -> "Add New Project" -> Import repository tersebut. Vercel akan otomatis mendeteksi konfigurasi `vercel.json` dan menyajikan website dalam 10 detik.
