import fetch from 'node-fetch';

const API_URL = 'https://api.omegatech.app/api/ai/Txt2video';
const TIEMPO_MAX = 180000;

export default {
    nombre: 'txt2video',
    categoria: 'IA',
    alias: ['text2video', 'textovideo', 'aiavideo'],
    descripcion: 'Genera un video a partir de texto con IA',
    uso: '.txt2video <descripción>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const prompt = String(argumento || '').trim();

        if (!prompt) {
            return await responder.texto(
                '╭━━〔 🎬 𝐓𝐗𝐓𝟐𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe la descripción\n' +
                '┃    del video que quieres\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .txt2video gato comiendo pizza\n' +
                '┃ ➪ .txt2video astronauta en marte\n' +
                '┃ ➪ .txt2video coche volando ciudad\n' +
                '┃\n' +
                '┃ ⏱️ La IA tarda 1-3 min\n' +
                '┃    en generar el video\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (prompt.length < 3) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐏𝐑𝐎𝐌𝐏𝐓 𝐌𝐔𝐘 𝐂𝐎𝐑𝐓𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Mínimo 3 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const aviso = await responder.texto(
            '╭━━〔 🎬 𝐆𝐄𝐍𝐄𝐑𝐀𝐍𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            '┃ ⏳ La IA está creando tu video...\n' +
            '┃\n' +
            '┃ 📝 *' + prompt + '*\n' +
            '┃\n' +
            '┃ ⏱️ Puede tardar 1-3 minutos\n' +
            '┃    ten paciencia 🙏\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        try {
            const url = `${API_URL}?action=generate&prompt=${encodeURIComponent(prompt)}&ratio=auto&sound=true`;

            const res = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                signal: AbortSignal.timeout(TIEMPO_MAX)
            });

            if (!res.ok) {
                throw new Error('API respondió HTTP ' + res.status);
            }

            const data = await res.json();

            if (!data?.success || !data?.data?.videoUrl) {
                const msg = data?.message || 'La API no devolvió video';
                throw new Error(msg);
            }

            const resultado = data.data;

            const caption =
                '╭━━〔 🎬 𝐀𝐈 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 📝 *Prompt:*\n' +
                '┃ ' + resultado.prompt + '\n' +
                '┃\n' +
                '┃ 📐 Ratio › *' + (resultado.ratio || 'auto') + '*\n' +
                '┃ 🔊 Sonido › *' + (resultado.sound ? 'Sí' : 'No') + '*\n' +
                '┃ 📡 Fuente › *' + (data.source || 'Omegatech') + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            try {
                await sock.sendMessage(jid, {
                    video: { url: resultado.videoUrl },
                    caption,
                    mimetype: 'video/mp4'
                }, { quoted: msg });

                try {
                    await sock.sendMessage(jid, {
                        delete: aviso.key
                    });
                } catch {}

            } catch (errorEnvio) {
                throw new Error('No se pudo enviar el video: ' + errorEnvio.message);
            }

        } catch (error) {
            console.error('[TXT2VIDEO] Error:', error?.message || error);

            let mensaje = error?.message || 'Error desconocido';

            if (mensaje.includes('timeout') || mensaje.includes('aborted')) {
                mensaje = 'La generación tardó demasiado.\n┃    Intenta con un prompt más corto.';
            }

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + mensaje + '\n' +
                '┃\n' +
                '┃ 💡 Intenta de nuevo o con\n' +
                '┃    otra descripción\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};