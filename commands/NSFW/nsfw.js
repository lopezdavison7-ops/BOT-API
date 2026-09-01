export default {
    nombre: 'nsfw',
    categoria: 'NSFW',
    alias: Object.keys(nsfwData),
    descripcion: 'Envía videos NSFW (spank, blowjob, 69, etc.)',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            // Usamos directamente el comando que el bot detectó
            const cmd = String(msg.command || '').toLowerCase();
            
            if (!nsfwData[cmd]) {
                await responder.texto('❌ Comando NSFW no reconocido.');
                return;
            }

            const urls = nsfwData[cmd];
            const randomUrl = urls[Math.floor(Math.random() * urls.length)];
            const isImage = randomUrl.endsWith('.jpeg') || randomUrl.endsWith('.jpg') || randomUrl.endsWith('.png');

            // Obtener usuario y mencionado
            const sender = msg.sender || msg.key.participant;
            const senderTag = `@${sender.split('@')[0]}`;

            let target = null;
            if (msg.mentionedJid && msg.mentionedJid.length > 0) {
                target = msg.mentionedJid[0];
            } else if (msg.quoted && msg.quoted.sender) {
                target = msg.quoted.sender;
            }

            let captionText = '';
            let mentionsArr = [sender];

            if (target && target !== sender) {
                const targetTag = `@${target.split('@')[0]}`;
                captionText = messages[cmd].target.replace('@user1', senderTag).replace('@user2', targetTag);
                mentionsArr.push(target);
            } else {
                captionText = messages[cmd].solo.replace('@user1', senderTag);
            }

            const content = isImage 
                ? { image: { url: randomUrl }, caption: captionText, mentions: mentionsArr }
                : { video: { url: randomUrl }, gifPlayback: true, caption: captionText, mentions: mentionsArr };

            await sock.sendMessage(msg.chat, content, { quoted: msg });

        } catch (error) {
            console.error('[NSFW] Error:', error);
            await responder.texto('❌ Error al ejecutar el comando NSFW.');
        }
    }
};