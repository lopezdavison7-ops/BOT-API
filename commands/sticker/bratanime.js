import fetch from 'node-fetch';

const API_URL = 'https://api.delirius.online/canvas/bratanime?text=';

export default {
    nombre: 'bratanime',
    categoria: 'canvas',
    alias: ['brat', 'bratanime', 'animebrat'],
    descripcion: 'Genera imagen estilo brat anime con texto personalizado',
    uso: '.bratanime <texto>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const texto = String(argumento || '').trim();

        if (!texto) {
            return await responder.texto(
                '╭━━〔 🎨 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el texto que quieres\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .brat TWICE\n' +
                '┃ ➪ .bratanime Hello World\n' +
                '┃ ➪ .brat brat summer 💚\n' +
                '┃\n' +
                '┃ 📝 Máximo 50 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.length > 50) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐓𝐄𝐗𝐓𝐎 𝐌𝐔𝐘 𝐋𝐀𝐑𝐆𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Máximo 50 caracteres\n' +
                '┃ 📝 Tu texto: ' + texto.length + ' caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            await responder.texto('🎨 Generando imagen brat anime...');

            const res = await fetch(API_URL + encodeURIComponent(texto), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/*, application/json'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!res.ok) throw new Error('API respondió ' + res.status);

            const contentType = res.headers.get('content-type') || '';

            if (contentType.includes('image')) {
                const arrayBuffer = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                if (buffer.length < 500) {
                    throw new Error('Imagen vacía o corrupta');
                }

                await sock.sendMessage(jid, {
                    image: buffer,
                    caption:
                        '╭━━〔 🎨 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 📝 Texto: *' + texto + '*\n' +
                        '┃ 📦 Tamaño: ' + (buffer.length / 1024).toFixed(1) + ' KB\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                }, { quoted: msg });

                return;
            }

            const rawText = await res.text();

            try {
                const json = JSON.parse(rawText);
                const imageUrl = json.url || json.data?.url || json.result?.url || json.image;

                if (imageUrl) {
                    await sock.sendMessage(jid, {
                        image: { url: imageUrl },
                        caption:
                            '╭━━〔 🎨 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                            '┃\n' +
                            '┃ 📝 Texto: *' + texto + '*\n' +
                            '┃\n' +
                            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    }, { quoted: msg });
                    return;
                }
            } catch {}

            throw new Error('La API no devolvió una imagen válida');

        } catch (error) {
            console.error('[BRATANIME] Error:', error.message);
            await responder.texto('❌ Error al generar imagen: ' + error.message);
        }
    }
};