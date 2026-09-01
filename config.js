// config.js
// ============================================================
// CONFIGURACIÓN GLOBAL DE CLAVES DE API
// ============================================================
// Alternativa al .env: el panel de hosting guarda el archivo
// como ".env " (con un espacio invisible al final del nombre),
// así que Node nunca lo encuentra sin importar qué se cambie
// en el código. Este archivo evita ese problema por completo:
// las claves quedan definidas directamente aquí, como valores
// normales de JavaScript, sin depender de que ningún archivo
// oculto se lea bien.
//
// ⚠️ RELLENA LOS VALORES DE ABAJO con tus claves reales (las
// mismas que tenías en tu .env). Cópialas desde el File Manager
// de tu panel.
//
// ⚠️ IMPORTANTE - SEGURIDAD:
// Este archivo queda con tus claves reales en texto plano.
// - NO lo subas a un repositorio público de GitHub.
// - Agrégalo a tu .gitignore (línea: config.js)
// - Si tu repo YA es público, esas claves se consideran
//   filtradas: mejor pedir claves nuevas cuando puedas.
// ============================================================

export default {

    // API propia (Alex Scraper) — Render
    ALEX_API_URL: 'https://alex-api-scraper2-1.onrender.com',
    ALEX_API_KEY: 'ALEX-90A87DE99B41D6F2A135E9BE0835824C',

    // APIs de terceros usadas por .play, .yt, .ss, .pinterest,
    // .spack, .letra, .chtgpt, etc.
    YT_API_KEY: 'yosoyyo_sk_gincmnk3',
    YO_SOY_YO_API_KEY: 'yosoyyo_sk_p7i2ekmm',
    YOSOYYO_API_KEY: 'yosoyyo_sk_p7i2ekmm',

    // Reservada (aún sin usar en ningún comando)
    LEMPI_API_KEY: 'lem_777e1c256edcd0ce3c4c31d34fc61cdba7bd465e'

};