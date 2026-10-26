# Kota Mati — Panduan Pasang di GitHub Pages

Folder ini berisi game Kota Mati yang sudah dipecah menjadi beberapa file terpisah. Game dibuka lewat `https://bnsbluss.github.io/kotamati.html`, jadi halaman profilmu di `index.html` **tidak tersentuh**.

## 1. Isi folder

| File / folder | Isi |
|---|---|
| `kotamati.html` | Halaman utama game |
| `kotamati/css/style.css` | Semua tampilan (warna, tombol, menu) |
| `kotamati/js/game.js` | Mesin game: grafis, zombie, senjata, mode online, HUD |
| `kotamati/js/akun.js` | Sistem akun: daftar, masuk, EXP, pangkat, papan peringkat |
| `kotamati/js/config.js` | **Konfigurasi database (Firebase), diisi sendiri** |
| `kotamati/sound/battle.mp3` | Musik pertarungan |
| `kotamati/firestore.rules` | Aturan keamanan database, ditempel ke Firebase |
| `kotamati/PANDUAN.md` | File ini |

Semua file game ada di dalam folder `kotamati/`, supaya tidak tercampur dengan file profilmu.

## 2. Upload ke GitHub

1. Buka repo `bnsbluss/bnsbluss.github.io` di GitHub.
2. Klik **Add file → Upload files**, lalu seret file `kotamati.html` **dan** folder `kotamati` sekaligus. Struktur foldernya harus tetap sama.
3. Klik **Commit changes**. File `kotamati.html` versi lama akan otomatis tertimpa versi baru.
4. Tunggu 1–2 menit, lalu buka `https://bnsbluss.github.io/kotamati.html`.

> `index.html` (profilmu) tidak ikut di-upload dan tidak berubah.

Tanpa langkah 3 di bawah, game sudah bisa dimainkan dalam **mode tamu**: solo, co-op, dan PvP semuanya jalan, dan EXP tersimpan di browser masing-masing. Akun online dan papan peringkat baru aktif setelah Firebase disiapkan.

## 3. Menyiapkan database akun (Firebase, gratis)

GitHub Pages hanya bisa menyimpan file, tidak bisa menjalankan database. Karena itu data akun disimpan di **Firebase** milik Google (paket gratis Spark).

1. Buka https://console.firebase.google.com, masuk dengan akun Google, lalu klik **Create a project** (contoh nama: `kotamati`). Google Analytics boleh dimatikan.
2. Menu **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**. Cukup aktifkan baris pertama, lalu **Save**.
3. Menu **Build → Firestore Database → Create database**:
   - Lokasi: `asia-southeast2 (Jakarta)`.
   - Mode: **Start in production mode**.
4. Di Firestore, buka tab **Rules**. Hapus isinya, tempel seluruh isi file `kotamati/firestore.rules`, lalu klik **Publish**.
5. Klik ikon ⚙ **Project settings → General → Your apps → ikon Web (`</>`)**. Isi nama app, lalu klik **Register app**. Firebase akan menampilkan kode `firebaseConfig`.
6. Buka `kotamati/js/config.js`, lalu ganti setiap nilai `ISI_...` dengan nilai dari `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).
7. Menu **Authentication → Settings → Authorized domains → Add domain**, lalu tambahkan `bnsbluss.github.io` (nama domain saja, tanpa `https://` dan tanpa `kotamati.html`; otomatis berlaku untuk semua halaman situsmu).
8. Upload ulang `kotamati/js/config.js` ke GitHub (ke dalam folder `kotamati/js/`).

Selesai. Saat game dibuka, layar awal akan menampilkan tab **MASUK**, **DAFTAR**, dan **TAMU**.

> `apiKey` Firebase untuk web memang dirancang terlihat publik, jadi aman di-upload. Yang melindungi data adalah aturan di `firestore.rules`.

## 4. Cara kerja akun

