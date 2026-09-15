export default {
    nombre: 'xnxx',
    categoria: 'canvas',
    descripcion: 'Genera una tarjeta estilo XNXX con imagen y título',
    uso: '.xnxx <título> (con foto) | .xnxx <título> <url-imagen>',
    ejemplo: '.xnxx Welcome to Delirius API',
    
    ejecutar: async (sock, msg, args) => {
        const chatId = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        
        // Extraer título de los argumentos
        let titulo = args.join(' ');
        if (!titulo) {
            titulo = 'Welcome to Delirius API 😈';
        }
        
        let imageUrl = '';
        
        // CASO 1: Usuario envió imagen con el comando
        const tipoMensaje = Object.keys(msg.message || {})[0];
        
        if (tipoMensaje === 'imageMessage') {
            // Descargar la imagen que envió el usuario
            try {
                const buffer = await sock.downloadMediaMessage(msg);
                const subida = await uploadToTelegraph(buffer, 'jpg');
                imageUrl = subida;
            } catch (e) {
                console.error('Error descargando imagen:', e);
                return sock.sendMessage(chatId, {
                    text: '❌ Error al procesar la imagen que enviaste.'
                }, { quoted: msg });
            }
        }
        // CASO 2: El mensaje es texto, buscar si hay imagen citada
        else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = msg.message.extendedTextMessage.contextInfo;
            const quotedMsg = quoted.quotedMessage;
            
            if (quotedMsg.imageMessage) {
                try {
                    const fakeMsg = {
                        message: quotedMsg,
                        key: {
                            remoteJid: chatId,
                            fromMe: false,
                            participant: quoted.participant
                        }
                    };
                    const buffer = await sock.downloadMediaMessage(fakeMsg);
                    const subida = await uploadToTelegraph(buffer, 'jpg');
                    imageUrl = subida;
                } catch (e) {
                    console.error('Error descargando imagen citada:', e);
                }
            }
        }
        
        // CASO 3: No hay imagen, usar foto de perfil del usuario
        if (!imageUrl) {
            try {
                const ppUrl = await sock.profilePictureUrl(sender, 'image');
                imageUrl = ppUrl;
            } catch (e) {
                // Si no tiene foto de perfil, usar imagen por defecto
                imageUrl = 'https://telegra.ph/file/66c5ede2293ccf9e53efa.jpg';
            }
        }
        
        // Construir URL de la API
        const apiUrl = `https://api.delirius.online/canvas/xnxxcard?image=${encodeURIComponent(imageUrl)}&title=${encodeURIComponent(titulo)}`;
        
        // Enviar la imagen generada
        await sock.sendMessage(chatId, {
            image: { url: apiUrl },
            caption: `🔥 *XNXX Card*\n\n📝 Título: ${titulo}\n\n⚡ Generado con Delirius API`
        }, { quoted: msg });
    }
};

// Función auxiliar para subir a Telegraph
async function uploadToTelegraph(buffer, extension) {
    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('file', buffer, {
        filename: `image.${extension}`,
        contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`
    });
    
    const response = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: form
    });
    
    const result = await response.json();
    if (result && result[0]) {
        return 'https://telegra.ph' + result[0].src;
    }
    
    throw new Error('No se pudo subir la imagen');
}