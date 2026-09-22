function rrPrefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Anima un número entero desde 0 hasta targetValue durante `durationMs`.
function animateCount(el, targetValue, durationMs, suffix) {
  if (rrPrefersReducedMotion() || !targetValue) {
    el.textContent = `${targetValue}${suffix || ""}`;
    return;
  }
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / durationMs, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(targetValue * eased);
    el.textContent = `${value}${suffix || ""}`;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderResultRow(item, delayMs) {
  const row = document.createElement("div");
  row.className = "bg-[var(--bg-card)] border border-white/10 rounded-xl p-5 fade-in-up";
  row.style.animationDelay = `${delayMs}ms`;
  row.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      <div>
        <p class="font-semibold">${item.name}</p>
        <p class="text-xs text-gray-500">${item.group}</p>
      </div>
      <div class="text-right">
        <p class="gold-text font-semibold count-up" data-count-pct>0%</p>
        <p class="text-xs text-gray-500 count-up" data-count-votes>0 votos</p>
      </div>
    </div>
    <div class="progress-bar-bg h-2.5 rounded-full overflow-hidden">
      <div class="progress-bar-fill h-full rounded-full" style="width: 0%" data-bar></div>
    </div>
  `;

  window.setTimeout(() => {
    row.querySelector("[data-bar]").style.width = `${item.percentage}%`;
    animateCount(row.querySelector("[data-count-pct]"), item.percentage, 700, "%");
    animateCount(row.querySelector("[data-count-votes]"), item.votes, 700, " votos");
  }, delayMs + 60);

  return row;
}

async function loadResults() {
  const loading = document.getElementById("loading");
  const hiddenBox = document.getElementById("hidden-results");
  const content = document.getElementById("results-content");
  const statsLine = document.getElementById("stats-line");

  try {
    const res = await fetch(`${API_BASE_URL}/results`);
    const data = await res.json();

    loading.classList.add("hidden");
    statsLine.textContent = `Total de votos registrados: ${data.total_votes} · Participación: ${data.participation}%`;

    if (!data.public_visible) {
      hiddenBox.classList.remove("hidden");
      return;
    }

    content.classList.remove("hidden");
    const kingContainer = document.getElementById("king-results");
    const queenContainer = document.getElementById("queen-results");

    data.king_results.forEach((item, i) => kingContainer.appendChild(renderResultRow(item, i * 90)));
    data.queen_results.forEach((item, i) => queenContainer.appendChild(renderResultRow(item, i * 90)));
  } catch (err) {
    loading.classList.add("hidden");
    statsLine.textContent = "No se pudieron cargar los resultados.";
  }
}

loadResults();
