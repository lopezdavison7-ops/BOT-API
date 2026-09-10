// ============================================================
// COMANDO PRINCIPAL (v3 con álbum)
// ============================================================
export default {
    nombre: 'r34',
    categoria: 'NSFW',
    alias: ['r34vid', 'rule34', 'rule34vid', 'rule', 'rulevid'],
    descripcion: 'Busca Rule34 por tags y lo manda en álbum',
    uso: '.r34 <tags> [cantidad] · .r34vid <tags>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const tipo = obtenerTipo(msg);
        const modoVideo = /vid$/.test(tipo);

        // Parseo: tags + cantidad opcional al final (.r34 hatsune_miku 5)
        const tokens = String(argumento || '').trim().split(/\s+/).filter(Boolean);
        let cant = 4;
        if (tokens.length && /^\d+$/.test(tokens[tokens.length - 1])) {
            cant = Math.max(1, Math.min(10, parseInt(tokens.pop(), 10)));
        }
        const tag = tokens.join('_');

        if (!tag) {
            return await responder.texto(
                '╭━━〔 🔞 𝐔𝐄 𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes especificar tags\n' +
                '┃\n' +
                '┃ Ejemplos:\n' +
                '┃  • .r34 hatsune_miku\n' +
                '┃  • .r34 hatsune_miku 6\n' +
                '┃  • .r34vid neko\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }

        try {
            let media = await buscarStellar(tag);
            if (!media.length) media = await buscarDirecto(tag);
            if (!media.length) media = await buscarBooru('yande.re', tag);
            if (!media.length) media = await buscarBooru('konachan.com', tag);

            if (!media.length) {
                return await responder.texto(
                    '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Sin resultados para:\n' +
                    '┃ *' + tag + '*\n' +
                    '┃\n' +
                    '┃ Intenta con otros tags\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
                );
            }

            let filtered = modoVideo
                ? media.filter(u => /\.mp4$/i.test(u))
                : media.filter(u => /\.(jpe?g|png|gif)$/i.test(u));
            if (!filtered.length) filtered = media;

            // Selección random para el álbum (videos máx 2 por peso)
            const seleccion = filtered
                .sort(() => Math.random() - 0.5)
                .slice(0, modoVideo ? Math.min(cant, 2) : cant);

            const caption =
                '╭━━〔 🔞 𝐑𝐔𝐋𝐄 𝟑𝟒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🏷️ Tags › *' + tag + '*\n' +
                '┃  Álbum › ' + seleccion.length + ' archivos\n' +
                '┃ 🎲 Pool › ' + filtered.length + ' resultados\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━';

            // ÁLBUM nativo de WhatsApp (Baileys 7)
            if (typeof sock.sendAlbum === 'function') {
                const album = seleccion.map((u, i) => {
                    const item = /\.mp4$/i.test(u)
                        ? { video: { url: u } }
                        : { image: { url: u } };
                    if (i === 0) item.caption = caption;
                    return item;
                });
                await sock.sendAlbum(msg.key.remoteJid, album, { quoted: msg });
            } else {
                // Fallback: envío secuencial si tu Baileys no tiene sendAlbum
                for (let i = 0; i < seleccion.length; i++) {
                    const u = seleccion[i];
                    const content = /\.mp4$/i.test(u)
                        ? { video: { url: u } }
                        : { image: { url: u } };
                    if (i === 0) content.caption = caption;
                    await sock.sendMessage(msg.key.remoteJid, content, i === 0 ? { quoted: msg } : {});
                }
            }

        } catch (error) {
            console.error('[R34] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '╭━━〔 ⚠️ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falló la búsqueda Rule34\n' +
                '┃ Intenta de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }
    }
};