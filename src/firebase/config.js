// Firebase Configuration
// Doğrudan yapılandırma

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyDyVwSJcM1inVDz6adMseIZneQ1Z6TRxdM",
    authDomain: "irfaniyetalebekeyfiyet.firebaseapp.com",
    projectId: "irfaniyetalebekeyfiyet",
    storageBucket: "irfaniyetalebekeyfiyet.firebasestorage.app",
    messagingSenderId: "663609578638",
    appId: "1:663609578638:web:7a17620c4d0ee92855a5df"
}

// Firebase'i başlat
const app = initializeApp(firebaseConfig)

// Firestore veritabanı
export const db = getFirestore(app)

// Firebase Auth
export const auth = getAuth(app)

export default app
