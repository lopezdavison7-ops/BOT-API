const https = require("https");

module.exports = {
    nombre: 'tiktok',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim();

        if(!query) return sock.sendMessage(msg.key.remoteJid, {text: '❌ Uso:.tiktok bailalo rocky'}, {quoted: msg});

        sock.sendMessage(msg.key.remoteJid, {text: `⏳ Buscando *${query}*...`}, {quoted: msg});

        // BUSCAR
        https.get("https://www.tikwm.com/api/feed/search?keywords=" + encodeURIComponent(query) + "&count=1", 
        { headers: { "User-Agent": "Mozilla/5.0" } }, 
        res => {
            let data = "";
            res.on("data", c => data += c);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    const v = json.data.videos[0];
                    const linkTik = `https://www.tiktok.com/@${v.author.unique_id}/video/${v.video_id}`;

                    // SACAR LINK DESCARGA
                    https.get("https://www.tikwm.com/api/?url=" + encodeURIComponent(linkTik), 
                    { headers: { "User-Agent": "Mozilla/5.0" } }, 
                    res2 => {
                        let data2 = "";
                        res2.on("data", c => data2 += c);
                        res2.on("end", () => {
                            try {
                                const json2 = JSON.parse(data2);
                                const dl = json2.data.play;

                                // MANDAR VIDEO
                                sock.sendMessage(msg.key.remoteJid, {
                                    video: { url: dl },
                                    caption: `✅ @${v.author.unique_id}\n${v.title}`
                                }, {quoted: msg});

                            } catch { 
                                sock.sendMessage(msg.key.remoteJid, {text: "Error obteniendo video"}, {quoted: msg});
                            }
                        });
                    });

                } catch { 
                    sock.sendMessage(msg.key.remoteJid, {text: "No se encontró video"}, {quoted: msg});
                }
            });
        });
    }
}