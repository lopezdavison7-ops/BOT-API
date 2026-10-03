export default {
    nombre: 'hidentag',
    categoria: 'Grupos',
    alias: ['hidetag', 'oculta', 'mentionall', 'invisibletag'],
    descripcion: 'Menciona a todos de forma oculta con tu mensaje',
    uso: '.hidentag <mensaje>',
    soloAdmin: true,

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup }) => {
        if (!isGroup) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Este comando solo\n' +
                '┃    funciona en grupos\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const mensaje = String(argumento || '').trim();

        if (!mensaje) {
            return await responder.texto(
                '╭━━〔 👻 𝐇𝐈𝐃𝐄𝐍𝐓𝐀𝐆 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el mensaje\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .hidentag Reunión a las 8pm\n' +
                '┃ ➪ .hidentag Nuevo anuncio\n' +
                '┃\n' +
                '┃ 📢 Menciona a todos sin\n' +
                '┃    que se vean los @\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            const metadata = await sock.groupMetadata(jid);
            const participantes = metadata.participants.map(p => p.id);

            if (participantes.length === 0) {
                return await responder.texto('❌ No se pudieron obtener los participantes');
            }

            const mencionesOcultas = participantes.join(' ');

            await sock.sendMessage(jid, {
                text: mensaje + '\n\n' + mencionesOcultas,
                mentions: participantes
            }, { quoted: msg });

        } catch (error) {
            console.error('[HIDENTAG] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ No se pudo mencionar\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};