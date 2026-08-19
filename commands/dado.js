// commands/dado.js
export default {
    nombre: 'dado',
    categoria: 'Diversión',
    alias: ['dados'],
    descripcion: 'Tira un dado de 6 caras',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const caras = parseInt(argumento) || 6;
            if (caras < 2 || caras > 100) {
                await responder.texto('❌ El dado debe tener entre 2 y 100 caras.');
                return;
            }

            const resultado = Math.floor(Math.random() * caras) + 1;
            const respuesta = `
╭〔 🎲 𝐃𝐀𝐃𝐎 〕⬣
┃
┃ Dado de **${caras}** caras
┃
┃ Resultado: **${resultado}** 🎯
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[DADO] Error:', error);
            await responder.texto('❌ Error al tirar el dado.');
        }
    }
};