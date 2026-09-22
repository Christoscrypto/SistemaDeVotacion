// Refuerzo de seguridad para el botón "atrás" del navegador.
//
// Problema: cuando el usuario navega hacia atrás, algunos navegadores no
// vuelven a cargar la página ni a ejecutar este script desde cero — la
// restauran tal cual estaba congelada en memoria (bfcache), incluyendo
// selecciones de candidato o vistas de panel ya obsoletas, aunque el
// token guardado en sessionStorage/localStorage ya haya cambiado o se
// haya eliminado.
//
// Solución: si detectamos que la página fue restaurada desde ese caché
// (event.persisted === true), forzamos una recarga real. Eso hace que el
// script de la página (verify.js, vote.js, admin.js, etc.) se ejecute de
// nuevo desde el inicio y vuelva a comprobar si el usuario sigue
// verificado / con sesión activa, en vez de mostrar un estado
// desactualizado.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
