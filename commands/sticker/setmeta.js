// commands/stickers/setmeta.js
// ============================================================
// BOT-API — SETMETA (re-etiqueta stickers con tu marca)
// ============================================================
// Cita un sticker y usa:
// .setmeta Alex              → packname=Alex, autor=default
// .setmeta Alex|Mi Autor     → packname=Alex, autor=Mi Autor
// ============================================================

export default {
    nombre: 'setmeta',
    categoria: 'stickers',
    alias: ['retag', 'marcar', 'stickername', 'setsticker'],
    descripcion: 'Re-etiqueta un sticker con tu marca personal',
    uso: '.setmeta [nombre] | [nombre]|[autor] (citando un sticker)',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const s = global.conns?.[0] || Object.values(global.conns || {})[0] || sock;

        // ---------- VALIDAR ARGUMENTO ----------
        const input = String(argumento || '').trim();
        if (!input) {
            return await responder.texto(
                '╭━━〔 🏷️ 𝐒𝐄𝐓𝐌𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el nombre de la marca.\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ 1. Cita un sticker\n' +
                '┃ 2. Escribe: .setmeta <nombre>\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ • .setmeta Alex\n' +
                '┃ • .setmeta Alex|Mi Bot\n' +
                '┃ • .setmeta El Crack 💥\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- PARSEAR PACKNAME Y AUTOR ----------
        let packname, author;
        if (input.includes('|')) {
            const partes = input.split('|').map(p => p.trim()).filter(Boolean);
            packname = partes[0] || 'Sticker';
            author = partes[1] || sender.split('@')[0];
        } else {
            packname = input;
            author = sender.split('@')[0];
        }

        // ---------- BUSCAR STICKER CITADO ----------
        let stickerMessage = null;

        // Caso 1: Sticker citado en extendedTextMessage
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
            stickerMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
        }
        // Caso 2: El mensaje mismo es un sticker (con caption)
        else if (msg.message?.stickerMessage) {
            stickerMessage = msg.message.stickerMessage;
        }

        if (!stickerMessage) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐒𝐄𝐓𝐌𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ No se encontró un sticker citado.\n' +
                '┃\n' +
                '┃ 📋 Cómo usarlo:\n' +
                '┃ 1. Envía un sticker al chat\n' +
                '┃ 2. Responde a ese sticker\n' +
                '┃    con: .setmeta Alex\n' +
                '┃\n' +
                '┃ 💡 También puedes mandar el\n' +
                '┃    sticker con caption:\n' +
                '┃    .setmeta Alex\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ---------- DESCARGAR STICKER ORIGINAL ----------
        try {
            let buffer = null;

            // Método 1: downloadContentFromMessage (baileys)
            try {
                const baileys = await import('baileys');
                const downloadFn = baileys.downloadContentFromMessage || baileys.default?.downloadContentFromMessage;

                if (downloadFn) {
                    const stream = await downloadFn(stickerMessage, 'sticker');
                    const chunks = [];
                    for await (const chunk of stream) chunks.push(chunk);
                    buffer = Buffer.concat(chunks);
                }
            } catch (e) {
                console.error('[SETMETA] downloadContentFromMessage:', e.message);
            }

            // Método 2: sock.downloadMediaMessage
            if (!buffer && typeof s.downloadMediaMessage === 'function') {
                try {
                    const fakeMsg = {
                        message: { stickerMessage },
                        key: { remoteJid: chatJid, fromMe: false }
                    };
                    buffer = await s.downloadMediaMessage(fakeMsg, 'buffer');
                } catch (e) {
                    console.error('[SETMETA] downloadMediaMessage:', e.message);
                }
            }

            // Método 3: URL directa
            if (!buffer && stickerMessage.url) {
                try {
                    const res = await fetch(stickerMessage.url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    });
                    if (res.ok) buffer = Buffer.from(await res.arrayBuffer());
                } catch (e) {
                    console.error('[SETMETA] fetch url:', e.message);
                }
            }

            if (!buffer || buffer.length === 0) {
                throw new Error('No se pudo descargar el sticker');
            }

            // ---------- REENVIAR CON NUEVA MARCA ----------
            await s.sendMessage(
                chatJid,
                {
                    sticker: buffer,
                    packname: packname,
                    author: author,
                    isAnimated: stickerMessage.isAnimated || false
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[SETMETA] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐄𝐓𝐌𝐄𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude procesar el sticker.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido'}\n` +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};