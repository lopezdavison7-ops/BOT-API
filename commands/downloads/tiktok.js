import * as cheerio from 'cheerio';

export default {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso:.tiktok bailalo rocky'}, {quoted: msg});

        await sock.sendMessage(msg.key.remoteJid, {text: `🔍 Buscando y descargando *${query}*... espera 10s`}, {quoted: msg});

        try {
            // 1. BUSCAR CON SCRAPER A TIKWM
            const searchRes = await fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(query)}&count=1`);
            const searchJson = await searchRes.json();
            const video = searchJson.data.videos[0];

            if(!video) throw new Error('No encontré videos');

            const playUrl = video.play; // Este ya viene sin marca de agua

            // 2. DESCARGAR Y MANDAR EL VIDEO DIRECTO
            const videoRes = await fetch(playUrl);
            const buffer = Buffer.from(await videoRes.arrayBuffer());

            await sock.sendMessage(msg.key.remoteJid, {
                video: buffer,
                caption: `✅ @${video.author.unique_id}\n${video.title}`
            }, {quoted: msg});

            // BOTÓN
            await sock.sendMessage(msg.key.remoteJid, {
                text: `¿Quieres más de *${query}*?`,
                buttons: [
                    {buttonId: `.tiktok ${query}`, buttonText: {displayText: 'SI 🔥'}, type: 1}
                ],
                footer: 'BOT APPING', headerType: 1
            }, {quoted: msg});

        } catch(e) {
            await sock.sendMessage(msg.key.remoteJid, {text: `❌ Error: ${e.message}\nIntenta otra vez en 5s`}, {quoted: msg});
        }
    }
};