

const API = 'https://api.delirius.online/search/lyrics?query=';

function dividirTexto(texto, limite = 2500) {
    const partes = [];
    let restante = texto;

    while (restante.length > 0) {
        if (restante.length <= limite) {
            partes.push(restante);
            break;
        }
        let corte = restante.lastIndexOf('\n', limite);
        if (corte < limite * 0.5) corte = limite;
        partes.push(restante.slice(0, corte));
        restante = restante.slice(corte).trimStart();
    }

    return partes;
}

export default {
    nombre: 'letra',
    categoria: 'utils',
    alias: ['lyrics', 'letras', 'lirik'],
    descripcion: 'Busca la letra completa de una canción',
    uso: '.letra <canción o artista - canción>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎤 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre de la canción\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .letra hola remix\n' +
                '┃ • .letra dalex - hola\n' +
                '┃ • .lyrics shape of you\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {

            const res = await fetch(API + encodeURIComponent(q));
            const json = await res.json();

            const d = json.data || json.datos;

            if (!json.status || !d) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No encontré la letra de:\n' +
                    '┃ *' + q + '*\n' +
                    '┃\n' +
                    '┃ 💡 Intenta con:\n' +
                    '┃ .letra <artista> <canción>\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const titulo = d.title || d.título || 'Sin título';
            const artistas = d.artists || d.artista || 'Desconocido';
            const album = d.album || d.álbum || null;
            const duracion = d.duration || d.duración || null;
            const letra = d.lyrics || d.letra || '';

            if (!letra) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                    '┃\n' +
                    '┃ La canción existe pero no\n' +
                    '┃ tiene letra disponible.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const header =
                '╭━━〔 🎤 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎶 *' + titulo + '*\n' +
                '┃ 🎤 ' + artistas + '\n' +
                (album ? '┃ 💿 ' + album + '\n' : '') +
                (duracion ? '┃ ⏱️ ' + duracion + '\n' : '') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣\n\n';

            const partes = dividirTexto(letra, 2500);

            await responder.texto(
                header + partes[0] +
                (partes.length > 1 ? '\n\n📄 (1/' + partes.length + ')' : '')
            );

            for (let i = 1; i < partes.length; i++) {
                await responder.texto(
                    partes[i] + '\n\n📄 (' + (i + 1) + '/' + partes.length + ')'
                );
            }

        } catch (error) {
            console.error('[LYRICS] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐋𝐄𝐓𝐑𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ Error buscando la letra.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};