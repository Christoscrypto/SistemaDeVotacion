// Configuración compartida por todas las páginas del frontend.
// Como el backend sirve también el frontend (FastAPI + StaticFiles),
// usamos rutas relativas y no hace falta configurar un dominio distinto.
const API_BASE_URL = "/api";

const CURRENT_YEAR_ELEMENT_SELECTOR = "[data-election-year]";
