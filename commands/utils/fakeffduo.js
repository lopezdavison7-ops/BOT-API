import fetch from 'node-fetch';

const API = 'https://apii.nexadev.my.id/fakeffduo';

export default {
    nombre: 'fakeffduo',
    categoria: 'utils',
    alias: ['ffduo', 'freefireduo', 'duoff'],
    descripcion: 'Crea una imagen Fake Free Fire Duo con 2 nicknames',
    uso: '.fakeffduo nickname1|nickname2',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const text = String(argumento || '').trim();

        if (!text) {
            return await responder.texto(
                '╭━━〔 🎮 𝐅𝐀𝐊𝐄 𝐅𝐅 𝐃𝐔𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe los 2 nicknames\n' +
                '┃    separados por |\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .fakeffduo Pro|Sniper\n' +
                '┃ .fakeffduo Rey|Queen\n' +
                '┃\n' +
                '┃ 📝 Máximo 30 caracteres\n' +
                '┃    por nickname\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const parts = text.split('|');
        if (parts.length < 2) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐅𝐎𝐑𝐌𝐀𝐓𝐎 𝐈𝐍𝐕𝐀́𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Usa el separador |\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .fakeffduo Pro|Sniper\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const nickname1 = parts[0].trim();
        const nickname2 = parts.slice(1).join('|').trim();

        if (!nickname1 || !nickname2) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Ambos nicknames\n' +
                '┃    son obligatorios\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (nickname1.length > 30 || nickname2.length > 30) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐍𝐈𝐂𝐊𝐍𝐀𝐌𝐄 𝐌𝐔𝐘 𝐋𝐀𝐑𝐆𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Máximo 30 caracteres\n' +
                '┃    por nickname\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        await sock.sendMessage(jid, {
            react: { text: '⏳', key: msg.key }
        });

        try {
            const url = `${API}?nickname1=${encodeURIComponent(nickname1)}&nickname2=${encodeURIComponent(nickname2)}`;
            
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*'
                },
                signal: AbortSignal.timeout(60000)
            });

            if (!res.ok) {
                throw new Error('HTTP ' + res.status);
            }

            const contentType = res.headers.get('content-type') || '';
            
            if (!contentType.startsWith('image/')) {
                const textError = await res.text();
                throw new Error('API no devolvió imagen: ' + textError.substring(0, 200));
            }

            const buffer = Buffer.from(await res.arrayBuffer());

            if (!buffer.length) {
                throw new Error('Imagen vacía');
            }

            const caption =
                '╭━━〔 🎮 𝐅𝐀𝐊𝐄 𝐅𝐅 𝐃𝐔𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 *' + nickname1 + '*\n' +
                '┃ 💕\n' +
                '┃ 👤 *' + nickname2 + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(jid, {
                image: buffer,
                caption
            }, { quoted: msg });

            await sock.sendMessage(jid, {
                react: { text: '✅', key: msg.key }
            });

        } catch (error) {
            console.error('[FAKEFFDUO] Error:', error?.message || error);

            await sock.sendMessage(jid, {
                react: { text: '❌', key: msg.key }
            });

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta de nuevo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};