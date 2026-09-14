export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad',
    uso: '.ship @persona',
    ejecutar: async ({ msg, sock }) => {
        const s = sock || global.conns?.[0];
        const chatJid = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        const target = ctx?.quotedMessage ? ctx.participant : ctx?.mentionedJid?.[0];
        if (!target) {
            return await s.sendMessage(chatJid, { 
                text: '❌ Usa: `.ship @persona` o responde a un mensaje' 
            }, { quoted: msg });
        }

        const porcentaje = Math.floor(Math.random() * 101);
        const n1 = sender.split('@')[0];
        const n2 = target.split('@')[0];

        // Fotos de fallback (instantáneas)
        const pp1 = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
        const pp2 = 'https://telegra.ph/file/40b0c932464880b0f5153.jpg';

        const mensaje = porcentaje >= 70 ? '💕 PERFECTOS' : 
                       porcentaje >= 50 ? '💖 HAY QUÍMICA' : 
                       porcentaje >= 30 ? '🤔 TAL VEZ' : '💀 F EN EL CHAT';

        // URL directa (sin cargar nada)
        const apiUrl = `https://api.delirius.online/canvas/ship?image1=${pp1}&image2=${pp2}&name1=${n1}&name2=${n2}&percentage=${porcentaje}&text=${mensaje}`;

        await s.sendMessage(
            chatJid,
            { 
                image: { url: apiUrl },
                caption: `💑 @${n1} + @${n2}\n📊 *${porcentaje}%* ${mensaje}`,
                mentions: [sender, target]
            },
            { quoted: msg }
        );
    }
};