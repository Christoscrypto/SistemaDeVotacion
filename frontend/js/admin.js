// ---------- Estado y helpers de sesión ----------

function getToken() {
  return localStorage.getItem("admin_token");
}
function setToken(token) {
  localStorage.setItem("admin_token", token);
}
function clearToken() {
  localStorage.removeItem("admin_token");
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    showLogin();
    throw new Error("Sesión expirada.");
  }

  return res;
}

// ---------- Vistas ----------

const loginView = document.getElementById("login-view");
const panelView = document.getElementById("panel-view");

function showLogin() {
  loginView.classList.remove("hidden");
  panelView.classList.add("hidden");
}

function showPanel() {
  loginView.classList.add("hidden");
  panelView.classList.remove("hidden");
  switchTab("dashboard");
}

// ---------- Login ----------

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errorBox = document.getElementById("login-error");
  errorBox.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      errorBox.textContent = data.detail || "Usuario o contraseña incorrectos.";
      errorBox.classList.remove("hidden");
      return;
    }

    setToken(data.access_token);
    showPanel();
  } catch (err) {
    errorBox.textContent = "No se pudo conectar con el servidor.";
    errorBox.classList.remove("hidden");
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearToken();
  showLogin();
});

// ---------- Navegación de pestañas ----------

const navButtons = document.querySelectorAll(".nav-btn");
const tabs = {
  dashboard: document.getElementById("tab-dashboard"),
  candidates: document.getElementById("tab-candidates"),
  voters: document.getElementById("tab-voters"),
  results: document.getElementById("tab-results"),
  settings: document.getElementById("tab-settings"),
};

function switchTab(tabName) {
  Object.entries(tabs).forEach(([name, el]) => {
    el.classList.toggle("hidden", name !== tabName);
  });
  navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tabName));

  if (tabName === "dashboard") loadDashboard();
  if (tabName === "candidates") loadCandidates();
  if (tabName === "voters") loadVoters();
  if (tabName === "results") loadAdminResults();
  if (tabName === "settings") loadSettings();
}

