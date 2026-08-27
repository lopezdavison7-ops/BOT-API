export default {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso:.tiktok bailalo rocky'}, {quoted: msg});

        await sock.sendMessage(msg.key.remoteJid, {text: `🔍 Buscando *${query}*...`}, {quoted: msg});

        try {
            // USAMOS LA API DE TIKWM QUE NO NECESITA NADA
            const res = await fetch(`https://api.tikwm.com/video/feed/search?keywords=${encodeURIComponent(query)}&count=1`);
            const json = await res.json();
            const v = json.data.videos[0];

            if(!v) throw new Error('No hay videos');

            const videoUrl = v.play; // link directo mp4 sin marca

            // WHATSAPP REPRODUCE EL LINK SOLO
            await sock.sendMessage(msg.key.remoteJid, {
                video: { url: videoUrl },
                caption: `✅ @${v.author.unique_id}\n${v.title}`
            }, {quoted: msg});

            // BOTÓN
            await sock.sendMessage(msg.key.remoteJid, {
                text: `¿Más de *${query}*?`,
                buttons: [
                    {buttonId: `.tiktok ${query}`, buttonText: {displayText: 'SI 🔥'}, type: 1}
                ],
                footer: 'BOT APPING', headerType: 1
            }, {quoted: msg});

        } catch(e) {
            await sock.sendMessage(msg.key.remoteJid, {text: `❌ Error: ${e.message}`}, {quoted: msg});
        }
    }
};