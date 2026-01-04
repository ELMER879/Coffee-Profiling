import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQlm1Yr-J_3hpx2MZRYJSNktJlCeY8QwI",
  authDomain: "coffee-profiling.firebaseapp.com",
  projectId: "coffee-profiling",
  storageBucket: "coffee-profiling.firebasestorage.app",
  messagingSenderId: "733587244124",
  appId: "1:733587244124:web:2bd5a1e0c8dcf9a622d299"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
