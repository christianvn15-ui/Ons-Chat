// === Firebase Imports ===
import { initializeApp } from "firebase/app";
import { 
  getAuth, RecaptchaVerifier, signInWithPhoneNumber,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp,
  doc, setDoc, getDoc 
} from "firebase/firestore";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "firebase/storage";

// === Firebase Config ===
const firebaseConfig = {
  apiKey: "AIzaSyBbbmy0UURIGmRX0PMeWVlffxFZ_f81bto",
  authDomain: "ons-chat.firebaseapp.com",
  projectId: "ons-chat",
  storageBucket: "ons-chat.firebasestorage.app",
  messagingSenderId: "725598039868",
  appId: "1:725598039868:web:d0e6b9856c98717d203839",
  measurementId: "G-WT2GDQRLBP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// === Phone Auth Setup ===
window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
  'size': 'invisible',
  'callback': (response) => {
    console.log("reCAPTCHA solved");
  }
}, auth);

export async function sendVerificationCode(phoneNumber) {
  try {
    const appVerifier = window.recaptchaVerifier;
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
    console.log("SMS sent");
  } catch (err) {
    console.error("SMS not sent:", err);
  }
}

export async function confirmCode(code) {
  try {
    const result = await window.confirmationResult.confirm(code);
    console.log("User signed in:", result.user.uid);
  } catch (err) {
    console.error("Invalid code:", err);
  }
}

// === Email/Password Auth (optional) ===
export async function signupEmail(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
}
export async function loginEmail(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}
export async function logout() {
  await signOut(auth);
}

// === User Profile (username + photoURL) ===
export async function saveUserProfile(uid, username, photoFile) {
  let photoURL = null;
  if (photoFile) {
    const storageRef = ref(storage, `profilePics/${uid}`);
    await uploadBytes(storageRef, photoFile);
    photoURL = await getDownloadURL(storageRef);
  }
  await setDoc(doc(db, "users", uid), {
    username: username,
    photoURL: photoURL
  });
  // Also update Firebase Auth profile
  await updateProfile(auth.currentUser, {
    displayName: username,
    photoURL: photoURL
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// === Chat Functions ===
async function sendMessage(text, myUserId, chatPartnerId) {
  if (!text.trim()) return;
  await addDoc(collection(db, "messages"), {
    senderId: myUserId,
    receiverId: chatPartnerId,
    text: text,
    timestamp: serverTimestamp()
  });
}

function startChat(myUserId, chatPartnerId) {
  const q = query(
    collection(db, "messages"),
    where("senderId", "in", [myUserId, chatPartnerId]),
    where("receiverId", "in", [myUserId, chatPartnerId]),
    orderBy("timestamp")
  );

  onSnapshot(q, snapshot => {
    let output = document.getElementById("output");
    output.innerHTML = "";
    snapshot.forEach(docSnap => {
      let msg = docSnap.data();
      let timeString = msg.timestamp
        ? msg.timestamp.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
        : "";

      getUserProfile(msg.senderId).then(profile => {
        let div = document.createElement("div");
        div.className = "message " + (msg.senderId === myUserId ? "sent" : "received");
        div.innerHTML = `
          <img src="${profile?.photoURL || 'default.png'}" class="avatar">
          <div class="bubble">
            <strong>${profile?.username || 'Unknown'}</strong>
            <p>${msg.text}</p>
            <small>${timeString}</small>
          </div>
        `;
        output.appendChild(div);
      });
    });
    output.scrollTop = output.scrollHeight;
  });

  // Send button
  document.getElementById("sendButton").onclick = () => {
    let input = document.getElementById("messageInput");
    sendMessage(input.value, myUserId, chatPartnerId);
    input.value = "";
  };

  // Enter key
  document.getElementById("messageInput").addEventListener("keydown", e => {
    if (e.key === "Enter") {
      let input = document.getElementById("messageInput");
      sendMessage(input.value, myUserId, chatPartnerId);
      input.value = "";
    }
  });
}

// === Auth State Listener ===
onAuthStateChanged(auth, user => {
  if (user) {
    console.log("User logged in:", user.uid);
    document.getElementById("chat-container").style.display = "flex";
    document.getElementById("auth-container").style.display = "none";
    // For demo, hardcode chat partner; later you can select dynamically
    startChat(user.uid, "user456");
  } else {
    console.log("No user logged in");
    document.getElementById("chat-container").style.display = "none";
    document.getElementById("auth-container").style.display = "block";
  }
});