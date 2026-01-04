import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { db, auth } from "./firebase.js";

const beanSelect = document.getElementById("beanSelect");
const machineSelect = document.getElementById("machineSelect");
const experimentsDiv = document.getElementById("experiments");
const authContainer = document.getElementById("auth-container");
const pendingContainer = document.getElementById("pending-container");
const appContent = document.getElementById("app-content");

// --- AUTHENTICATION LOGIC ---
let isLoginMode = true;

// Toggle Login/Signup
document.getElementById("auth-toggle-link").onclick = (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  document.getElementById("auth-title").innerText = isLoginMode ? "Login" : "Sign Up";
  document.getElementById("auth-action-btn").innerText = isLoginMode ? "Login" : "Sign Up";
  e.target.innerText = isLoginMode ? "Need an account? Sign Up" : "Have an account? Login";
};

// Handle Login/Signup Action
document.getElementById("auth-action-btn").onclick = async () => {
  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;

  try {
    if (isLoginMode) {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    alert(error.message);
  }
};

// Logout
document.getElementById("logoutBtn").onclick = () => signOut(auth);
document.getElementById("pendingLogoutBtn").onclick = () => signOut(auth);

// Auth State Listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Check if user is approved
    let userDoc = await getDoc(doc(db, "users", user.uid));
    

    // Fix: If Auth user exists but Firestore doc is missing, create it now
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        approved: false,
        admin: false,
        createdAt: serverTimestamp()
      });
      userDoc = await getDoc(doc(db, "users", user.uid));
    }

    isAdmin = userDoc.data().admin === true;

    if (userDoc.exists() && userDoc.data().approved) {
      authContainer.style.display = "none";
      pendingContainer.style.display = "none";
      appContent.style.display = "block";
      subscribeData(); // Load data only if approved
    } else {
      authContainer.style.display = "none";
      appContent.style.display = "none";
      pendingContainer.style.display = "block";
    }
  } else {
    authContainer.style.display = "block";
    pendingContainer.style.display = "none";
    appContent.style.display = "none";
    unsubscribeData();
  }
});

// --- APP LOGIC ---

// TOGGLE SECTIONS
const sections = [
  { btnId: "toggleBeanBtn", sectionId: "addBeanSection" },
  { btnId: "toggleMachineBtn", sectionId: "addMachineSection" },
  { btnId: "toggleExperimentBtn", sectionId: "logExperimentSection" },
  { btnId: "toggleExperimentsBtn", sectionId: "experiments" }
];

