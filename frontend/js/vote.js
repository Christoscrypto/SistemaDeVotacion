// Seguridad al elegir: si esta página se cargó porque el usuario usó el
// botón "atrás" o "adelante" del navegador (en vez de llegar aquí normal,
// desde verify.html, o simplemente recargar), invalidamos el token de
// verificación guardado. Así, si sales mientras estás eligiendo y luego
// intentas volver a esta sesión de voto, tienes que verificarte de nuevo.
// Un simple refresh (F5) de esta misma pantalla NO cuenta como salir, así
// que no te pide verificarte otra vez en ese caso.
const navEntry = performance.getEntriesByType("navigation")[0];
if (navEntry && navEntry.type === "back_forward") {
  sessionStorage.removeItem("voter_token");
}

const voterToken = sessionStorage.getItem("voter_token");

const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const errorMessage = document.getElementById("error-message");

const stepKing = document.getElementById("step-king");
const stepQueen = document.getElementById("step-queen");
const stepConfirm = document.getElementById("step-confirm");
const voteStepperEl = document.getElementById("vote-stepper");

const kingGrid = document.getElementById("king-grid");
const queenGrid = document.getElementById("queen-grid");
const kingContinueBtn = document.getElementById("king-continue");
const queenContinueBtn = document.getElementById("queen-continue");
const kingCaption = document.getElementById("king-selection-caption");
const queenCaption = document.getElementById("queen-selection-caption");

let selectedKing = null;
let selectedQueen = null;

function showFatalError(message) {
  loadingState.classList.add("hidden");
  errorState.classList.remove("hidden");
  errorMessage.textContent = message;
}

function retriggerPanelAnimation(el) {
  el.classList.remove("step-panel");
  void el.offsetWidth;
  el.classList.add("step-panel");
}