navButtons.forEach((btn) => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

// ---------- Dashboard ----------

async function loadDashboard() {
  try {
    const res = await apiFetch("/admin/dashboard");
    const data = await res.json();
    document.getElementById("stat-total").textContent = data.total_voters;
    document.getElementById("stat-voted").textContent = data.voted_count;
    document.getElementById("stat-pending").textContent = data.pending_count;
    document.getElementById("stat-participation").textContent = `${data.participation}%`;
    document.getElementById("stat-election-status").textContent = data.election_is_open
      ? "🟢 Votación abierta"
      : "🔴 Votación cerrada";
  } catch (err) { /* manejado por apiFetch */ }
}

// ---------- Candidatos ----------

const candidateFormBox = document.getElementById("candidate-form-box");
const candidateForm = document.getElementById("candidate-form");
const photoUrlInput = document.getElementById("candidate-photo");
const photoFileInput = document.getElementById("candidate-photo-file");
const photoPreview = document.getElementById("candidate-photo-preview");
const photoClearBtn = document.getElementById("candidate-photo-clear");
const photoStatus = document.getElementById("candidate-photo-status");

// Máximo lado (en px) al que se reduce cualquier foto subida, para que el
// documento en MongoDB no crezca demasiado con imágenes guardadas como
// data URI (base64) directamente en el campo photo_url.
const PHOTO_MAX_SIDE = 500;
const PHOTO_QUALITY = 0.82;

function updatePhotoPreview(url) {
  if (url) {
    photoPreview.src = url;
    photoPreview.classList.remove("hidden");
    photoClearBtn.classList.remove("hidden");
  } else {
    photoPreview.classList.add("hidden");
    photoPreview.src = "";
    photoClearBtn.classList.add("hidden");
  }
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > PHOTO_MAX_SIDE) {
          height = Math.round((height * PHOTO_MAX_SIDE) / width);
          width = PHOTO_MAX_SIDE;
        } else if (height > PHOTO_MAX_SIDE) {
          width = Math.round((width * PHOTO_MAX_SIDE) / height);
          height = PHOTO_MAX_SIDE;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

photoFileInput.addEventListener("change", async () => {
  const file = photoFileInput.files[0];
  if (!file) return;
  photoStatus.textContent = "Procesando imagen...";
  try {
    const dataUrl = await resizeImageFile(file);
    photoUrlInput.value = dataUrl;
    updatePhotoPreview(dataUrl);
    photoStatus.textContent = "Imagen cargada ✓";
  } catch (err) {
    photoStatus.textContent = "";
    alert(err.message || "No se pudo procesar la imagen.");
  } finally {
    photoFileInput.value = "";
  }
});

photoUrlInput.addEventListener("input", () => {
  photoStatus.textContent = "";
  updatePhotoPreview(photoUrlInput.value.trim());
});

photoClearBtn.addEventListener("click", () => {
  photoUrlInput.value = "";
  photoStatus.textContent = "";
  updatePhotoPreview("");
});

document.getElementById("new-candidate-btn").addEventListener("click", () => {
  candidateForm.reset();
  document.getElementById("candidate-id").value = "";
  document.getElementById("candidate-form-title").textContent = "Nuevo candidato";
  updatePhotoPreview("");
  photoStatus.textContent = "";
  candidateFormBox.classList.remove("hidden");
});

document.getElementById("cancel-candidate-btn").addEventListener("click", () => {
  candidateFormBox.classList.add("hidden");
});

candidateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("candidate-id").value;
  const payload = {
    name: document.getElementById("candidate-name").value.trim(),
    category: document.getElementById("candidate-category").value,
    group: document.getElementById("candidate-group").value.trim(),
    photo_url: document.getElementById("candidate-photo").value.trim(),
    description: document.getElementById("candidate-description").value.trim(),
    active: document.getElementById("candidate-active").checked,
  };

  const path = id ? `/admin/candidates/${id}` : "/admin/candidates";
  const method = id ? "PUT" : "POST";

  try {
    const res = await apiFetch(path, { method, body: JSON.stringify(payload) });
    if (!res.ok) {
      const data = await res.json();
      alert(data.detail || "No se pudo guardar el candidato.");
      return;
    }
    candidateFormBox.classList.add("hidden");
    loadCandidates();
  } catch (err) { /* manejado por apiFetch */ }
});

function editCandidate(c) {
  document.getElementById("candidate-id").value = c.id;
  document.getElementById("candidate-name").value = c.name;
  document.getElementById("candidate-category").value = c.category;
  document.getElementById("candidate-group").value = c.group;
  document.getElementById("candidate-photo").value = c.photo_url;
  document.getElementById("candidate-description").value = c.description;
  document.getElementById("candidate-active").checked = c.active;
  document.getElementById("candidate-form-title").textContent = "Editar candidato";
  photoStatus.textContent = "";
  updatePhotoPreview(c.photo_url || "");
  candidateFormBox.classList.remove("hidden");
  candidateFormBox.scrollIntoView({ behavior: "smooth" });
}

