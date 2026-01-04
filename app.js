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

    // Determine card color based on flavor profile
    let cardColor = "var(--card-bg)";
    const profile = e.flavorProfile || "";
    if (profile === "fruity") cardColor = "#fff0f0"; // Pinkish
    else if (profile === "acidic") cardColor = "#f9fbe7"; // Yellowish
    else if (profile === "nutty") cardColor = "#fff8e1"; // Amber
    else if (profile === "roasty") cardColor = "#eceff1"; // Greyish
    else if (profile === "herbal") cardColor = "#e8f5e9"; // Greenish

    // Calculate Sweet Spot Score based on Outcome
    let score = 50; // Default

    // Dynamic Color Calculation (Dark to Light Brown)
    const lightness = 25 + (score * 0.6);
    const sliderColor = `hsl(25, 60%, ${lightness}%)`;

    // Check ownership
    const isOwner = (auth.currentUser && e.userId === auth.currentUser.uid) || isAdmin;
      const buttons = isOwner ? `
      <div style="margin-top: 10px; display: flex; gap: 5px;">
        <button class="edit-btn" data-id="${e.id}" style="background: #f0ad4e; font-size: 0.9em; padding: 8px;">Edit</button>
        <button class="delete-btn" data-id="${e.id}" style="background: #d9534f; font-size: 0.9em; padding: 8px;">Delete</button>
      </div>
    ` : "";

    const yieldDisplay = (e.brew.yield !== undefined && e.brew.yield !== null) ? e.brew.yield : '-';

    experimentsDiv.innerHTML += `
      <div class="card" style="background-color: ${cardColor};">
        <strong>${e.brew.method}</strong><br>
        Bean: ${beanName}<br>
        Machine: ${machineName}<br>
        Grind Setting: <span id="disp-g-${e.id}">${e.brew.grindSize}</span> | Dose: ${e.brew.dose}g | Yield: <span id="disp-y-${e.id}">${yieldDisplay}</span>g<br>
        Temp: ${e.brew.waterTemp}°C | Time: <span id="disp-t-${e.id}">${e.brew.brewTime}</span>s<br>
        Behavior: <span id="disp-b-${e.id}">${e.behavior}</span><br>
        Flavor Profile: ${e.flavorProfile || "N/A"}<br>
        Sensory Notes: ${e.sensory}<br>
        Outcome: ${e.notes || ""}
        <div style="margin-top: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #555; margin-bottom: 2px;">
                <strong>Sweet Spot Simulator</strong> <span>(Grind:<span id="g-${e.id}">${e.brew.grindSize}</span> Y:<span id="y-${e.id}">${yieldDisplay}</span> T:<span id="t-${e.id}">${e.brew.brewTime}</span>s)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
                <button class="adjust-btn minus" style="width: 30px; padding: 5px; background: #ddd; color: #333; font-weight: bold;">-</button>
                <input type="range" class="sweet-spot-slider" min="0" max="100" value="${score}" 
                    data-id="${e.id}" 
                    data-g="${e.brew.grindSize}" 
                    data-y="${e.brew.yield || 0}" 
                    data-t="${e.brew.brewTime}" 
                    data-note="${e.notes}"
                    style="flex-grow: 1; cursor: pointer; accent-color: ${sliderColor};"
                >
                <button class="adjust-btn plus" style="width: 30px; padding: 5px; background: #ddd; color: #333; font-weight: bold;">+</button>
            </div>
            <div style="display: flex; gap: 5px; margin-top: 8px;">
                <div style="flex: 1;">
                    <div style="font-size: 0.7em; color: #666; margin-bottom: 2px;">Behavior</div>
                    <div class="progress-bg" style="height: 4px;"><div id="bar-b-${e.id}" class="progress-fill" style="width: ${100 - score}%; background-color: ${sliderColor};"></div></div>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 0.7em; color: #666; margin-bottom: 2px;">Sensory</div>
                    <div class="progress-bg" style="height: 4px;"><div id="bar-s-${e.id}" class="progress-fill" style="width: ${75 - (score * 0.5)}%; background-color: ${sliderColor};"></div></div>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 0.7em; color: #666; margin-bottom: 2px;">Sour-to-Bitter</div>
                    <div class="progress-bg" style="height: 4px;"><div id="bar-n-${e.id}" class="progress-fill" style="width: ${score}%; background-color: ${sliderColor};"></div></div>
                </div>
            </div>
        </div>
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
    document.getElementById("yield").value = data.brew.yield || "";
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

// Handle Sweet Spot Simulation (Drag to adjust)
experimentsDiv.addEventListener("input", (e) => {
  if (e.target.classList.contains("sweet-spot-slider")) {
    const slider = e.target;
    const id = slider.dataset.id;
    const val = parseInt(slider.value);
    
    // Original values
    const origG = parseFloat(slider.dataset.g) || 0;
    const origY = parseFloat(slider.dataset.y) || 0;
    const origT = parseFloat(slider.dataset.t) || 0;
    const note = slider.dataset.note || "";

    // Calculate Baseline Score
    let baseScore = 50;

    const diff = val - baseScore;

    // Simulation Logic
    let newG = origG;
    let newT = origT;
    let newY = origY; // Yield typically stays constant, but we can adjust if needed

    if (note === "Grind Coarser") {
        // Needs Coarser: Dragging right (improving) -> Coarser (+G), Less Time (-T)
        newG = origG + (diff * 0.05);
        newT = origT - (diff * 0.2);
        newY = origY - (diff * 0.05);
    } else if (note === "Adjust Dose") {
        // Simulate dose adjustment effect on flow (Time/Yield)
        newT = origT + (diff * 0.1);
        newY = origY + (diff * 0.1);
    } else {
        // Default / "Grind Finer" / "Dialed In"
        // Needs Finer: Dragging right (improving) -> Finer (-G), More Time (+T)
        // We also adjust Yield slightly to show responsiveness
        newG = origG - (diff * 0.05); 
        newT = origT + (diff * 0.2);
        newY = origY + (diff * 0.05);
    }

    // Prevent negative values
    newT = Math.max(0, newT);
    newY = Math.max(0, newY);

    // Update DOM
    document.getElementById(`g-${id}`).innerText = newG.toFixed(1);
    document.getElementById(`t-${id}`).innerText = newT.toFixed(0);
    document.getElementById(`y-${id}`).innerText = newY.toFixed(1);

    // Update Main Display Data
    document.getElementById(`disp-g-${id}`).innerText = newG.toFixed(1);
    document.getElementById(`disp-t-${id}`).innerText = newT.toFixed(0);
    document.getElementById(`disp-y-${id}`).innerText = newY.toFixed(1);

    // Update Behavior Display Data
    let newBehavior;

    if (newT <= 0) {
        newBehavior = "Not Dripping";
    } else if (newG <= -9.5) {
        newBehavior = "Not Dripping";
    } else if (newG <= -8.25) {
        newBehavior = "Restricted";
    } else {
        const grindThreshold = -4; // Adjust this based on what you consider a "fine" or "coarse" grind

        if (newG < grindThreshold) {  // Finer grind
            if (newT > 50) {
                newBehavior = "Not Dripping";
            } else if (newT > 35) {
                newBehavior = "Restricted";
            } else if (newT > 20) {
                newBehavior = "Steady Flow (Ideal)";
            } else {
                newBehavior = "Medium Fast";
            }

        } else {  // Coarser grind
            if (newT < 20) {
                newBehavior = "Very fast";
            } else if (newT < 30) {
                newBehavior = "Medium Fast"; // Okay, but could be better
            } else if (newT < 40) {
                  newBehavior = "Steady Flow (Ideal)"; //best state
            }

            else {
                newBehavior = "Restricted"; //very slow
             }

        }
    }
    document.getElementById(`disp-b-${id}`).innerText = newBehavior;
    
    // Dynamic Color
      const lightness = 25 + (val * 0.6);
    const newColor = `hsl(25, 60%, ${lightness}%)`;
    slider.style.accentColor = newColor;

    // Update Sub-bars
    const barB = document.getElementById(`bar-b-${id}`);
    const barS = document.getElementById(`bar-s-${id}`);
    const barN = document.getElementById(`bar-n-${id}`);
    if (barB) { barB.style.width = `${100 - val}%`; barB.style.backgroundColor = newColor; }
    if (barS) { barS.style.width = `${75 - (val * 0.5)}%`; barS.style.backgroundColor = newColor; }
    if (barN) { barN.style.width = `${val}%`; barN.style.backgroundColor = newColor; }
  }
});

// Handle Long Press for Adjust Buttons
let pressTimer;
let pressInterval;

const handleAdjust = (btn) => {
  const slider = btn.parentElement.querySelector(".sweet-spot-slider");
  if (slider) {
    let val = parseInt(slider.value);
    if (btn.classList.contains("minus")) {
      val = Math.max(0, val - 1);
    } else {
      val = Math.min(100, val + 1);
    }
    slider.value = val;
    slider.dispatchEvent(new Event("input", { bubbles: true }));
  }
};

const startPress = (e) => {
  if (e.target.classList.contains("adjust-btn")) {
    if (e.cancelable) e.preventDefault();
    handleAdjust(e.target);
    pressTimer = setTimeout(() => {
      pressInterval = setInterval(() => handleAdjust(e.target), 100);
    }, 500);
  }
};

const endPress = () => {
  clearTimeout(pressTimer);
  clearInterval(pressInterval);
};

experimentsDiv.addEventListener("mousedown", startPress);
experimentsDiv.addEventListener("touchstart", startPress, { passive: false });
document.addEventListener("mouseup", endPress);
document.addEventListener("touchend", endPress);

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
    flavorProfile: document.getElementById("flavorProfile").value,
    brew: {
      method: document.getElementById("method").value,
      grindSize: document.getElementById("grindSize").value,
      dose: Number(document.getElementById("dose").value),
      yield: Number(document.getElementById("yield").value),
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
  document.getElementById("yield").value = "";
  document.getElementById("temp").value = "";
  document.getElementById("time").value = "";
  document.getElementById("behavior").value = "";
  document.getElementById("sensory").value = "";
  document.getElementById("notes").value = "";
  document.getElementById("flavorProfile").value = "";
};
