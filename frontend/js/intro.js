// Animación de entrada con cortinas de gala (solo en la página de inicio).
// Se reproduce cada vez que se entra a la página, y puede omitirse o
// volver a reproducirse manualmente. Respeta prefers-reduced-motion.

function rrPrefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initIntro() {
  const screen = document.getElementById("intro-screen");
  if (!screen) return;

  const reduced = rrPrefersReducedMotion();

  function revealInstant() {
    document.body.classList.remove("intro-locked");
    screen.classList.add("no-anim", "open", "show-crown", "show-title", "show-cta", "intro-done");
  }

  function playSequence() {
    screen.classList.remove("no-anim", "open", "show-crown", "show-title", "show-cta", "intro-done");
    document.body.classList.add("intro-locked");
    // Forzar reflow para que la transición se reproduzca de nuevo si ya se había mostrado.
    void screen.offsetWidth;

    // Las cortinas ahora tardan 2400ms en abrirse (ver CSS); el resto de la
    // secuencia se acopla a ese ritmo más lento y ceremonioso.
    window.setTimeout(() => screen.classList.add("open"), 200);
    window.setTimeout(() => screen.classList.add("show-crown"), 1300);
    window.setTimeout(() => screen.classList.add("show-title"), 2000);
    window.setTimeout(() => {
      screen.classList.add("show-cta");
      screen.classList.add("intro-done");
      document.body.classList.remove("intro-locked");
    }, 2600);
  }

  // La animación de cortinas se reproduce cada vez que se entra a la página
  // (ya no se recuerda en localStorage), salvo que el usuario prefiera
  // movimiento reducido, en cuyo caso se muestra todo de una vez.
  if (reduced) {
    revealInstant();
  } else {
    playSequence();
  }

  const skipBtn = document.getElementById("skip-intro");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      revealInstant();
    });
  }

  const replayBtn = document.getElementById("replay-intro");
  if (replayBtn) {
    replayBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (rrPrefersReducedMotion()) {
        revealInstant();
        return;
      }
      playSequence();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  }
}

document.addEventListener("DOMContentLoaded", initIntro);
