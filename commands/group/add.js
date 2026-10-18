import { esGrupo, verificarPermisosAdmin } from '../../lib/grupos.js';

const ESPERA = (ms) => new Promise((r) => setTimeout(r, ms));

// WhatsApp no aguanta que le tires 500 números de un saque: va por tandas.
const TANDA = 40;
const PAUSA = 1200;

const limpiar = (n) => String(n).replace(/\D/g, '');

export default {
    nombre: 'tumbar',
    categoria: 'grupos',
    alias: ['golpe', 'massadd', 'invadir'],
    descripcion:
        'Mete números al grupo de un solo golpe para que WhatsApp lo mande a revisión / no disponible. ' +
        'Uso: .tumbar 50411111111 50422222222 ...',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        if (!esGrupo(chatId)) {
            return responder.texto('❌ Este comando solo funciona dentro de un grupo.');
        }

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const numeros = (argumento || '')
            .split(/[\s,;+]+/)
            .map(limpiar)
            .filter((n) => n.length >= 8 && n.length <= 15);

        if (!numeros.length) {
            return responder.texto(
                '⚠️ Pasame los números que querés meter, separados por espacio o coma.\n\n' +
                'Ej: .tumbar 50411111111 50422222222 50433333333'
            );
        }

        const jids = [...new Set(numeros)].map((n) => `${n}@s.whatsapp.net`);

        await responder.texto(`💥 Metiendo *${jids.length}* números de un solo...`);

        let metidos = 0;
        const fallidos = [];

        for (let i = 0; i < jids.length; i += TANDA) {
            const tanda = jids.slice(i, i + TANDA);

            try {
                const res = await sock.groupParticipantsUpdate(chatId, tanda, 'add');

                for (const r of res || []) {
                    const status = Number(r?.status ?? r?.content?.status ?? 200);
                    if (status === 200) metidos++;
                    else fallidos.push(r?.jid || r?.content?.jid || '?');
                }
            } catch (error) {
                console.error('[TUMBAR] Tanda falló:', error?.message || error);
                // Reintento 1x1 para no perder ninguno
                for (const jid of tanda) {
                    try {
                        await sock.groupParticipantsUpdate(chatId, [jid], 'add');
                        metidos++;
                    } catch {
                        fallidos.push(jid);
                    }
                    await ESPERA(400);
                }
            }

            await ESPERA(PAUSA);
        }

        await responder.texto(
            `☠️ *GOLPE TERMINADO*\n\n` +
            `┃ Metidos: *${metidos}*\n` +
            (fallidos.length ? `┃ Sin WhatsApp / ya estaban: *${fallidos.length}*\n` : '') +
            `\n💡 Mientras más números entren de golpe, más chance de que WhatsApp lo marque *en revisión* y lo tumbe.`
        );
    }
};