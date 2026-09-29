import fetch from 'node-fetch';

const API_SEARCH = 'https://api.delirius.online/search/soundcloud?q=';
const API_DOWNLOAD = 'https://api.delirius.online/download/soundcloud?url=';

if (!global.scMap) global.scMap = {};

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function downloadAndSend(url, responder, titulo, autor) {
    try {
        await responder.texto('⏳ Descargando audio de SoundCloud...');
        
        const res = await fetch(API_DOWNLOAD + encodeURIComponent(url), {
            signal: AbortSignal.timeout(15000)
        });
        
        if (!res.ok) throw new Error('API de descarga falló');
        
        const data = await res.json();
        if (!data.estado || !data.datos || !data.datos.descargar) {
            throw new Error('No se encontró el link de descarga');
        }
        
        const downloadUrl = data.datos.descargar;
        
        const audioRes = await fetch(downloadUrl, {
            signal: AbortSignal.timeout(30000)
        });
        
        if (!audioRes.ok) throw new Error('Fallo al descargar el buffer de audio');
        
        const arrayBuffer = await audioRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        await responder.audio(buffer, false);
        
    } catch (error) {
        console.error('[SOUNDCLOUD] Error descarga:', error.message);
        await responder.texto('❌ Error al descargar el audio: ' + error.message);
    }
}

export default {
    nombre: 'soundcloud',
    categoria: 'Descargas',
    alias: ['sc', 'sound'],
    descripcion: 'Busca y descarga música de SoundCloud',
    uso: '.soundcloud <búsqueda> | .soundcloud <número>',

    ejecutar: async ({ msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎵 𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué buscar\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .soundcloud twice fancy\n' +
                '┃ ➪ .soundcloud 2 (para elegir)\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (/^\d+$/.test(q)) {
            const num = parseInt(q);
            const mapa = global.scMap?.[jid];
            const track = mapa?.[num];
            
            if (!track) {
                return await responder.texto('❌ Ese número no existe. Busca primero: `.soundcloud <texto>`');
            }
            
            return await downloadAndSend(track.link, responder, track.titulo, track.artista);
        }

        try {
            const res = await fetch(API_SEARCH + encodeURIComponent(q), {
                signal: AbortSignal.timeout(10000)
            });
            
            if (!res.ok) throw new Error('API de búsqueda falló');
            
            const json = await res.json();
            
            if (!json.estado || !Array.isArray(json.datos) || json.datos.length === 0) {
                return await responder.texto('❌ Sin resultados para: *' + q + '*');
            }

            const lista = json.datos.slice(0, 10);
            global.scMap = global.scMap || {};
            global.scMap[jid] = {};

            let txt = '╭━━〔 🎵 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒: ' + q.toUpperCase() + ' 〕━━⬣\n┃\n';

            lista.forEach((v, i) => {
                global.scMap[jid][i + 1] = v;
                const dur = formatDuration(v.duración);
                txt += `┃ *${i + 1}.* ${v.título}\n`;
                txt += `┃    👤 ${v.artista} · ⏱️ ${dur}\n┃\n`;
            });

            txt += '┃ 📥 Elige: `.soundcloud <número>`\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const primerTrack = lista[0];
            const thumb = primerTrack?.imagen;

            if (thumb) {
                await responder.imagen({ url: thumb }, txt);
            } else {
                await responder.texto(txt);
            }

        } catch (error) {
            console.error('[SOUNDCLOUD] Error:', error.message);
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};