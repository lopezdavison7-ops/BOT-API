// commands/downloads/pelicula.js
// ============================================================
// BOT-API — PELÍCULAS (Delirius API / TMDB)
// ============================================================
// .pelicula <búsqueda>   → lista resultados numerados
// .pelicula <número>     → muestra ficha con póster y resumen
// ============================================================

const API = 'https://api.delirius.online/search/movie?query=';

// ---------- NORMALIZAR (soporta claves en ES y EN) ----------
function normarPeli(item) {
    return {
        titulo: item.title || item.título || 'Sin título',
        tituloOriginal: item.original_title || item['título_original'] || null,
        resumen: item.overview || item.Resumen || item['descripción general'] || 'Sin resumen disponible.',
        fecha: item.release_date || item.fecha_de_lanzamiento || 'N/A',
        idioma: item.original_language || item.idioma_original || 'N/A',
        voto: item.vote_average || 0,
        votos: item.vote_count || 0,
        imagen: item.poster_path || item.imagen || null,
        id: item.id
    };
}

// ---------- URL DEL PÓSTER ----------
function posterUrl(img) {
    if (!img) return null;
    if (img.startsWith('http')) return img.replace('http://', 'https://');
    return 'https://image.tmdb.org/t/p/original' + img;
}

// ---------- FICHA DETALLADA ----------
async function mostrarFicha(responder, peli) {
    const poster = posterUrl(peli.imagen);

    const caption =
        '╭━━〔 🎬 𝐈𝐇 𝐃 𝐏𝐄𝐋𝐈𝐂𝐔𝐋𝐀 〕━━⬣\n' +
        '┃\n' +
        '┃ 🎬 *' + peli.titulo + '*\n' +
        (peli.tituloOriginal && peli.tituloOriginal !== peli.titulo
            ? '┃ ️ ' + peli.tituloOriginal + '\n'
            : '') +
        '┃\n' +
        '┃ 📅 Estreno: ' + peli.fecha + '\n' +
        '┃ 🌐 Idioma: ' + String(peli.idioma).toUpperCase() + '\n' +
        '┃ ⭐ Puntaje: *' + peli.voto + '/10* (' + peli.votos + ' votos)\n' +
        '┃\n' +
        '┃  *Resumen:*\n' +
        '┃ ' + String(peli.resumen).substring(0, 500) + '\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐎-𝐏 ⚡ 〕━━⬣';

    if (poster) {
        try {
            await responder.imagen({ url: poster }, caption);
            return;
        } catch (e) {
            // si falla el póster, cae a texto
        }
    }

    await responder.texto(caption);
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'pelicula',
    categoria: 'descargas',
    alias: ['peli', 'movie', 'películas'],
    descripcion: 'Busca películas y muestra ficha con póster',
    uso: '.pelicula <búsqueda> · .pelicula <número>',
    ejecutar: async ({ argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎬 𝐏𝐄𝐋𝐈𝐂𝐔𝐋𝐀𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué buscar\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .pelicula blackpink\n' +
                '┃ • .pelicula spider man\n' +
                '┃ • .pelicula 3 (ver ficha)\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // CASO 1: NÚMERO → mostrar ficha
        // ============================================
        if (/^\d+$/.test(q)) {
            const mapa = global.peliMap?.[jid];
            const peli = mapa?.[Number(q)];

            if (!peli) {
                return await responder.texto('❌ Ese número no existe.\nPrimero busca: .pelicula <texto>');
            }

            return await mostrarFicha(responder, peli);
        }

        // ============================================
        // CASO 2: BÚSQUEDA
        // ============================================
        try {
            const res = await fetch(API + encodeURIComponent(q));
            const json = await res.json();

            const datos = json.data || json.datos;

            if (!json.status || !Array.isArray(datos) || datos.length === 0) {
                return await responder.texto('❌ No encontré películas para: *' + q + '*');
            }

            const peliculas = datos.slice(0, 10).map(normarPeli);

            // Si solo hay 1 resultado, mostrar ficha directo
            if (peliculas.length === 1) {
                return await mostrarFicha(responder, peliculas[0]);
            }

            // Guardar mapa para elegir por número
            global.peliMap = global.peliMap || {};
            global.peliMap[jid] = {};

            let txt =
                '╭━━〔  𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒: ' + q.toUpperCase() + ' 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎞️ ' + peliculas.length + ' película(s)\n' +
                '┃\n';

            peliculas.forEach((p, i) => {
                global.peliMap[jid][i + 1] = p;
                const año = p.fecha !== 'N/A' ? p.fecha.substring(0, 4) : '?';
                txt += '┃ *' + (i + 1) + '.* ' + String(p.titulo).slice(0, 45) + '\n';
                txt += '┃     📅 ' + año + ' · ⭐ ' + p.voto + '\n┃\n';
            });

            txt += '┃ 📥 Ver ficha: .pelicula <número>\n┃    Ej: .pelicula 1\n┃\n━━〔 ⚡ 𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(txt);

        } catch (error) {
            console.error('[PELICULA] Error:', error?.message || error);
            await responder.texto('❌ Error buscando: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};