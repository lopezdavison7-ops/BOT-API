import { esGrupo, verificarPermisosAdmin, obtenerObjetivo } from '../lib/grupos.js';

export default {
    nombre: 'kick',
    alias: ['expulsar', 'ban'],
    descripcion: 'Expulsa a alguien del grupo. Menciónalo, responde su mensaje, o pon su número. Uso: .kick @usuario',
    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;
        if (!esGrupo(chatId)) return responder.texto('Este comando solo funciona dentro de un grupo.');

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const objetivo = obtenerObjetivo(msg, argumento);
        if (!objetivo) return responder.texto('Menciona a alguien, responde su mensaje, o pon su número. Ej: .kick 50499999999');

        try {
            await sock.groupParticipantsUpdate(chatId, [objetivo], 'remove');
            await responder.texto(`✅ Usuario expulsado.`);
        } catch (e) {
            await responder.texto('⚠️ No se pudo expulsar (puede que ya no esté en el grupo o sea admin).');
        }
    }
};
