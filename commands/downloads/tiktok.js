import * as cheerio from 'cheerio';

export default {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso: .tiktok bailalo rocky'}, {quoted: msg});

        await sock.sendMessage(msg.key.remoteJid, {text: `🔍 Buscando *${query}*...`}, {quoted: msg});

        try {
            // 1. SCRAPER A TIKTOKVID.IO - Busca videos
            const searchRes = await fetch(`https://www.tiktokvid.io/api/search?keyword=${encodeURIComponent(query)}`);
            const searchData = await searchRes.json();
            const videos = searchData.data.slice(0, 3);

            if(videos.length === 0) throw new Error('No encontré nada');

            for(const v of videos){
                const tiktokUrl = `https://www.tiktok.com/@${v.author.nickname}/video/${v.id}`;
                
                // 2. SCRAPER A SSSTIK - Para sacar link sin marca
                const formData = new URLSearchParams();
                formData.append('id', tiktokUrl);
                formData.append('locale', 'es');

                const dlRes = await fetch('https://ssstik.io/abc?url=dl', {
                    method: 'POST',
                    body: formData,
                    headers: {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://ssstik.io/'}
                });
                
                const html = await dlRes.text();
                const $ = cheerio.load(html);
                const dlLink = $('a.without_watermark').attr('href') || tiktokUrl;

                await sock.sendMessage(msg.key.remoteJid, {text: dlLink}, {quoted: msg});
                await new Promise(r => setTimeout(r, 1500));
            }

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