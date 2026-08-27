export default {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso: .tiktok bailalo rocky'}, {quoted: msg});

        const link = `https://api.tikwm.com/video/feed/search?keywords=${encodeURIComponent(query)}`;
        
        await sock.sendMessage(msg.key.remoteJid, {
            text: `🔍 Busqué *${query}*\n\nAquí tienes 3 links para descargar sin marca:\n1. Entra a ssstik.io\n2. Pega el link de tiktok\n\nBusqueda: ${link}`
        }, {quoted: msg});
    }
};