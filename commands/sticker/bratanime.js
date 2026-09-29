import fetch from 'node-fetch';

const API_URL = 'https://api.delirius.online/canvas/bratanime?text=';

export default {
    nombre: 'bratanime',
    categoria: 'canvas',
    alias: ['brat', 'bratanime', 'animebrat'],
    descripcion: 'Genera sticker estilo brat anime con texto',
    uso: '.bratanime <texto>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const texto = String(argumento || '').trim();

        if (!texto) {
            return await responder.texto(
                '╭━━〔 🎨 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el texto\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .brat TWICE\n' +
                '┃ ➪ .bratanime Hello\n' +
                '┃\n' +
                '┃ 📝 Máximo 50 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.length > 50) {
            return await responder.texto('❌ Máximo 50 caracteres');
        }

        try {
            await responder.texto('🎨 Generando sticker...');

            const res = await fetch(API_URL + encodeURIComponent(texto), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/*, application/json'
                },
                signal: AbortSignal.timeout(30000)
            });

            if (!res.ok) throw new Error('API respondió ' + res.status);

            const contentType = res.headers.get('content-type') || '';
            let buffer;

            if (contentType.includes('image')) {
                const arrayBuffer = await res.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            } else {
                const json = await res.json();
                const imageUrl = json.url || json.data?.url || json.result?.url;

                if (!imageUrl) throw new Error('No se encontró URL de imagen');

                const imgRes = await fetch(imageUrl, {
                    signal: AbortSignal.timeout(30000)
                });

                if (!imgRes.ok) throw new Error('Error descargando imagen');

                const arrayBuffer = await imgRes.arrayBuffer();
                buffer = Buffer.from(arrayBuffer);
            }

            if (buffer.length < 500) {
                throw new Error('Imagen vacía');
            }

            await sock.sendMessage(jid, {
                sticker: buffer
            }, { quoted: msg });

        } catch (error) {
            console.error('[BRATANIME] Error:', error.message);
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};