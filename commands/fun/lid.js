// commands/fun/lid.js
export default {
    nombre: 'lid',
    categoria: 'Diversión',
    alias: ['lo inocente de'],
    descripcion: 'El bot se inocente de ti o de alguien más',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const inocentes = [
                '¡Yo no fui! Yo solo soy un bot, no tengo capacidad de hacer travesuras 😇',
                '¿Yo? ¡Jamás! Soy demasiado bueno para eso 🙏',
                'No me metas en eso, yo solo respondo mensajes 😅',
                '¡Inocente como un cordero! 🐑',
                'Yo no hice nada, estaba dormido cuando pasó eso 💤',
                '¡Que conste que yo no tuve nada que ver! 🙈',
                'Soy un bot de paz, no conflicto ✌️',
                'No fue mi culpa, fue el WiFi que se portó mal 📶',
                '¡Yo solo soy el mensajero! No me disparén 🏳️',
                'Inocente hasta que se demuestre lo contrario ⚖️',
                '¿En serio creen que fui yo? ¡Soy más Responsable que eso! 😤',
                'No me culpen a mí, yo solo ejecuto comandos 🤖'
            ];

            const random = inocentes[Math.floor(Math.random() * inocentes.length)];
            
            let respuesta = '';
            
            if (argumento) {
                respuesta = `
╭〔 😇 𝐋𝐎 𝐈𝐍𝐎𝐂𝐄𝐍𝐓𝐄 𝐃𝐄 〕⬣
┃
┃ ${argumento}
┃
┃ ${random}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;
            } else {
                respuesta = `
╭〔 😇 𝐋𝐎 𝐈𝐍𝐎𝐂𝐄𝐍𝐓𝐄 𝐃𝐄 〕⬣
┃
┃ ${random}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;
            }
            
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[LID] Error:', error);
            await responder.texto('❌ Error al ejecutar el comando lid.');
        }
    }
};
