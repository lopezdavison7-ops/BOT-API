// lib/resolverJid.js
// ============================================================
// RESOLVER JID (LID -> número real)
// ============================================================
// Cuando mencionas a alguien en un grupo, WhatsApp casi siempre
// entrega un @lid (identificador interno de la sesión) en vez
// del número real (@s.whatsapp.net). Eso es un problema en
// cualquier comando que GUARDE ese JID para compararlo después
// contra mensajes futuros de esa persona (ej: TTT esperando su
// turno, Preguntas Hot esperando su respuesta) — porque los
// mensajes futuros de esa persona sí llegan con su JID normal,
// y nunca va a coincidir con el @lid que se guardó.
//
// Esta función devuelve el JID ya resuelto a @s.whatsapp.net
// cuando es posible. Si no logra resolverlo (no está en un
// grupo, o WhatsApp no dio el mapping todavía), devuelve el
// JID original tal cual — mejor eso que reventar.
// ============================================================

import { jidNormalizedUser } from 'baileys';

function identificadoresDe(participante) {
    if (typeof participante === 'string') return [participante];

    return [
        participante?.id,
        participante?.jid,
        participante?.phoneNumber,
        participante?.lid,
        participante?.participant
    ].filter(Boolean);
}

async function resolverPorGroupMetadata(sock, grupoJid, objetivoJid) {
    if (!grupoJid || !grupoJid.endsWith('@g.us')) return null;

    try {
        const metadata = await sock.groupMetadata(grupoJid);
        const participantes = metadata?.participants || [];

        const objetivoNumero = String(objetivoJid).split('@')[0].split(':')[0];

        for (const participante of participantes) {
            const ids = identificadoresDe(participante);

            const coincide = ids.some(id =>
                String(id).split('@')[0].split(':')[0] === objetivoNumero
            );

            if (!coincide) continue;

            const phoneNumber =
                typeof participante === 'object' ? participante?.phoneNumber : null;

            if (phoneNumber && phoneNumber.includes('@')) {
                return jidNormalizedUser(phoneNumber);
            }
        }
    } catch (error) {
        console.error('[RESOLVER-JID] Error leyendo groupMetadata:', error?.message || error);
    }

    return null;
}

async function resolverPorLidMapping(sock, jid) {
    if (!jid?.endsWith('@lid')) return null;

    const mapping = sock?.signalRepository?.lidMapping;
    if (!mapping || typeof mapping.getPNForLID !== 'function') return null;

    try {
        const resultado = await mapping.getPNForLID(jid);
        if (!resultado) return null;

        return String(resultado).includes('@')
            ? jidNormalizedUser(resultado)
            : `${String(resultado).replace(/\D/g, '')}@s.whatsapp.net`;

    } catch (error) {
        console.error('[RESOLVER-JID] Error resolviendo LID:', error?.message || error);
        return null;
    }
}

// ============================================================
// API PÚBLICA
// ============================================================
// resolverJidReal(sock, grupoJid, jid) -> Promise<string>
//
// - Si `jid` ya es @s.whatsapp.net, lo devuelve tal cual.
// - Si es @lid, intenta resolverlo (primero por groupMetadata,
//   más confiable en grupos; si no, por el mapping de sesión).
// - Si no logra resolverlo, devuelve el JID original sin tocar
//   (para que el comando que lo llama siga funcionando, aunque
//   sea con el riesgo original — nunca deja el valor vacío).
// ============================================================
export async function resolverJidReal(sock, grupoJid, jid) {
    if (!jid) return jid;

    if (jid.endsWith('@s.whatsapp.net')) return jid;

    if (!jid.endsWith('@lid')) return jid;

    const porGrupo = await resolverPorGroupMetadata(sock, grupoJid, jid);
    if (porGrupo) return porGrupo;

    const porMapping = await resolverPorLidMapping(sock, jid);
    if (porMapping) return porMapping;

    return jid;
}
