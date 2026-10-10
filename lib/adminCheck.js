import { obtenerMetadata } from './grupos.js';
import { identificadoresDe } from './resolverJid.js';

const _adminCache = new Map();

function numerosDe(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function adminsDe(metadata) {
    const cacheado = _adminCache.get(metadata);
    if (cacheado) return cacheado;

    const admins = new Set();
    for (const p of metadata.participants || []) {
        if (!p.admin) continue;
        for (const id of identificadoresDe(p)) {
            const n = numerosDe(id);
            if (n) admins.add(n);
        }
    }

    _adminCache.set(metadata, admins);

    if (_adminCache.size > 500) {
        _adminCache.delete(_adminCache.keys().next().value);
    }

    return admins;
}

export async function esAdminGrupo(sock, msg, jid) {
    try {
        const dueno = String(process.env.OWNER || '50578391933')
            .split(',')
            .map(n => n.replace(/\D/g, ''))
            .filter(Boolean);

        const nums = [
            msg.key?.senderPn,
            msg.key?.participantAlt,
            msg.key?.participant,
            msg.key?.remoteJid
        ]
            .map(numerosDe)
            .filter(Boolean);

        if (nums.some(n => dueno.includes(n))) return true;

        const meta = await obtenerMetadata(sock, jid);
        if (!meta) return false;

        const admins = adminsDe(meta);

        if (nums.some(n => admins.has(n))) return true;

        if (msg.key?.participant?.endsWith('@lid')) {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn =
                    await sock.signalRepository.lidMapper.getPNForLid(
                        msg.key.participant
                    );
                if (pn) {
                    const n = numerosDe(pn);
                    if (n && (admins.has(n) || dueno.includes(n))) return true;
                }
            }
        }
    } catch {}

    return false;
}
