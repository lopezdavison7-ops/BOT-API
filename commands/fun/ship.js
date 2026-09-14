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

        // ---------- OBTENER NOMBREALES ----------
        const n1 = sender.split('@')[0].split(':')[0];
        const n2 = target.split('@')[0].split(':')[0];
        
        // Nombre del sender (quien ejecutó el comando)
        let nombre1 = msg.pushName || n1;
        
        // Nombre del target (intentar obtener de contactos)
        let nombre2 = n2;
        try {
            const contact = await s.getContact?.(target);
            if (contact?.name) nombre2 = contact.name;
            else if (contact?.notify) nombre2 = contact.notify;
        } catch {}

        // ---------- OBTENER FOTOS ----------
        const FALLBACK_IMG = 'https://i.ibb.co/3Fh9wXp/default.png';
        
        async function getFoto(jid) {
            try {
                // Intentar obtener foto con timeout corto
                const url = await Promise.race([
                    s.profilePictureUrl(jid, 'image'),
                    new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
                ]);
                return url || FALLBACK_IMG;
            } catch (e) {
                console.error('[SHIP] Error obteniendo foto de', jid, ':', e.message);
                return FALLBACK_IMG;
            }
        }

        const [pp1, pp2] = await Promise.all([
            getFoto(sender),
            getFoto(target)
        ]);

        const porcentaje = Math.floor(Math.random() * 101);

        // Mensajes CORTOS para que no tapen las fotos
        const mensaje = porcentaje >= 90 ? '💍 BODA' :
                       porcentaje >= 75 ? '💕 AMOR' :
                       porcentaje >= 60 ? '💖 QUÍMICA' :
                       porcentaje >= 40 ? '💗 TAL VEZ' :
                       porcentaje >= 25 ? '🤔 AMIGOS' :
                       porcentaje >= 10 ? '💀 NO' : '⚰️ RIP';

        // URL de la API
        const apiUrl = `https://api.delirius.online/canvas/ship?` +
            `image1=${encodeURIComponent(pp1)}` +
            `&image2=${encodeURIComponent(pp2)}` +
            `&name1=${encodeURIComponent(nombre1)}` +
            `&name2=${encodeURIComponent(nombre2)}` +
            `&percentage=${porcentaje}` +
            `&text=${encodeURIComponent(mensaje)}`;

        const caption = 
            `╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n` +
            `┃\n` +
            `┃ 💑 *${nombre1}* + *${nombre2}*\n` +
            `┃\n` +
            `┃ 📊 *${porcentaje}%* ${mensaje}\n` +
            `┃\n` +
            `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;

        await s.sendMessage(
            chatJid,
            { 
                image: { url: apiUrl },
                caption,
                mentions: [sender, target]
            },
            { quoted: msg }
        );
    }
};