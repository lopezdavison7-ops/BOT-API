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

        // Función para obtener foto con timeout
        async function getFoto(jid) {
            try {
                // Si es @lid, no tiene foto pública
                if (jid.includes('@lid')) {
                    return 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
                }
                
                const url = await Promise.race([
                    s.profilePictureUrl(jid, 'image'),
                    new Promise((_, reject) => setTimeout(() => reject('timeout'), 1500))
                ]);
                return url;
            } catch (e) {
                // Fallback si no tiene foto o timeout
                return 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            }
        }

        // Obtener ambas fotos en paralelo
        const [pp1, pp2] = await Promise.all([
            getFoto(sender),
            getFoto(target)
        ]);

        const porcentaje = Math.floor(Math.random() * 101);
        
        // Nombres legibles (sin el @lid ni el @s.whatsapp.net)
        const n1 = sender.split('@')[0].split(':')[0];
        const n2 = target.split('@')[0].split(':')[0];
        
        const nombre1 = msg.pushName || n1;
        const nombre2 = n2;

        const mensaje = porcentaje >= 90 ? '✨ ALMA GEMELA' :
                       porcentaje >= 75 ? '💕 PERFECTOS' :
                       porcentaje >= 60 ? '💖 HAY QUÍMICA' :
                       porcentaje >= 40 ? '💗 PODRÍA SER' :
                       porcentaje >= 25 ? '🤔 TAL VEZ' :
                       porcentaje >= 10 ? '💀 F EN EL CHAT' : '⚰️ ENTERRADO VIVO';

        // URL de la API con las fotos reales
        const apiUrl = `https://api.delirius.online/canvas/ship?` +
            `image1=${encodeURIComponent(pp1)}` +
            `&image2=${encodeURIComponent(pp2)}` +
            `&name1=${encodeURIComponent(nombre1)}` +
            `&name2=${encodeURIComponent(nombre2)}` +
            `&percentage=${porcentaje}` +
            `&text=${encodeURIComponent(mensaje)}`;

        await s.sendMessage(
            chatJid,
            { 
                image: { url: apiUrl },
                caption: `╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n┃\n┃ 💑 @${n1} + @${n2}\n┃\n┃ 📊 *${porcentaje}%* ${mensaje}\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`,
                mentions: [sender, target]
            },
            { quoted: msg }
        );
    }
};