import fetch from 'node-fetch';

const API_URL = 'https://api.omegatech.app/api/tools/Nftoken';

export default {
    nombre: 'nftoken',
    categoria: 'Utilidades',
    alias: ['netflixtoken', 'netflix', 'nft'],
    descripcion: 'Genera un token de Netflix para diferentes dispositivos',
    uso: '.nftoken',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        const aviso = await responder.texto(
            '╭━━〔 🎬 𝐆𝐄𝐍𝐄𝐑𝐀𝐍𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ ⏳ Generando token de\n' +
            '┃    Netflix...\n' +
            '┃\n' +
            '┃ ⏱️ Esto puede tardar\n' +
            '┃    unos segundos\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        try {
            const res = await fetch(`${API_URL}?action=generate`, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(60000)
            });

            if (!res.ok) {
                throw new Error('API respondió HTTP ' + res.status);
            }

            const data = await res.json();

            if (!data?.success || !data?.data?.token) {
                const msg = data?.message || 'La API no devolvió un token válido';
                throw new Error(msg);
            }

            const resultado = data.data;
            const links = resultado.links || {};
            const allLinks = Array.isArray(links.all) ? links.all : [];

            let texto =
                '╭━━〔 🎬 𝐍𝐄𝐓𝐅𝐋𝐈𝐗 𝐓𝐎𝐊𝐄𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔑 *Token:*\n' +
                '┃ ' + resultado.token.substring(0, 50) + '...\n' +
                '┃\n' +
                '┃ 📅 Generado › *' + (resultado.generatedAt || 'Ahora') + '*\n' +
                '┃ 📡 Fuente › *' + (data.source || 'Omegatech') + '*\n' +
                '┃\n';

            if (allLinks.length > 0) {
                texto += '┣━━〔 🔗 𝐋𝐈𝐍𝐊𝐒 𝐃𝐄𝐕𝐈𝐂𝐄 〕━━⬣\n┃\n';
                for (const item of allLinks) {
                    texto += '┃ ▪️ *' + (item.device || 'Device') + '*\n';
                    texto += '┃ ' + item.url + '\n';
                    texto += '┃\n';
                }
            } else {
                texto += '┣━━〔 🔗 𝐋𝐈𝐍𝐊𝐒 〕━━⬣\n┃\n';
                texto += '┃ 💻 *PC / Browser:*\n';
                texto += '┃ ' + (links.pc || 'No disponible') + '\n┃\n';
                texto += '┃ 📱 *Android:*\n';
                texto += '┃ ' + (links.android || 'No disponible') + '\n┃\n';
                texto += '┃ 📺 *TV (6 Dígitos):*\n';
                texto += '┃ ' + (links.tv6 || 'No disponible') + '\n┃\n';
                texto += '┃ 📺 *TV (8 Dígitos):*\n';
                texto += '┃ ' + (links.tv8 || 'No disponible') + '\n';
            }

            texto += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(jid, { text: texto }, { quoted: msg });

            try {
                await sock.sendMessage(jid, {
                    delete: aviso.key
                });
            } catch {}

        } catch (error) {
            console.error('[NFTOKEN] Error:', error?.message || error);

            let mensaje = error?.message || 'Error desconocido';

            if (mensaje.includes('timeout') || mensaje.includes('aborted')) {
                mensaje = 'La generación tardó demasiado.\n┃    Intenta de nuevo.';
            }

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + mensaje + '\n' +
                '┃\n' +
                '┃ 💡 Intenta de nuevo en\n' +
                '┃    unos momentos\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};