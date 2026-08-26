import { GoogleGenerativeAI } from "@google/generative-ai";
import config from '../../config.js';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY); // <- ya usa config

export default {
    nombre: 'bot',
    categoria: 'ia',
    alias: ['estado', 'creador', 'about', 'ia', 'api'],
    descripcion: 'IA que responde cualquier pregunta. Uso:.bot que es Managua',

    ejecutar: async ({ msg, responder, sock }) => {
        const s = sock || global.conns?.[0];
        const chatJid = msg.key.remoteJid;
        const usuario = msg.key.participant || msg.key.remoteJid;
        const nombre = msg.pushName || 'Usuario';

        const textoCompleto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const pregunta = textoCompleto.split(' ').slice(1).join(' ');

        if (!config.GEMINI_API_KEY) {
            return await responder.texto('❌ Error: No hay GEMINI_KEY configurada en el hosting');
        }

        if (!pregunta) {
            let text = `╭〔 ${config.NOMBRE_BOT} 〕⬣\n┃\n┃ 👤 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂𝐈𝐎𝐍\n┃\n┃ 🆔 Nombre › ${config.NOMBRE_BOT}\n┃ 👑 Creador › @${config.CREADOR}\n┃ 📌 Versión › v${config.VERSION}\n┃ 💰 Estado › En línea\n┃ 🔣 Prefijo › ${config.PREFIJO}\n┃\n┃ 🤖 Hola @${nombre} 👋\n┃ Soy tu IA. Pregúntame lo que sea!\n┃\n╰━━━━━━━━⬣`;
            return await s.sendMessage(chatJid, { text, mentions: [usuario, config.CREADOR + '@s.whatsapp.net'] }, { quoted: msg });
        }

        if (pregunta.match(/quien te creo|creador|owner|dueño/i)) {
            let text = `╭〔 ${config.NOMBRE_BOT} 〕⬣\n┃\n┃ 👑 𝐂𝐑𝐄𝐀𝐃𝐎𝐑\n┃\n┃ Me creó @${config.CREADOR} 🔥\n┃ Él es mi dueño y programador.\n┃\n╰━━━━━━━━⬣`;
            return await s.sendMessage(chatJid, { text, mentions: [usuario, config.CREADOR + '@s.whatsapp.net'] }, { quoted: msg });
        }

        try {
            await responder.texto('⚡ BOT-API pensando...');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Eres ${config.NOMBRE_BOT}, bot de WhatsApp creado por ${config.CREADOR}. Responde corto, amigable, con emojis y en español. Usuario: ${nombre}. Pregunta: ${pregunta}`;
            const result = await model.generateContent(prompt);
            const respuesta = result.response.text();

            let text = `╭〔 ${config.NOMBRE_BOT} 〕⬣\n┃\n┃ 🤖 𝐑𝐄𝐒𝐏𝐔𝐄𝐒𝐓𝐀\n┃\n┃ ${respuesta}\n┃\n┃ 👤 Usuario › @${usuario.split('@')[0]}\n┃\n╰━━━━━━━━⬣`;
            await s.sendMessage(chatJid, { text, mentions: [usuario] }, { quoted: msg });

        } catch (e) {
            console.log(e);
            await responder.texto('❌ Error con la IA. Revisa GEMINI_KEY');
        }
    }
};