async function deleteCandidate(id) {
  if (!confirm("¿Eliminar o desactivar este candidato?")) return;
  try {
    const res = await apiFetch(`/admin/candidates/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.detail || "No se pudo eliminar el candidato.");
      return;
    }
    loadCandidates();
  } catch (err) { /* manejado por apiFetch */ }
}

async function loadCandidates() {
  const container = document.getElementById("candidates-list");
  container.innerHTML = `<p class="text-gray-500 text-sm">Cargando...</p>`;

  try {
    const res = await apiFetch("/admin/candidates");
    const candidates = await res.json();
    container.innerHTML = "";

    if (candidates.length === 0) {
      container.innerHTML = `<p class="text-gray-500 text-sm">Aún no hay candidatos registrados.</p>`;
      return;
    }

    candidates.forEach((c) => {
      const card = document.createElement("div");
      card.className = `bg-[var(--bg-card)] border ${c.active ? "border-white/10" : "border-red-900/50 opacity-60"} rounded-2xl p-5`;
      const thumb = c.photo_url
        ? `<img src="${c.photo_url}" class="w-12 h-12 rounded-lg object-cover border border-white/10 flex-shrink-0">`
        : `<div class="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-lg flex-shrink-0">${c.category === "king" ? "👑" : "👸"}</div>`;
      card.innerHTML = `
        <div class="flex justify-between items-start mb-2">
          <span class="text-xs px-2 py-1 rounded-full ${c.category === "king" ? "bg-blue-500/10 text-blue-300" : "bg-pink-500/10 text-pink-300"}">
            ${c.category === "king" ? "👑 Rey" : "👸 Reina"}
          </span>
          ${!c.active ? '<span class="text-xs text-red-400">Inactivo</span>' : ""}
        </div>
        <div class="flex items-center gap-3 mb-2">
          ${thumb}
          <div class="min-w-0">
            <p class="font-semibold truncate">${c.name}</p>
            <p class="text-xs text-gray-500 truncate">${c.group}</p>
          </div>
        </div>
        <p class="text-sm text-gray-400 mb-4">${c.description || ""}</p>
        <div class="flex gap-2">
          <button class="edit-btn text-xs px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5">✏️ Editar</button>
          <button class="delete-btn text-xs px-3 py-1.5 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40">🗑️ Eliminar</button>
        </div>
      `;
      card.querySelector(".edit-btn").addEventListener("click", () => editCandidate(c));
      card.querySelector(".delete-btn").addEventListener("click", () => deleteCandidate(c.id));
      container.appendChild(card);
    });
  } catch (err) { /* manejado por apiFetch */ }
}

// ---------- Votantes ----------

async function loadVoters() {
  const tbody = document.getElementById("voters-table-body");
  tbody.innerHTML = `<tr><td class="px-5 py-4 text-gray-500" colspan="2">Cargando...</td></tr>`;

  try {
    const res = await apiFetch("/admin/voters");
    const voters = await res.json();
    tbody.innerHTML = "";

    if (voters.length === 0) {
      tbody.innerHTML = `<tr><td class="px-5 py-4 text-gray-500" colspan="2">Aún no hay alumnos importados.</td></tr>`;
      return;
    }

    voters.forEach((v) => {
      const tr = document.createElement("tr");
      tr.className = "border-t border-white/5";
      tr.innerHTML = `
        <td class="px-5 py-3">${v.control_number}</td>
        <td class="px-5 py-3">${v.has_voted ? '<span class="text-green-400">Ya votó</span>' : '<span class="text-gray-500">Pendiente</span>'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) { /* manejado por apiFetch */ }
}

document.getElementById("import-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("import-file");
  const resultBox = document.getElementById("import-result");
  if (!fileInput.files.length) return;

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await apiFetch("/admin/import-voters", { method: "POST", body: formData });
    const data = await res.json();

    resultBox.classList.remove("hidden");
    if (!res.ok) {
      resultBox.innerHTML = `<p class="text-red-400">${data.detail || "No se pudo importar el archivo."}</p>`;
      return;
    }

    resultBox.innerHTML = `
      <p class="text-green-400 mb-1">✅ ${data.inserted} alumnos importados. ${data.skipped} omitidos.</p>
      ${data.errors.length ? `<p class="text-gray-500 text-xs mt-2">${data.errors.slice(0, 10).join("<br>")}</p>` : ""}
    `;
    fileInput.value = "";
    loadVoters();
    loadDashboard();
  } catch (err) { /* manejado por apiFetch */ }
});

// ---------- Resultados (vista admin, siempre visible) ----------

