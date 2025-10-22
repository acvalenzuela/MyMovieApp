import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDLZzZr2zFf-AVrm26a6KUMB_5tAjXgpQA",
  authDomain: "myspotapp-a4570.firebaseapp.com",
  projectId: "myspotapp-a4570",
  storageBucket: "myspotapp-a4570.firebasestorage.app",
  messagingSenderId: "421543617589",
  appId: "1:421543617589:web:148351dd3f769f5fa8bd7c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
