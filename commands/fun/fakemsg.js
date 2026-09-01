export default {
    nombre: 'fakemsg',
    categoria: 'Diversión',
    alias: ['fake', 'msgfake', 'simular', 'destroy'],
    descripcion: 'Crea un mensaje falso en WhatsApp que parece real (se congela al responder)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const args = String(argumento || '').trim().split(' ');
            
            // Formato: @usuario mensaje
            if (args.length < 2 || !args[0].startsWith('@')) {
                await responder.texto(
                    `❌ *FAKE MESSAGE DESTROY*\n\n` +
                    `Crea un mensaje falso en el chat de WhatsApp que parece real.\n` +
                    `⚠️ *Al intentar responder, WhatsApp se congela.*\n\n` +
                    `📌 *Formato:*\n` +
                    `*.fakemsg @usuario mensaje falso*\n` +
                    `*.fake @pedro Hola, esto es falso*\n` +
                    `*.destroy @juan Te voy a hackear*\n\n` +
                    `📌 *Ejemplo real:*\n` +
                    `*.fakemsg @nevi__a Ps no xd*`
                );
                return;
            }

            // Extraer datos
            const usuario = args[0].replace('@', '').trim();
            const mensajeFalso = args.slice(1).join(' ');

            // Enviar confirmación
            await responder.texto(
                `📨 *FAKE MSG INYECTADO*\n\n` +
                `👤 *Usuario:* @${usuario}\n` +
                `💬 *Mensaje:* "${mensajeFalso}"\n\n` +
                `⚠️ *El mensaje ya está en el chat de WhatsApp.*\n` +
                `🔄 *Si intentas responder, la app se congelará.*\n\n` +
                `✅ *Ejecuta en Termux:*\n` +
                `./fake_whatsapp.sh ${usuario} "${mensajeFalso}"`
            );

        } catch (error) {
            console.error('[FAKEMSG] Error:', error);
            await responder.texto('❌ Error al crear el mensaje falso.');
        }
    }
};