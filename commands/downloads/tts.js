import config from '../../config.js';

const API_BASE = 'https://apiyosoyyo-ofc.onrender.com';
const API_KEY = config.YO_SOY_YO_API_KEY || process.env.YO_SOY_YO_API_KEY;

export default {
    nombre: 'tts',
    categoria: 'tools',
    alias: ['voz'],
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const texto = argumento?.trim();
        if (!texto) return await responder.texto('❌ .tts hola');

        const url = `${API_BASE}/api/tts?text=${encodeURIComponent(texto)}&apiKey=${API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        
        await sock.sendMessage(msg.key.remoteJid, {
            audio: { url: json.result },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: msg });
    }
}