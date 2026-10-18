// ════════════════════════════════════════════════════════════════
//  commands/grupos/add.js
// ════════════════════════════════════════════════════════════════
import {
    esGrupo, verificarPermisosAdmin, partirNumeros,
    resolverNumero, resolverParticipante, invitarAlGrupo, limpiarJid
} from '../../lib/grupos.js';

export default {
    nombre: 'add',
    categoria: 'grupos',
    alias: ['agregar', 'invitar'],
    descripcion: 'Agrega uno o varios números al grupo. Uso: .add 50577455383',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        if (!esGrupo(chatId)) {
            return responder.texto('❌ Este comando solo funciona dentro de un grupo.');
        }

        const permiso = await verificarPermisosAdmin(sock, msg, chatId);
        if (!permiso.ok) return responder.texto(permiso.motivo);

        const entradas = partirNumeros(argumento);
        if (!entradas.length) {
            return responder.texto(
                '⚠️ Pasame el número con código de país.\n\n' +
                'Ejemplo: *.add 50577455383*\n' +
                'También acepta varios: *.add 50577455383 50588887777*'
            );
        }

        await responder.texto(`⏳ Agregando *${entradas.length}* número(s)...`);

        const meta = permiso.meta;
        const yo = limpiarJid(sock.user?.id);
        const agregados = [], invitados = [], yaEstaban = [], fallidos = [];

        for (const entrada of entradas) {
            try {
                const objetivo = await resolverNumero(sock, entrada);

                if (!objetivo) {
                    fallidos.push(`+${entrada.replace(/\D/g, '')}`);
                    continue;
                }

                const ya = await resolverParticipante(sock, meta, objetivo.pn);
                if (ya) { yaEstaban.push(`+${objetivo.pn.split('@')[0]}`); continue; }

                if (limpiarJid(objetivo.pn) === yo) { yaEstaban.push('el bot'); continue; }

                const res = await sock.groupParticipantsUpdate(chatId, [objetivo.pn], 'add');
                const status = String(res?.[0]?.status ?? '200');

                if (status === '200') {
                    agregados.push(`+${objetivo.pn.split('@')[0]}`);
                } else if (['403', '408', '409'].includes(status)) {
                    // privacidad: le mandamos la invitación directa
                    await invitarAlGrupo(sock, chatId, objetivo.pn, meta);
                    invitados.push(`+${objetivo.pn.split('@')[0]}`);
                } else {
                    fallidos.push(`+${objetivo.pn.split('@')[0]} (${status})`);
                }

                await new Promise(r => setTimeout(r, 600));
            } catch (error) {
                console.error('[ADD]', error?.stack || error?.message || error);
                fallidos.push(`+${String(entrada).replace(/\D/g, '')}`);
            }
        }

        let salida = '📋 *Resultado*';

        if (agregados.length)  salida += `\n\n✅ *Agregados* (${agregados.length}):\n${agregados.map(x => '• ' + x).join('\n')}`;
        if (invitados.length)  salida += `\n\n📩 *Invitación enviada* (${invitados.length}):\n${invitados.map(x => '• ' + x).join('\n')}\n_Tienen la privacidad cerrada, deben aceptar la invitación._`;
        if (yaEstaban.length)  salida += `\n\nℹ️ *Ya estaban* (${yaEstaban.length}):\n${yaEstaban.map(x => '• ' + x).join('\n')}`;
        if (fallidos.length)   salida += `\n\n⚠️ *No se pudieron* (${fallidos.length}):\n${fallidos.map(x => '• ' + x).join('\n')}`;

        await responder.texto(salida);
    }
};