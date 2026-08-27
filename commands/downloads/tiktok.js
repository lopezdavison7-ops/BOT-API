import axios from 'axios';
import * as cheerio from 'cheerio';

export default {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso: .tiktok bailalo rocky'}, {quoted: msg});

        await sock.sendMessage(msg.key.remoteJid, {text: `🔍 Buscando *${query}* en ssstik...`}, {quoted: msg});

        try {
            // 1. Primero buscamos videos con API de búsqueda
            const searchUrl = `https://api.tikwm.com/video/feed/search?keywords=${encodeURIComponent(query)}&count=5`;
            const {data} = await axios.get(searchUrl);
            const videos = data.data.videos.slice(0, 3);

            if(videos.length === 0) throw new Error('No encontré nada');

            await sock.sendMessage(msg.key.remoteJid, {text: `✅ Encontré ${videos.length} videos. Enviando...`}, {quoted: msg});

            // 2. A cada video le sacamos el link sin marca de agua con scraper a ssstik
            for(const v of videos){
                const tiktokLink = `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`;
                
                // SCRAPER A SSSTIK
                const res = await axios.post('https://ssstik.io/abc?url=dl', 
                    new URLSearchParams({id: tiktokLink, locale: 'es'}),
                    {headers: {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://ssstik.io/'}}
                );
                const $ = cheerio.load(res.data);
                const dlLink = $('a.without_watermark').attr('href') || tiktokLink;

                await sock.sendMessage(msg.key.remoteJid, {text: dlLink}, {quoted: msg});
                await new Promise(r => setTimeout(r, 1500));
            }

            // BOTÓN
            await sock.sendMessage(msg.key.remoteJid, {
                text: `¿Quieres más de *${query}*?`,
                buttons: [
                    {buttonId: `.tiktok ${query}`, buttonText: {displayText: 'SI 🔥'}, type: 1},
                    {buttonId: `.menu`, buttonText: {displayText: 'NO'}, type: 1}
                ],
                footer: 'BOT APPING', headerType: 1
            }, {quoted: msg});

        } catch(e) {
            await sock.sendMessage(msg.key.remoteJid, {text: `❌ Error: ${e.message}`}, {quoted: msg});
        }
    }
};