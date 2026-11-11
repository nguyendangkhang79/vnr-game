import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Dedicated Firebase project for vnr-game.
const firebaseConfig = {
  "projectId": "vnr-game-20261111",
  "appId": "1:48383893335:web:6da3001e9fa30601c6e812",
  "storageBucket": "vnr-game-20261111.firebasestorage.app",
  "apiKey": "AIzaSyCX8zyEpGFgDAJF9sTqIrnMvpTwBHki_xY",
  "authDomain": "vnr-game-20261111.firebaseapp.com",
  "messagingSenderId": "48383893335",
  "databaseURL": "https://vnr-game-20261111-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
