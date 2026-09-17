// commands/download/animesearch.js
// ============================================================
// BOT-API — BÚSQUEDA DE ANIME (Delirius API + MyAnimeList)
// ============================================================
// .anime <nombre>  → lista numerada de resultados
// .anime <número>  → ficha completa con póster
// ============================================================

const API = 'https://api.delirius.online/anime/animesearch?query=';
const MAX_RESULTADOS = 10;

// ---------- NORMALIZAR ITEM (claves ES / EN) ----------
function normalizarItem(a) {
    const payload = a['carga útil'] || a['carga_util'] || a.payload || {};
    return {
        nombre: a.nombre || a.name || 'Sin nombre',
        tipo: a.tipo || a.type || 'anime',
        url: a.url || '',
        imagen: a.image_url || a.thumbnail_url || '',
        mediaType: payload.media_type || payload.tipo || '—',
        anio: payload.start_year || payload.año || '—',
        emitido: payload.emitido || payload.aired || '—',
        puntuacion: payload.puntuación || payload.puntuacion || payload.score || '—',
        estado: payload.estado || payload.status || '—'
    };
}

// ---------- ENVIAR FICHA DETALLADA ----------
async function enviarDetalle(responder, item, indice) {
    const texto =
        '╭━━〔 🍥 𝐀𝐈𝐄 〕━━⬣\n' +
        '┃\n' +
        '┃ 🎬 *' + item.nombre + '*\n' +
        '┃\n' +
        '┃ 📺 Tipo: ' + item.mediaType + '\n' +
        '┃  Año: ' + item.anio + '\n' +
        '┃ 🗓️ Emitido: ' + item.emitido + '\n' +
        '┃ ⭐ Puntuación: ' + item.puntuacion + '/10\n' +
        '┃ 📡 Estado: ' + item.estado + '\n' +
        '┃\n' +
        '┃ 🔗 ' + item.url + '\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    try {
        await responder.imagen({ url: item.imagen }, texto);
    } catch (e) {
        // Si falla el póster, mandar solo texto
        await responder.texto(texto);
    }
}

export default {
    nombre: 'anime',
    categoria: 'anime',
    alias: ['animesearch', 'buscaranime', 'ani'],
    descripcion: 'Busca animes con ficha completa de MyAnimeList',
    uso: '.anime <nombre> | .anime <número>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const input = String(argumento || '').trim();

        // ---------- AYUDA ----------
        if (!input) {
            return await responder.texto(
                '╭━━〔 🍥 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre del anime\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .anime naruto\n' +
                '┃ • .anime one piece\n' +
                '┃ • .anime 3  (elegir de la lista)\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- MODO SELECCIÓN: .anime <número> ----------
        if (/^\d+$/.test(input)) {
            const lista = global.animeMap?.[chatJid];

            if (!lista || !lista.length) {
                return await responder.texto(
                    '❌ No hay ninguna búsqueda activa.\n' +
                    'Usa primero: *.anime <nombre>*'
                );
            }

            const idx = parseInt(input) - 1;
            const item = lista[idx];

            if (!item) {
                return await responder.texto(
                    '❌ Número fuera de rango.\n' +
                    'Hay ' + lista.length + ' resultados (1-' + lista.length + ')'
                );
            }

            return await enviarDetalle(responder, item, idx);
        }

        // ---------- MODO BÚSQUEDA ----------
        try {
            const res = await fetch(API + encodeURIComponent(input));
            const text = await res.text();

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json;
            try { json = JSON.parse(text); } catch { throw new Error('Respuesta no es JSON'); }

            const status = json.estado ?? json.status ?? false;
            const datos = json.datos ?? json.data ?? null;

            if (!status || !Array.isArray(datos) || !datos.length) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No encontré animes para:\n' +
                    '┃ *' + input + '*\n' +
                    '┃\n' +
                    '┃ 💡 Prueba con otro nombre.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐈 ⚡ 〕━━⬣'
                );
            }

            // Guardar lista para selección posterior
            global.animeMap = global.animeMap || {};
            global.animeMap[chatJid] = datos.slice(0, MAX_RESULTADOS).map(normalizarItem);

            // ---------- LISTA NUMERADA ----------
            let texto =
                '╭━━〔 🍥 𝐍𝐌𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔎 Resultados para: *' + input + '*\n' +
                '┃\n';

            global.animeMap[chatJid].forEach((item, i) => {
                texto +=
                    '┃ *' + (i + 1) + '.* ' + item.nombre + '\n' +
                    '┃     ⭐ ' + item.puntuacion + ' · 📅 ' + item.anio + ' · 📺 ' + item.mediaType + '\n';
            });

            texto +=
                '┃\n' +
                '┃ 📌 Responde con el número para\n' +
                '┃    ver la ficha completa:\n' +
                '┃    .anime 1\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐎-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(texto);

        } catch (error) {
            console.error('[ANIME] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ Error buscando animes.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐎-𝐏 ⚡ 〕━━⬣'
            );
        }
    }
};