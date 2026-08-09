// ============================================================
// SISTEMA OWNER - ALEX BOT
// ============================================================

const OWNER_NUMBER = '50578391933';

function limpiarNumero(valor = '') {
    return String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

export function esOwner(msg) {
    const key = msg?.key || {};

    // Baileys puede entregar el número real mediante senderPn
    const candidatos = [
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ];

    for (const candidato of candidatos) {
        const numero = limpiarNumero(candidato);

        if (numero === OWNER_NUMBER) {
            return true;
        }
    }

    return false;
}

export function obtenerOwner() {
    return OWNER_NUMBER;
}
