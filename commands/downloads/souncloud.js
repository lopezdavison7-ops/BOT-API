import fetch from 'node-fetch';

const API_SEARCH = 'https://api.delirius.online/search/soundcloud?q=';
const API_DOWNLOAD = 'https://api.delirius.online/download/soundcloud?url=';

if (!global.scMap) global.scMap = {};

function formatDuration(ms) {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function downloadAndSend(url, titulo, autor, sock, jid, msg) {
    try {
        const res = await fetch(API_DOWNLOAD + encodeURIComponent(url), {
            signal: AbortSignal.timeout(15000)
        });
        
        if (!res.ok) throw new Error('API de descarga falló (' + res.status + ')');
        
        const data = await res.json();
        if (!data.estado || !data.datos || !data.datos.descargar) {
            throw new Error('No se encontró el link de descarga en la API');
        }
        
        const downloadUrl = data.datos.descargar;
        
        const audioRes = await fetch(downloadUrl, {
            signal: AbortSignal.timeout(30000)
        });
        
        if (!audioRes.ok) throw new Error('Fallo al descargar el buffer (' + audioRes.status + ')');
        
        const arrayBuffer = await audioRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const cleanTitle = (titulo || 'Unknown').replace(/[^\w\s.-]/g, '').slice(0, 40);
        const cleanAuthor = (autor || 'Unknown').replace(/[^\w\s.-]/g, '').slice(0, 20);
        const fileName = `${cleanTitle} - ${cleanAuthor}.mp3`;
        
        await sock.sendMessage(jid, {
            document: buffer,
            mimetype: 'audio/mpeg',
            fileName: fileName,
            caption: `🎵 *${titulo}*\n👤 ${autor}\n\n📥 Descargado de SoundCloud`
        }, { quoted: msg });
        
    } catch (error) {
        console.error('[SOUNDCLOUD] Error descarga:', error.message);
        await sock.sendMessage(jid, {
            text: `❌ Error al descargar: ${error.message}`
        }, { quoted: msg });
    }
}

export default {
    nombre: 'soundcloud',
    categoria: 'Descargas',
    alias: ['sc', 'sound'],
    descripcion: 'Busca y descarga música de SoundCloud',
    uso: '.soundcloud <búsqueda>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎵 𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué buscar\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .sc twice fancy\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Si el usuario pone un número, descargar ese (por si quiere otro de la lista)
        if (/^\d+$/.test(q)) {
            const num = parseInt(q);
            const mapa = global.scMap?.[jid];
            const track = mapa?.[num];
            
            if (!track) {
                return await responder.texto('❌ Ese número no existe. Haz una nueva búsqueda.');
            }
            
            await responder.texto(`⏳ Descargando: *${track.título}*...`);
            return await downloadAndSend(track.link, track.titulo, track.artista, sock, jid, msg);
        }

        try {
            await responder.texto('🔍 Buscando en SoundCloud...');
            
            const res = await fetch(API_SEARCH + encodeURIComponent(q), {
                signal: AbortSignal.timeout(10000)
            });
            
            if (!res.ok) {
                console.log('[SC] API Search status:', res.status);
                throw new Error('API de búsqueda falló (' + res.status + ')');
            }
            
            const json = await res.json();
            console.log('[SC] API Response check:', json.estado, Array.isArray(json.datos), json.datos?.length);
            
            if (!json || !json.datos || !Array.isArray(json.datos) || json.datos.length === 0) {
                return await responder.texto(
                    '❌ Sin resultados para: *' + q + '*\n\n' +
                    '💡 Intenta con el nombre exacto de la canción o artista.'
                );
            }

            const lista = json.datos.slice(0, 10);
            global.scMap = global.scMap || {};
            global.scMap[jid] = {};

            const primerTrack = lista[0];
            
            // 1. Enviar primer resultado automáticamente
            await responder.texto(`⏳ Descargando el primer resultado:\n*${primerTrack.título}* - ${primerTrack.artista}`);
            await downloadAndSend(primerTrack.link, primerTrack.titulo, primerTrack.artista, sock, jid, msg);

            // 2. Mostrar el resto de resultados por si quiere elegir otro
            if (lista.length > 1) {
                let txt = '╭━━〔 🎵 𝐎𝐓𝐑𝐎𝐒 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n┃\n';
                lista.forEach((v, i) => {
                    if (i === 0) return; // Saltar el primero que ya se envió
                    global.scMap[jid][i + 1] = v;
                    const dur = formatDuration(v.duración);
                    txt += `┃ *${i + 1}.* ${v.título}\n`;
                    txt += `┃    👤 ${v.artista} · ⏱️ ${dur}\n┃\n`;
                });
                txt += '┃ 💡 Para descargar otro de la lista, escribe:\n';
                txt += '┃ ➪ `.sc <número>`\n';
                txt += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
                
                await responder.texto(txt);
            }

        } catch (error) {
            console.error('[SOUNDCLOUD] Error:', error.message);
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};