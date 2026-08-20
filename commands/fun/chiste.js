// commands/fun/chiste.js
export default {
    nombre: 'chiste',
    categoria: 'Diversión',
    alias: ['chistes'],
    descripcion: 'Cuenta un chiste aleatorio',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const chistes = [
                '¿Qué le dice un taco a otro? ¿Vamos a la fiesta? ¡No, estamos en la salsa!',
                '¿Cuál es el animal más antiguo? La cebra, porque está en blanco y negro.',
                '¿Qué hace una abeja en el gimnasio? ¡Zum-ba!',
                '¿Cómo se llama el campeón de buceo japonés? Tokofondo.',
                '¿Por qué los pájaros no usan Facebook? Porque ya tienen Twitter.',
                '¿Qué le dice un 0 a un 8? ¡Bonito cinturón!',
                '¿Cuál es el café más peligroso? El expreso.',
                '¿Qué le dice un semáforo a otro? No me mires, estoy cambiando.'
            ];

            const random = chistes[Math.floor(Math.random() * chistes.length)];
            const respuesta = `
╭〔 😂 𝐂𝐇𝐈𝐒𝐓𝐄 〕⬣
┃
┃ ${random}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta);

        } catch (error) {
            console.error('[CHISTE] Error:', error);
            await responder.texto('❌ Error al obtener chiste.');
        }
    }
};