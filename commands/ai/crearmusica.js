// commands/ai/crearmusica.js — 🎵 Generador de música con IA
import fetch from 'node-fetch';

const POLLINATIONS = 'https://text.pollinations.ai/audio/';
const HF_MODEL = 'facebook/musicgen-small';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

async function generarPollinations(prompt) {
    try {
        const url = POLLINATIONS + encodeURIComponent(prompt) + '?model=openai-audio&voice=nova';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) return null;
        const contentType = res.headers.get('content-type') || '';
        const buffer = Buffer.from(await res.arrayBuffer());

        if (!contentType.includes('audio') && buffer.length < 5000) return null;

        return {
            buffer,
            fuente: 'Pollinations.ai',
            modelo: 'openai-audio',
            mime: contentType.includes('wav') ? 'audio/wav' : 'audio/mpeg'
        };
    } catch (e) {
        console.error('[MUSICA] pollinations error:', e.message);
        return null;
    }
}

async function generarHF(prompt) {
    try {
        const token = process.env.HF_TOKEN || '';
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'audio/flac, audio/wav, audio/mpeg'
        };
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);

        const res = await fetch(
            'https://api-inference.huggingface.co/models/' + HF_MODEL,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ inputs: prompt }),
                signal: controller.signal
            }
        );
        clearTimeout(timeout);

        if (!res.ok) return null;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || '';

        if (buffer.length < 1000) return null;

        let mime = 'audio/flac';
        if (contentType.includes('wav')) mime = 'audio/wav';
        else if (contentType.includes('mpeg') || contentType.includes('mp3')) mime = 'audio/mpeg';

        return { buffer, fuente: 'Hugging Face', modelo: HF_MODEL, mime };
    } catch (e) {
        console.error('[MUSICA] HF error:', e.message);
        return null;
    }
}

export default {
    nombre: 'crearmusica',
    categoria: 'ai',
    alias: ['musicgen', 'hacermusica', 'generarmusica', 'musicia', 'song'],
    descripcion: 'Genera música con IA desde un texto (prompt)',
    uso: '.crearmusica <descripción de la música>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const prompt = (argumento || '').trim();

        if (!prompt) {
            return await responder.texto(
                '╭━━〔 🎵 𝐂𝐑𝐄𝐀𝐑 𝐌𝐔𝐒𝐈𝐂𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 📝 Describe la música que quieres:\n' +
                '┃\n' +
                '┃ ➪ .crearmusica lo-fi chill con piano\n' +
                '┃ ➪ .crearmusica techno oscuro con bajos\n' +
                '┃ ➪ .crearmusica reggaeton latino\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (prompt.length < 5) {
            return await responder.texto('❌ El prompt es muy corto. Describe mejor la música.');
        }

        if (prompt.length > 300) {
            return await responder.texto('❌ Prompt muy largo. Máximo 300 caracteres.');
        }

        await responder.texto(
            '🎵 ' + bold('GENERANDO MUSICA') + '...\n\n' +
            '⏳ Esto puede tomar 30-90 segundos\n' +
            '🎼 Prompt: ' + prompt + '\n' +
            '🔄 Probando APIs disponibles...'
        );

        let resultado = await generarPollinations(prompt);
        if (!resultado) {
            resultado = await generarHF(prompt);
        }

        if (!resultado) {
            return await responder.texto(
                '❌ No pude generar la música. Intenta con otro prompt o prueba más tarde.'
            );
        }

        const caption =
            '╭━━〔 🎵 𝐌𝐔𝐒𝐈𝐂𝐀 𝐆𝐄𝐍𝐄𝐑𝐀𝐃𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ 🎼 Prompt: ' + prompt + '\n' +
            '┃ 🤖 Modelo: ' + resultado.modelo + '\n' +
            '┃ 🌐 Fuente: ' + resultado.fuente + '\n' +
            '┃ ⚖️ Tamaño: ' + (resultado.buffer.length / 1024).toFixed(1) + ' KB\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        try {
            await sock.sendMessage(msg.key.remoteJid, {
                audio: resultado.buffer,
                mimetype: resultado.mime,
                ptt: false,
                caption
            }, { quoted: msg });
        } catch (e) {
            console.error('[MUSICA] envio error:', e.message);
            await responder.texto('❌ Se generó el audio pero falló al enviarlo: ' + e.message);
        }
    }
};