sections.forEach(({ btnId, sectionId }) => {
  document.getElementById(btnId).onclick = () => {
    const section = document.getElementById(sectionId);
    const isHidden = section.style.display === "none";

    // Close all sections
    sections.forEach(s => document.getElementById(s.sectionId).style.display = "none");

    // Open clicked section if it was hidden
    if (isHidden) {
      section.style.display = "block";
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
});

// ADD BEAN
document.getElementById("addBeanBtn").onclick = async () => {
  await addDoc(collection(db, "beans"), {
    name: document.getElementById("beanName").value,
    origin: document.getElementById("origin").value,
    variety: document.getElementById("variety").value,
    process: document.getElementById("process").value,
    roastLevel: document.getElementById("roastLevel").value,
    roastDate: document.getElementById("roastDate").value,
    createdAt: serverTimestamp()
  });

  document.getElementById("beanName").value = "";
  document.getElementById("origin").value = "";
  document.getElementById("variety").value = "";
  document.getElementById("process").value = "";
  document.getElementById("roastLevel").value = "";
  document.getElementById("roastDate").value = "";
};

// ADD MACHINE
document.getElementById("addMachineBtn").onclick = async () => {
  await addDoc(collection(db, "machines"), {
    name: document.getElementById("machineName").value,
    createdAt: serverTimestamp()
  });

  document.getElementById("machineName").value = "";
};

let unsubBeans, unsubMachines, unsubExperiments;
let beans = [];
let machines = [];
let experiments = [];

function renderExperiments() {
  experimentsDiv.innerHTML = "";

  experiments.forEach(e => {

      const bean = beans.find(b => b.id === e.beanId);
    const beanName = bean ? `${bean.name} (${bean.roastLevel})` : "Unknown Bean";
    
    const machine = machines.find(m => m.id === e.machineId);
    const machineName = machine ? machine.name : "Unknown Machine";

    // Check ownership
    const isOwner = (auth.currentUser && e.userId === auth.currentUser.uid) || isAdmin;
      const buttons = isOwner ? `
      <div style="margin-top: 10px; display: flex; gap: 5px;">
        <button class="edit-btn" data-id="${e.id}" style="background: #f0ad4e; font-size: 0.9em; padding: 8px;">Edit</button>
        <button class="delete-btn" data-id="${e.id}" style="background: #d9534f; font-size: 0.9em; padding: 8px;">Delete</button>
      </div>
    ` : "";

    experimentsDiv.innerHTML += `
      <div class="card">
        <strong>${e.brew.method}</strong><br>
        Bean: ${beanName}<br>
        Machine: ${machineName}<br>
        Grind: ${e.brew.grindSize} | Dose: ${e.brew.dose}g<br>
        Temp: ${e.brew.waterTemp}°C | Time: ${e.brew.brewTime}s<br>
        Behavior: ${e.behavior}<br>
        Sensory: ${e.sensory}<br>
        Notes: ${e.notes || ""}
        ${buttons}
      </div>
    `;
  });
}

function subscribeData() {
  // LOAD BEANS
  unsubBeans = onSnapshot(collection(db, "beans"), (snapshot) => {
    beans = [];
    beanSelect.innerHTML = '<option value="">Select Bean</option>';

    snapshot.forEach(doc => {
      const bean = doc.data();
      beans.push({ id: doc.id, ...bean });
      beanSelect.innerHTML += `
        <option value="${doc.id}">
          ${bean.name} (${bean.roastLevel})
        </option>
      `;
    });
    renderExperiments();
  });

  // LOAD MACHINES
  unsubMachines = onSnapshot(collection(db, "machines"), (snapshot) => {
    machines = [];
    machineSelect.innerHTML = '<option value="">Select Machine</option>';

    snapshot.forEach(doc => {
      const machine = doc.data();
      machines.push({ id: doc.id, ...machine });
      machineSelect.innerHTML += `<option value="${doc.id}">${machine.name}</option>`;
    });
    renderExperiments();
  });

  // LOAD EXPERIMENTS
  unsubExperiments = onSnapshot(collection(db, "experiments"), (snapshot) => {
    experiments = [];
    snapshot.forEach(doc => {
      experiments.push({ id: doc.id, ...doc.data() });
    });
    renderExperiments();
  });
}

// Handle Edit and Delete clicks via Delegation
experimentsDiv.addEventListener("click", async (e) => {
  // DELETE
  if (e.target.classList.contains("delete-btn")) {
    if (confirm("Are you sure you want to delete this experiment?")) {
      await deleteDoc(doc(db, "experiments", e.target.dataset.id));
    }
  }

  // EDIT
  if (e.target.classList.contains("edit-btn")) {
    const id = e.target.dataset.id;
    const docSnap = await getDoc(doc(db, "experiments", id));
    const data = docSnap.data();

    // Fill form
    beanSelect.value = data.beanId;
    if (data.machineId) machineSelect.value = data.machineId;
    document.getElementById("method").value = data.brew.method;
    document.getElementById("grindSize").value = data.brew.grindSize;
    document.getElementById("dose").value = data.brew.dose;
    document.getElementById("temp").value = data.brew.waterTemp;
    document.getElementById("time").value = data.brew.brewTime;
    document.getElementById("behavior").value = data.behavior;
    document.getElementById("sensory").value = data.sensory;
    document.getElementById("notes").value = data.notes || "";

    // Set Edit Mode
    editingId = id;
    document.getElementById("saveExperimentBtn").innerText = "Update Experiment";
    
    // Show form
    document.getElementById("logExperimentSection").style.display = "block";
    document.getElementById("logExperimentSection").scrollIntoView({ behavior: "smooth" });
  }
});

function unsubscribeData() {
  if (unsubBeans) unsubBeans();
  if (unsubMachines) unsubMachines();
  if (unsubExperiments) unsubExperiments();
}

let isAdmin = false;

// SAVE EXPERIMENT
let editingId = null;

document.getElementById("saveExperimentBtn").onclick = async () => {
  if (!beanSelect.value) {
    alert("Select a bean first");
    return;
  }

  const experimentData = {
    beanId: beanSelect.value,
    machineId: machineSelect.value,
    brew: {
      method: document.getElementById("method").value,
      grindSize: document.getElementById("grindSize").value,
      dose: Number(document.getElementById("dose").value),
      waterTemp: Number(document.getElementById("temp").value),
      brewTime: Number(document.getElementById("time").value)
    },
    behavior: document.getElementById("behavior").value,
    sensory: document.getElementById("sensory").value,
    notes: document.getElementById("notes").value,
    userId: auth.currentUser.uid // Save User ID for ownership check
  };

  if (editingId) {
    // UPDATE EXISTING
    await updateDoc(doc(db, "experiments", editingId), experimentData);
    editingId = null;
    document.getElementById("saveExperimentBtn").innerText = "Save Experiment";
  } else {
    // CREATE NEW
    experimentData.createdAt = serverTimestamp();
    await addDoc(collection(db, "experiments"), experimentData);
  }

  document.getElementById("method").value = "";
  document.getElementById("grindSize").value = "";
  document.getElementById("dose").value = "";
  document.getElementById("temp").value = "";
  document.getElementById("time").value = "";
  document.getElementById("behavior").value = "";
  document.getElementById("sensory").value = "";
  document.getElementById("notes").value = "";
};
