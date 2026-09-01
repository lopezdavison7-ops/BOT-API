// ============================================
// 🔞 COMANDO NSFW - COMPLETO
// ============================================

// <--- PEGA TU JSON AQUÍ (el que me pasaste con todas las categorías)
const nsfwData = {
    // Ejemplo:
    spank: [
        "https://cdn.yuki-wabot.my.id/files/1Sve.mp4",
        "https://cdn.yuki-wabot.my.id/files/b8M6.mp4"
    ]
    // ... pega todo tu JSON aquí
};
// <--- HASTA AQUÍ

export default {
    nombre: 'nsfw',
    categoria: 'Diversión',
    alias: ['porno', 'xxx', 'hot', '18', 'adulto'],
    descripcion: 'Contenido +18 (solo para adultos)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const args = String(argumento || '').trim().toLowerCase();
            const categorias = Object.keys(nsfwData);
            
            // Si no hay categoría, mostrar lista
            if (!args || !nsfwData[args]) {
                await responder.texto(
                    `🔞 *NSFW - CATEGORÍAS*\n\n` +
                    `📌 *Disponibles:*\n` +
                    `${categorias.map(c => `• .nsfw ${c}`).join('\n')}\n\n` +
                    `⚠️ *Solo para mayores de 18 años*`
                );
                return;
            }

            // Seleccionar video aleatorio
            const videos = nsfwData[args];
            const random = videos[Math.floor(Math.random() * videos.length)];

            // Enviar el video
            await responder.texto(
                `🔞 *${args.toUpperCase()}*\n\n` +
                `📌 *Video ${videos.indexOf(random) + 1} de ${videos.length}*`
            );
            
            await responder.video(random);

        } catch (error) {
            console.error('[NSFW] Error:', error);
            await responder.texto('❌ Error al enviar el contenido.');
        }
    }
};