- **Daftar** cukup dengan nama pemain (3–10 huruf, angka, atau `_`) dan password minimal 6 karakter. Tidak perlu email.
- **Nama unik:** setiap nama hanya bisa dipakai satu akun.
- **Login tetap tersimpan** di HP atau browser itu sampai pemain menekan **KELUAR AKUN**.
- **Pindah dari tamu:** EXP dan statistik dari mode tamu ikut dipindah saat pertama kali mendaftar (maksimal 20.000 EXP).
- **Lupa password:** tidak bisa direset sendiri karena akun tidak memakai email. Admin bisa menghapus akunnya di **Authentication → Users**, lalu hapus juga dokumennya di Firestore koleksi `users` dan `names`, supaya pemain bisa mendaftar ulang dengan nama yang sama.

### Data yang tersimpan (koleksi `users`)

| Data | Keterangan |
|---|---|
| Nama | `nick` dan `nickLower` |
| EXP | `exp` |
| Statistik | `kills`, `hs` (headshot), `games` (jumlah main), `best` (skor terbaik), `boss` (bos dikalahkan), `revives` (teman ditolong), `wins` (menang PvP), `waves` (gelombang tertinggi) |

Koleksi `names` mencatat nama yang sudah dipakai.

## 5. EXP dan pangkat

EXP diberikan setiap selesai satu pertandingan:

| Sumber | EXP |
|---|---|
| Ikut bermain | 20 |
| Kill zombie | 2 per kill |
| Headshot | 1 per headshot |
| Gelombang yang dilewati | 15 per gelombang |
| Raja Zombi dikalahkan | 150 |
| Menolong teman (co-op) | 30 per teman |
| Kill di PvP | 10 per kill |
| Menang PvP | 100 |

Maksimal 5.000 EXP per pertandingan. Contoh: main solo sampai gelombang 8 dengan 150 kill, 30 headshot, dan 1 Raja Zombi memberi sekitar 600 EXP.

| LV | Pangkat | EXP |
|---|---|---|
| 1 | Prajurit Dua | 0 |
| 2 | Prajurit Satu | 500 |
| 3 | Prajurit Kepala | 1.500 |
| 4 | Kopral | 3.000 |
| 5 | Sersan Dua | 5.000 |
| 6 | Sersan Satu | 8.000 |
| 7 | Sersan Kepala | 12.000 |
| 8 | Letnan Dua | 17.000 |
| 9 | Letnan Satu | 23.000 |
| 10 | Kapten | 30.000 |
| 11 | Mayor | 38.000 |
| 12 | Letnan Kolonel | 47.000 |
| 13 | Kolonel | 57.000 |
| 14 | Brigjen | 68.000 |
| 15 | Mayjen | 80.000 |
| 16 | Letjen | 95.000 |
| 17 | Jenderal | 120.000 |

Lencana pangkat tampil di kartu pemain, di atas kepala pemain lain saat main online, di layar akhir pertandingan, dan di papan peringkat.

## 6. Papan peringkat

Menu **PERINGKAT** menampilkan 50 akun terdaftar teratas berdasarkan **EXP**, **SKOR** terbaik, atau **KILL**. Pemain tamu tidak masuk papan ini.

## 7. Batasan yang perlu diketahui

- **Update aturan:** kalau sebelumnya kamu sudah menempel `firestore.rules` versi lama, tempel ulang versi baru ini lalu klik **Publish**.

- **Kecurangan:** game berjalan di browser pemain, jadi pemain yang paham kode masih bisa curang. Aturan database hanya membatasi kenaikan maksimal 5.000 EXP per pertandingan.
- **Kuota gratis Firebase:** cukup untuk komunitas kecil-menengah, kira-kira puluhan ribu baca dan belasan ribu tulis per hari. Kalau terlampaui, akun berhenti tersimpan sampai keesokan harinya.
- **Versi sama:** semua pemain harus memakai versi file yang sama supaya bisa main online bersama.

## 8. Kalau ada masalah

| Pesan / gejala | Penyebab |
|---|---|
| "Login nama dan password belum diaktifkan" | Langkah 3.2 belum dilakukan |
| "Database menolak akses" | `firestore.rules` belum di-Publish (langkah 3.4) |
| Tab MASUK/DAFTAR tidak muncul | `kotamati/js/config.js` masih berisi `ISI_...`, atau file belum ter-upload |
| Login gagal hanya di situs GitHub | Domain belum ditambahkan (langkah 3.7) |