function setActiveStep(step) {
  [stepKing, stepQueen, stepConfirm].forEach((el) => el.classList.add("hidden"));

  const target = step === "king" ? stepKing : step === "queen" ? stepQueen : stepConfirm;
  target.classList.remove("hidden");
  retriggerPanelAnimation(target);

  renderStepper(voteStepperEl, step);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderCandidateCard(candidate, category) {
  const card = document.createElement("button");
  card.type = "button";
  card.dataset.id = candidate.id;
  card.className = "candidate-card text-left bg-[var(--bg-card)] border border-white/10 rounded-2xl card-glow";

  const photo = candidate.photo_url
    ? `<img src="${candidate.photo_url}" alt="${candidate.name}" class="w-full h-48 object-cover">`
    : `<div class="w-full h-48 flex items-center justify-center bg-black/30 text-5xl">${category === "king" ? "👑" : "👸"}</div>`;

  card.innerHTML = `
    <span class="candidate-sparkle spark-1" aria-hidden="true">✨</span>
    <span class="candidate-sparkle spark-2" aria-hidden="true">✨</span>
    <div class="candidate-card-inner">
      ${photo}
      <div class="p-5">
        <p class="font-semibold text-lg">${candidate.name}</p>
        <p class="text-sm text-gray-500 mb-2">${candidate.group}</p>
        <p class="text-sm text-gray-400">${candidate.description || ""}</p>
        <div class="mt-4 w-full text-center py-2.5 rounded-xl border border-white/15 text-sm select-label">
          Votar por ${category === "king" ? "él" : "ella"}
        </div>
      </div>
    </div>
  `;

  card.addEventListener("click", () => {
    const grid = category === "king" ? kingGrid : queenGrid;
    const caption = category === "king" ? kingCaption : queenCaption;

    grid.querySelectorAll(".candidate-card").forEach((c) => c.classList.remove("candidate-selected"));
    // Forzar reflow para que la animación de corona se reproduzca de nuevo
    // incluso si se elige la misma tarjeta después de cambiar de candidato.
    void card.offsetWidth;
    card.classList.add("candidate-selected");
    grid.classList.add("has-selection");

    caption.textContent = `Has seleccionado a ${candidate.name}`;
    caption.style.opacity = "1";

    if (category === "king") {
      selectedKing = candidate;
      kingContinueBtn.disabled = false;
    } else {
      selectedQueen = candidate;
      queenContinueBtn.disabled = false;
    }
  });

  return card;
}

async function loadCandidates() {
  if (!voterToken) {
    showFatalError("Primero necesitas verificar tu identidad para votar.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/candidates`);
    if (!res.ok) throw new Error("No se pudieron cargar los candidatos.");
    const candidates = await res.json();

    const kings = candidates.filter((c) => c.category === "king");
    const queens = candidates.filter((c) => c.category === "queen");

    if (kings.length === 0 || queens.length === 0) {
      showFatalError("Aún no hay candidatos registrados para esta elección.");
      return;
    }

    kings.forEach((c) => kingGrid.appendChild(renderCandidateCard(c, "king")));
    queens.forEach((c) => queenGrid.appendChild(renderCandidateCard(c, "queen")));

    loadingState.classList.add("hidden");
    setActiveStep("king");
  } catch (err) {
    showFatalError("No se pudo conectar con el servidor. Intenta de nuevo más tarde.");
  }
}

function fillBallotPhoto(wrapId, candidate, fallbackEmoji) {
  const wrap = document.getElementById(wrapId);
  if (candidate.photo_url) {
    wrap.outerHTML = `<img id="${wrapId}" src="${candidate.photo_url}" alt="${candidate.name}" class="ballot-photo">`;
  } else {
    wrap.className = "ballot-photo-fallback";
    wrap.textContent = fallbackEmoji;
  }
}

document.getElementById("queen-back").addEventListener("click", () => {
  setActiveStep("king");
});

kingContinueBtn.addEventListener("click", () => {
  if (!selectedKing) return;
  setActiveStep("queen");
});

queenContinueBtn.addEventListener("click", () => {
  if (!selectedQueen) return;
  document.getElementById("confirm-king-name").textContent = selectedKing.name;
  document.getElementById("confirm-king-group").textContent = selectedKing.group;
  document.getElementById("confirm-queen-name").textContent = selectedQueen.name;
  document.getElementById("confirm-queen-group").textContent = selectedQueen.group;
  fillBallotPhoto("confirm-king-photo-wrap", selectedKing, "👑");
  fillBallotPhoto("confirm-queen-photo-wrap", selectedQueen, "👸");
  setActiveStep("confirm");
});

document.getElementById("btn-back").addEventListener("click", () => {
  setActiveStep("queen");
});

document.getElementById("btn-confirm").addEventListener("click", async () => {
  const confirmBtn = document.getElementById("btn-confirm");
  const backBtn = document.getElementById("btn-back");
  const confirmError = document.getElementById("confirm-error");
  const overlay = document.getElementById("registering-overlay");
  confirmError.classList.add("hidden");

  confirmBtn.disabled = true;
  backBtn.disabled = true;
  overlay.classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE_URL}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voter_token: voterToken,
        king_candidate_id: selectedKing.id,
        queen_candidate_id: selectedQueen.id,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      overlay.classList.add("hidden");
      confirmError.textContent = data.message || "No se pudo registrar tu voto.";
      confirmError.classList.remove("hidden");
      confirmBtn.disabled = false;
      backBtn.disabled = false;
      return;
    }

    // El voto se registró: eliminamos el token para que no pueda reutilizarse
    // desde este navegador y no se pueda regresar a pasos anteriores.
    sessionStorage.removeItem("voter_token");

    // Pequeña pausa para que la animación de "Registrando voto..." se sienta
    // intencional en vez de un salto instantáneo.
    window.setTimeout(() => {
      window.location.replace("/success.html");
    }, 700);
  } catch (err) {
    overlay.classList.add("hidden");
    confirmError.textContent = "No se pudo conectar con el servidor. Intenta de nuevo.";
    confirmError.classList.remove("hidden");
    confirmBtn.disabled = false;
    backBtn.disabled = false;
  }
});

loadCandidates();
