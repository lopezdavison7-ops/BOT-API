// commands/owner/eval.js
export default {

    nombre: 'eval',

    categoria: 'Owner',

    alias: [
        'evaluar',
        'ev'
    ],

    owner: true,

    descripcion:
        'Evalúa código JavaScript.',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        if (!argumento) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐄𝐕𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe código para evaluar.\n' +
                '┃\n' +
                '┃ 📌 Uso: .eval 1 + 1\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        try {

            const resultado = await eval(argumento);

            let respuesta = String(resultado);

            if (respuesta.length > 3000) {

                respuesta = respuesta.substring(0, 3000) + '\n\n... (truncado)';

            }

            await responder.texto(
                '╭〔 ✅ 𝐄𝐕𝐀𝐋 〕⬣\n' +
                '┃\n' +
                '┃ 📥 *Entrada:*\n' +
                '┃ ```' + argumento + '```\n' +
                '┃\n' +
                '┃ 📤 *Resultado:*\n' +
                '┃ ```' + respuesta + '```\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        } catch (error) {

            await responder.texto(
                '╭〔 ❌ 𝐄𝐕𝐀𝐋 〕⬣\n' +
                '┃\n' +
                '┃ 🚨 *Error:*\n' +
                '┃ ```' + (error.message || String(error)) + '```\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        }
    }
};
