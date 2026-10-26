/* Konfigurasi akun online Kota Mati (Firebase).
   1. Buat project gratis di https://console.firebase.google.com
   2. Tambahkan Web App, lalu salin nilai firebaseConfig ke bawah ini.
   3. Aktifkan Authentication > Email/Password, dan buat Firestore Database.
   4. Tempel isi file firestore.rules ke tab Rules di Firestore.
   Selama apiKey masih "ISI_API_KEY", game berjalan dalam mode tamu (tanpa akun & leaderboard online). */
window.KM_FIREBASE = {
  apiKey: "ISI_API_KEY",
  authDomain: "ISI_PROJECT_ID.firebaseapp.com",
  projectId: "ISI_PROJECT_ID",
  storageBucket: "ISI_PROJECT_ID.appspot.com",
  messagingSenderId: "ISI_SENDER_ID",
  appId: "ISI_APP_ID"
};
