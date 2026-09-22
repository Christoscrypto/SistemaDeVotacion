const form = document.getElementById("verify-form");
const errorBox = document.getElementById("error-box");
const submitBtn = document.getElementById("submit-btn");

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function hideError() {
  errorBox.classList.add("hidden");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = document.getElementById("email").value.trim();
  const control = document.getElementById("control").value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "VERIFICANDO...";

  try {
    const res = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutional_email: email,
        control_number: control,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.valid) {
      showError(data.message || "Los datos ingresados no son correctos.");
      submitBtn.disabled = false;
      submitBtn.textContent = "CONTINUAR";
      return;
    }

    // Guardamos el token de votante SOLO en memoria de esta sesión (sessionStorage),
    // nunca en la base de datos ni en la URL.
    sessionStorage.setItem("voter_token", data.voter_token);
    window.location.href = "/vote.html";
  } catch (err) {
    showError("No se pudo conectar con el servidor. Intenta de nuevo.");
    submitBtn.disabled = false;
    submitBtn.textContent = "CONTINUAR";
  }
});
