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
            .map(j => String(j || '').split('@')[0].replace(/\D/g, ''))
            .filter(Boolean);

        if (nums.some(n => dueno.includes(n))) return true;

        const meta = await sock.groupMetadata(jid);

        const admins = (meta.participants || [])
            .filter(p => p.admin)
            .map(p => String(p.id).split('@')[0].replace(/\D/g, ''));

        if (nums.some(n => admins.includes(n))) return true;

        if (msg.key?.participant?.endsWith('@lid')) {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn =
                    await sock.signalRepository.lidMapper.getPNForLid(
                        msg.key.participant
                    );
                if (pn) {
                    const n = String(pn).split('@')[0].replace(/\D/g, '');
                    if (admins.includes(n) || dueno.includes(n)) return true;
                }
            }
        }
    } catch {}

    return false;
}