// commands/search/soundcloud.js
// ============================================================
// BOT-API — SOUNDCLOUD (Delirius API)
// ============================================================
// .sc <canción> → manda ficha + audio del mejor resultado
// ============================================================

const API_SEARCH = 'https://api.delirius.online/search/soundcloud?q=';
const API_DL = 'https://api.delirius.online/download/soundcloud?url=';

// ---------- DURACIÓN (ms → m:ss) ----------
function fmtDuracion(ms) {
    const totalSec = Math.floor((ms || 0) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- NÚMEROS BONITOS (1.2M, 45K) ----------
function fmtNum(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
}

export default {
    nombre: 'soundcloud',
    categoria: 'search',
    alias: ['sc', 'sndcloud'],
    descripcion: 'Busca en SoundCloud y manda ficha + audio',
    uso: '.sc <canción o artista>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 ☁️ 𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre de la canción\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .sc twice\n' +
                '┃ • .sc what is love\n' +
                '┃ • .sc dalex hola\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // ---------- 1) BUSCAR ----------
            await responder.texto('⏳ *Buscando en SoundCloud...*\n\n🔎 ' + q);

            const res = await fetch(API_SEARCH + encodeURIComponent(q));
            const text = await res.text();

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            let json;
            try { json = JSON.parse(text); } catch { throw new Error('Respuesta no es JSON'); }

            const status = json.status ?? json.estado ?? false;
            const datos = json.data ?? json.datos ?? null;

            if (!status || !Array.isArray(datos) || !datos.length) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No encontré resultados para:\n' +
                    '┃ *' + q + '*\n' +
                    '┃\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // ---------- 2) MEJOR RESULTADO ----------
            const item = datos[0];

            const ficha =
                '╭━━〔 ☁️ 𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎶 *' + item.title + '*\n' +
                '┃ 🎤 ' + (item.artist !== '-' ? item.artist : 'Desconocido') + '\n' +
                (item.album !== '-' ? '┃ 💿 ' + item.album + '\n' : '') +
                (item.genre !== '-' ? '┃ 🎼 ' + item.genre + '\n' : '') +
                '┃ ⏱️ ' + fmtDuracion(item.duration) + '\n' +
                '┃\n' +
                '┃ ❤️ ' + fmtNum(item.likes) + ' likes · ▶️ ' + fmtNum(item.play) + ' plays\n' +
                '┃\n' +
                '┃ 🔗 ' + item.link + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Manda ficha con portada
            try {
                await responder.imagen({ url: item.image }, ficha);
            } catch (e) {
                await responder.texto(ficha);
            }

            // ---------- 3) DESCARGAR Y MANDAR AUDIO ----------
            await responder.texto('⏳ *Descargando audio...*\n\n🎧 ' + item.title);

            const resDl = await fetch(API_DL + encodeURIComponent(item.link));
            const jsonDl = await resDl.json();

            const statusDl = jsonDl.status ?? jsonDl.estado ?? false;
            const d = jsonDl.data || jsonDl.datos;

            let audioUrl = '';
            if (typeof d === 'string') audioUrl = d;
            else if (d) audioUrl = d.url || d.audio || d.link || d.download || d.audioUrl || '';

            if (!statusDl || !audioUrl) {
                throw new Error('La API no devolvió el audio');
            }

            await responder.audio({ url: audioUrl }, false);

        } catch (error) {
            console.error('[SC] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔  𝐒𝐎𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ Error con SoundCloud.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};