async function loadAdminResults() {
  const container = document.getElementById("admin-results-content");
  container.innerHTML = `<p class="text-gray-500 text-sm">Cargando...</p>`;

  try {
    const res = await apiFetch("/admin/candidates");
    const dashRes = await apiFetch("/admin/dashboard");
    const dash = await dashRes.json();
    const publicRes = await fetch(`${API_BASE_URL}/results`);
    const publicData = await publicRes.json();

    // Si el admin no ha activado resultados públicos, calculamos igualmente
    // usando /api/results pero forzando la visibilidad solo para esta vista
    // (el admin siempre debe poder ver el avance interno).
    let kingResults = publicData.king_results;
    let queenResults = publicData.queen_results;

    if (!publicData.public_visible) {
      // Pedimos los resultados "reales" reutilizando el endpoint de resultados
      // tras activar temporalmente la bandera solo en memoria del cliente no es
      // posible sin backend; en su lugar mostramos el aviso y las cifras del dashboard.
      container.innerHTML = `
        <div class="bg-[var(--bg-card)] border border-white/10 rounded-2xl p-8 text-center">
          <p class="text-gray-400 mb-2">Los resultados detallados están ocultos al público.</p>
          <p class="text-sm text-gray-500">Total de votos: ${dash.total_votes} · Participación: ${dash.participation}%</p>
          <p class="text-xs text-gray-600 mt-4">Activa "Mostrar resultados al público" en Configuración para ver el desglose por candidato aquí y en /results.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <section>
        <h3 class="font-semibold mb-4">👑 Rey</h3>
        <div id="admin-king-results" class="space-y-3"></div>
      </section>
      <section>
        <h3 class="font-semibold mb-4">👸 Reina</h3>
        <div id="admin-queen-results" class="space-y-3"></div>
      </section>
    `;

    const kingContainer = document.getElementById("admin-king-results");
    const queenContainer = document.getElementById("admin-queen-results");

    kingResults.forEach((item) => kingContainer.appendChild(buildAdminResultRow(item)));
    queenResults.forEach((item) => queenContainer.appendChild(buildAdminResultRow(item)));
  } catch (err) { /* manejado por apiFetch */ }
}

function buildAdminResultRow(item) {
  const row = document.createElement("div");
  row.className = "bg-[var(--bg-card)] border border-white/10 rounded-xl p-4";
  row.innerHTML = `
    <div class="flex justify-between items-center mb-2 text-sm">
      <span>${item.name} <span class="text-gray-500">(${item.group})</span></span>
      <span class="gold-text font-semibold">${item.votes} votos · ${item.percentage}%</span>
    </div>
    <div class="progress-bar-bg h-2 rounded-full overflow-hidden">
      <div class="progress-bar-fill h-full rounded-full" style="width: ${item.percentage}%"></div>
    </div>
  `;
  return row;
}

// ---------- Configuración ----------

let currentSettings = null;

async function loadSettings() {
  try {
    const res = await apiFetch("/admin/election-settings");
    currentSettings = await res.json();
    renderSettings();
  } catch (err) { /* manejado por apiFetch */ }
}

function renderSettings() {
  if (!currentSettings) return;
  document.getElementById("settings-open-status").textContent = currentSettings.is_open
    ? "🟢 Actualmente abierta"
    : "🔴 Actualmente cerrada";
  document.getElementById("settings-results-status").textContent = currentSettings.show_public_results
    ? "🟢 Visibles al público"
    : "🔴 Ocultos al público";
  document.getElementById("settings-name").value = currentSettings.election_name || "";
  document.getElementById("settings-year").value = currentSettings.year || "";
}

document.getElementById("toggle-open-btn").addEventListener("click", async () => {
  await updateSettings({ is_open: !currentSettings.is_open });
});

document.getElementById("toggle-results-btn").addEventListener("click", async () => {
  await updateSettings({ show_public_results: !currentSettings.show_public_results });
});

document.getElementById("save-settings-btn").addEventListener("click", async () => {
  await updateSettings({
    election_name: document.getElementById("settings-name").value.trim(),
    year: parseInt(document.getElementById("settings-year").value, 10),
  });
  const msg = document.getElementById("settings-saved-msg");
  msg.classList.remove("hidden");
  setTimeout(() => msg.classList.add("hidden"), 2000);
});

async function updateSettings(payload) {
  try {
    const res = await apiFetch("/admin/election-settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    currentSettings = await res.json();
    renderSettings();
  } catch (err) { /* manejado por apiFetch */ }
}

// ---------- Inicio ----------

if (getToken()) {
  showPanel();
} else {
  showLogin();
}
