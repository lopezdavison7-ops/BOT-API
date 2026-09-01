export default {
    nombre: 'fakemsg',
    categoria: 'Diversión',
    alias: ['fake', 'msgfake', 'simular'],
    descripcion: 'Crea un mensaje falso en el chat como si lo hubiera enviado otro usuario',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const args = String(argumento || '').trim().split(' ');

            // Validar formato: @usuario mensaje
            if (args.length < 2 || !args[0].startsWith('@')) {
                await responder.texto(
                    `❌ *FAKE MSG*\n\n` +
                    `Crea un mensaje falso que parece enviado por otro usuario.\n\n` +
                    `📌 *Formato:*\n` +
                    `*.fakemsg @usuario mensaje falso*\n` +
                    `*.fake @pedro Hola, soy un mensaje falso*\n\n` +
                    `⚠️ *Advertencia:* Si intentas responder al mensaje, WhatsApp se congelará.`
                );
                return;
            }

            // Extraer usuario y mensaje
            const usuario = args[0]; // @usuario
            const mensajeFalso = args.slice(1).join(' ');

            // Obtener información del usuario mencionado
            const numeroMencionado = usuario.replace('@', '').trim();

            // Construir mensaje falso con formato visual
            const respuesta = `
╭〔 ✉️ 𝐅𝐀𝐊𝐄 𝐌𝐄𝐍𝐒𝐀𝐉𝐄 〕⬣
┃
┃ 👤 *De:* ${usuario}
┃ 📱 *Número:* ${numeroMencionado}
┃
┃ 💬 *Mensaje falso:*
┃ ${mensajeFalso}
┃
┃ ⚠️ *Este mensaje NO existe en servidores de WhatsApp.*
┃ 🔄 Al intentar responder, la app se congelará.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await responder.texto(respuesta);

            // **OPCIONAL:** Enviar el mensaje falso "simulado" como si lo hubiera escrito el usuario
            // Esto solo funciona si tu bot tiene permisos para enviar mensajes como otro (algunos bots soportan spoofing)
            // Si no, solo muestra el aviso.

            // Envío real del mensaje falso (simulado)
            try {
                await responder.texto(
                    `📨 *${usuario}* escribió:\n\n` +
                    `“${mensajeFalso}”\n\n` +
                    `_⚠️ Mensaje falso - No responder_`
                );
            } catch (e) {
                // Si no puede simular, solo muestra la info
            }

        } catch (error) {
            console.error('[FAKEMSG] Error:', error);
            await responder.texto('❌ Error al crear el mensaje falso.');
        }
    }
};