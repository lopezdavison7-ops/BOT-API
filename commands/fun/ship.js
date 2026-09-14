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

        // ---------- OBTENER NOMBRES ----------
        const n1 = sender.split('@')[0].split(':')[0];
        const n2 = target.split('@')[0].split(':')[0];
        
        let nombre1 = msg.pushName || n1;
        let nombre2 = n2;
        try {
            const contact = await s.getContact?.(target);
            if (contact?.name) nombre2 = contact.name;
            else if (contact?.notify) nombre2 = contact.notify;
        } catch {}

        // ---------- SUBIR FOTO A TELEGRAPH ----------
        async function subirFoto(jid) {
            const FALLBACK = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            
            try {
                // Obtener foto de perfil
                const url = await Promise.race([
                    s.profilePictureUrl(jid, 'image'),
                    new Promise((_, reject) => setTimeout(() => reject('timeout'), 2000))
                ]);
                
                if (!url) return FALLBACK;
                
                // Descargar la imagen
                const response = await fetch(url);
                if (!response.ok) return FALLBACK;
                
                const buffer = Buffer.from(await response.arrayBuffer());
                
                // Subir a telegra.ph
                const FormData = (await import('form-data')).default;
                const form = new FormData();
                form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
                
                const uploadResponse = await fetch('https://telegra.ph/upload', {
                    method: 'POST',
                    body: form
                });
                
                if (!uploadResponse.ok) return FALLBACK;
                
                const uploadResult = await uploadResponse.json();
                
                if (uploadResult && uploadResult[0] && uploadResult[0].src) {
                    return 'https://telegra.ph' + uploadResult[0].src;
                }
                
                return FALLBACK;
                
            } catch (e) {
                console.error('[SHIP] Error subiendo foto:', e.message);
                return FALLBACK;
            }
        }

        // Subir ambas fotos en paralelo
        const [pp1, pp2] = await Promise.all([
            subirFoto(sender),
            subirFoto(target)
        ]);

        const porcentaje = Math.floor(Math.random() * 101);

        const mensaje = porcentaje >= 90 ? '💍 BODA' :
                       porcentaje >= 75 ? '💕 AMOR' :
                       porcentaje >= 60 ? '💖 QUÍMICA' :
                       porcentaje >= 40 ? '💗 TAL VEZ' :
                       porcentaje >= 25 ? '🤔 AMIGOS' :
                       porcentaje >= 10 ? '💀 NO' : '⚰️ RIP';

        // URL de la API con fotos públicas
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