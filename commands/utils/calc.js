// commands/utils/calc.js
export default {
    nombre: 'calc',
    categoria: 'Utilidades',
    alias: ['calculadora'],
    descripcion: 'Realiza operaciones básicas (+, -, *, /)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const operacion = String(argumento || '').trim();
            if (!operacion) {
                await responder.texto(
                    `❌ *CALCULADORA*\n\n` +
                    `Escribe una operación.\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.calc 5 + 3*\n` +
                    `*.calc 10 / 2*`
                );
                return;
            }

            // Validar solo números y operadores básicos
            if (!/^[0-9+\-*/().\s]+$/.test(operacion)) {
                await responder.texto('❌ Solo números y operadores (+, -, *, /)');
                return;
            }

            const resultado = eval(operacion);
            if (!isFinite(resultado)) {
                await responder.texto('❌ Operación inválida (división entre cero?)');
                return;
            }

            const respuesta = `
╭〔 🧮 𝐂𝐀𝐋𝐂𝐔𝐋𝐀𝐃𝐎𝐑𝐀 〕⬣
┃
┃ ${operacion} = **${resultado}**
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[CALC] Error:', error);
            await responder.texto('❌ Error en la operación.');
        }
    }
};