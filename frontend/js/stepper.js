// Indicador de progreso compartido (4 etapas): Verificación, Rey, Reina, Confirmación.
// Se usa en verify.html y vote.html. No depende de ningún estado del backend.

const RR_STEPS = [
  { key: "verify", label: "Verificación" },
  { key: "king", label: "Rey" },
  { key: "queen", label: "Reina" },
  { key: "confirm", label: "Confirmación" },
];

function renderStepper(container, currentKey) {
  if (!container) return;
  const currentIndex = RR_STEPS.findIndex((s) => s.key === currentKey);

  const row = document.createElement("div");
  row.className = "stepper";

  RR_STEPS.forEach((step, i) => {
    const item = document.createElement("div");
    item.className = "stepper-item";
    if (i < currentIndex) item.classList.add("is-done");
    if (i === currentIndex) item.classList.add("is-active");

    const stepRow = document.createElement("div");
    stepRow.className = "stepper-row";
    if (i < currentIndex) stepRow.classList.add("is-filled");

    const dot = document.createElement("div");
    dot.className = "stepper-dot";
    dot.textContent = i < currentIndex ? "✓" : String(i + 1).padStart(2, "0");

    stepRow.appendChild(dot);

    if (i < RR_STEPS.length - 1) {
      const line = document.createElement("div");
      line.className = "stepper-line";
      stepRow.appendChild(line);
    }

    const label = document.createElement("p");
    label.className = "stepper-label";
    label.textContent = step.label;

    item.appendChild(stepRow);
    item.appendChild(label);
    row.appendChild(item);
  });

  const counter = document.createElement("p");
  counter.className = "stepper-counter";
  counter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(RR_STEPS.length).padStart(2, "0")}`;

  container.innerHTML = "";
  container.appendChild(row);
  container.appendChild(counter);
}
