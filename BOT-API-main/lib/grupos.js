

import NodeCache from 'node-cache';
import { identificadoresDe } from './resolverJid.js';

export function esGrupo(chatId) {
    return Boolean(chatId?.endsWith('@g.us'));
}

const cacheMetadata = new NodeCache({ stdTTL: 300, checkperiod: 120 });

export function invalidarMetadata(chatId) {
    if (chatId) cacheMetadata.del(chatId);
}

export async function obtenerMetadata(sock, chatId, forzar = false) {
    if (!forzar) {
        const cacheado = cacheMetadata.get(chatId);
        if (cacheado) return cacheado;
    }

    try {
        const metadata = await sock.groupMetadata(chatId);
        cacheMetadata.set(chatId, metadata);
        return metadata;
    } catch (error) {
        console.error(
            '[GRUPOS] Error obteniendo metadata:',
            error?.message || error
        );

        return null;
    }
}

function limpiarJid(jid) {
    if (!jid) return '';

    return String(jid)
        .split(':')[0]
        .replace(/[^0-9@.]/g, '');
}

function obtenerNumero(jid) {
    return limpiarJid(jid)
        .split('@')[0]
        .replace(/\D/g, '');
}

export function esParticipanteAdmin(metadata, jid) {
    if (!metadata || !jid) return false;

    const numeroBuscado = obtenerNumero(jid);

    if (!numeroBuscado) return false;

    const participante = metadata.participants?.find(p => {
        const numeros = identificadoresDe(p).map(obtenerNumero);
        return numeros.includes(numeroBuscado);
    });

    if (!participante) {
        return false;
    }

    return (
        participante.admin === 'admin' ||
        participante.admin === 'superadmin'
    );
}

function obtenerJidsBot(sock) {
    const jids = new Set();

    if (sock.user?.id) {
        jids.add(limpiarJid(sock.user.id));
    }

    if (sock.user?.id) {
        const numero = obtenerNumero(sock.user.id);

        if (numero) {
            jids.add(`${numero}@s.whatsapp.net`);
        }
    }

    if (sock.user?.lid) {
        jids.add(limpiarJid(sock.user.lid));
    }

    return [...jids].filter(Boolean);
}

function botEsAdministrador(sock, metadata) {
    if (!metadata?.participants?.length) {
        return false;
    }

    const botJids = obtenerJidsBot(sock);

    for (const botJid of botJids) {
        const participante = metadata.participants.find(
            p => limpiarJid(p.id) === botJid
        );

        if (
            participante &&
            (
                participante.admin === 'admin' ||
                participante.admin === 'superadmin'
            )
        ) {
            return true;
        }
    }

    for (const botJid of botJids) {
        if (esParticipanteAdmin(metadata, botJid)) {
            return true;
        }
    }

    return false;
}

export async function verificarPermisosAdmin(
    sock,
    msg,
    chatId
) {
    const metadata = await obtenerMetadata(
        sock,
        chatId
    );

    if (!metadata) {
        return {
            ok: false,
            motivo:
                '❌ No se pudo leer la información del grupo.'
        };
    }

    const remitente = limpiarJid(
        msg.key.participant ||
        msg.key.remoteJid
    );

    const ownerNumero =
        process.env.OWNER?.replace(/\D/g, '');

    const remitenteNumero =
        obtenerNumero(remitente);

    const esOwner =
        Boolean(
            ownerNumero &&
            remitenteNumero === ownerNumero
        );

    const senderEsAdmin =
        esParticipanteAdmin(
            metadata,
            remitente
        ) || esOwner;

    const botAdmin =
        botEsAdministrador(
            sock,
            metadata
        );

    if (!senderEsAdmin) {
        return {
            ok: false,
            motivo:
                '❌ Este comando es solo para *administradores del grupo*.'
        };
    }

    if (!botAdmin) {
        return {
            ok: false,
            motivo:
                '❌ Necesito ser *administrador del grupo* para poder hacer esto.'
        };
    }

    return {
        ok: true,
        metadata
    };
}

export function obtenerObjetivo(
    msg,
    argumento
) {
    const contexto =
        msg.message?.extendedTextMessage?.contextInfo;

    if (
        contexto?.mentionedJid &&
        contexto.mentionedJid.length > 0
    ) {
        return contexto.mentionedJid[0];
    }

    if (contexto?.participant) {
        return contexto.participant;
    }

    const numero =
        (argumento || '')
            .replace(/\D/g, '');

    if (numero) {
        return `${numero}@s.whatsapp.net`;
    }

    return null;
}
