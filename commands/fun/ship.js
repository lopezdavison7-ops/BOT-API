// commands/fun/ship.js
// ============================================================
// BOT-API — SHIP (Canvas via Delirius API - ULTRA RÁPIDO)
// ============================================================
export default {
    nombre: 'ship',
    categoria: 'Fun',
    alias: ['pareja', 'amor', 'compatibilidad'],
    descripcion: 'Calcula compatibilidad con imagen generada',
    uso: '.ship @persona o responde a un mensaje',
    ejecutar: async ({ msg, argumento, responder, sock }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0] || Object.values(global.conns)[0];
        const sender = msg.key.participant || msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;

        // Detectar target (respuesta o mención)
        let target = null;
        let nombre1 = msg.pushName || 'Tú';
        let nombre2 = 'Usuario';

        const quoted = ctx?.quotedMessage;
        if (quoted) {
            target = ctx.participant;
            // Intentar obtener nombre del citado
            try {
                const contact = await s.getContact?.(target);
                if (contact?.name) nombre2 = contact.name;
                else nombre2 = target.split('@')[0];
            } catch { nombre2 = target.split('@')[0]; }
        } else {
            const mencionados = ctx?.mentionedJid || [];
            if (mencionados.length > 0) {
                target = mencionados[0];
                try {
                    const contact = await s.getContact?.(target);
                    if (contact?.name) nombre2 = contact.name;
                    else nombre2 = target.split('@')[0];
                } catch { nombre2 = target.split('@')[0]; }
            }
        }

        if (!target) {
            return responder.texto(
                '╭━━〔 💘 𝐒𝐇𝐈𝐏 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la otra persona\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .ship @persona\n' +
                '┃ • Responde a un mensaje\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Generar porcentaje una sola vez
        const porcentaje = Math.floor(Math.random() * 101);
        
        // Mensaje según porcentaje
        let mensaje = '';
        let emoji = '';
        if (porcentaje >= 90) { mensaje = '✨ ALMA GEMELA'; emoji = '💍'; }
        else if (porcentaje >= 75) { mensaje = '💕 PERFECTOS JUNTOS'; emoji = '💑'; }
        else if (porcentaje >= 50) { mensaje = '💖 HAY QUÍMICA'; emoji = '💞'; }
        else if (porcentaje >= 25) { mensaje = '💭 TAL VEZ...'; emoji = '🤔'; }
        else { mensaje = '💀 F EN EL CHAT'; emoji = '❌'; }

        try {
            // Obtener fotos de perfil (rápido, con fallback)
            let pp1 = 'https://i.ibb.co/3Fh9wXp/default.png';
            let pp2 = 'https://i.ibb.co/3Fh9wXp/default.png';

            try { pp1 = await s.profilePictureUrl(sender, 'image'); } catch {}
            try { pp2 = await s.profilePictureUrl(target, 'image'); } catch {}

            // Llamar a Delirius API /canvas/ship
            const apiUrl = `https://api.delirius.online/canvas/ship?` +
                `image1=${encodeURIComponent(pp1)}` +
                `&image2=${encodeURIComponent(pp2)}` +
                `&name1=${encodeURIComponent(nombre1)}` +
                `&name2=${encodeURIComponent(nombre2)}` +
                `&percentage=${porcentaje}` +
                `&text=${encodeURIComponent(mensaje)}`;

            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];

            const caption =
                '╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 💑 @' + n1 + ' + @' + n2 + '\n' +
                '┃\n' +
                '┃ 📊 Compatibilidad: *' + porcentaje + '%*\n' +
                '┃ ' + emoji + ' ' + mensaje + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await s.sendMessage(
                chatJid,
                { image: { url: apiUrl }, caption, mentions: [sender, target] },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[SHIP] Error:', error?.message || error);

            // Fallback rápido: texto con barra
            const n1 = sender.split('@')[0];
            const n2 = target.split('@')[0];
            const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10));

            await s.sendMessage(
                chatJid,
                {
                    text:
                        '╭━━〔 💘 𝐒𝐇𝐈𝐏𝐏𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 💑 @' + n1 + ' + @' + n2 + '\n' +
                        '┃\n' +
                        '┃ 📊 Compatibilidad: *' + porcentaje + '%*\n' +
                        '┃ ' + barra + '\n' +
                        '┃\n' +
                        '┃ ' + emoji + ' ' + mensaje + '\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
                    mentions: [sender, target]
                },
                { quoted: msg }
            );
        }
    }
};