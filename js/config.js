/* Konfigurasi akun online Kota Mati (Firebase).
   1. Buat project gratis di https://console.firebase.google.com
   2. Tambahkan Web App, lalu salin nilai firebaseConfig ke bawah ini.
   3. Aktifkan Authentication > Email/Password, dan buat Firestore Database.
   4. Tempel isi file firestore.rules ke tab Rules di Firestore.
   Selama apiKey masih "ISI_API_KEY", game berjalan dalam mode tamu (tanpa akun & leaderboard online). */
window.KM_FIREBASE = {
  apiKey: "AIzaSyC8leILxErge17OLJOud31kvfx8Vk4Ky6c",
  authDomain: "kotamati-a6cb3.firebaseapp.com",
  projectId: "kotamati-a6cb3",
  storageBucket: "kotamati-a6cb3.firebasestorage.app",
  messagingSenderId: "549167852652",
  appId: "1:549167852652:web:fc4e6a672cd8e0cc753c49"
};
