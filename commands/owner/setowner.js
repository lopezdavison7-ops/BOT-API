import {
    guardarOwner,
    obtenerOwner,
    obtenerOwners
} from '../../lib/owner.js';

function obtenerObjetivo(msg) {
    const contexto = msg?.message?.extendedTextMessage?.contextInfo;
    const mencionado = contexto?.mentionedJid?.[0];
    if (mencionado) return mencionado;
    const citado = contexto?.participant;
    if (citado) return citado;
    return null;
}

function numeroVisible(jid) {
    return String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

function normalizarJid(jid) {
    if (!jid) return '';
    return String(jid).split(':')[0].replace(/@.*$/, '') + '@s.whatsapp.net';
}

async function esOwner(sock, senderJid) {
    const senderNum = numeroVisible(senderJid);
    console.log(`[SETOWNER-DEBUG] Verificando: ${senderNum} (JID: ${senderJid})`);

    // Owner principal hardcoded (tu número)
    const OWNER_PRINCIPAL = '50368309162'; // RHLM
    if (senderNum === OWNER_PRINCIPAL) {
        console.log(`[SETOWNER-DEBUG] ✅ Es owner principal hardcoded`);
        return true;
    }

    // Verificar lista de owners
    const owners = obtenerOwners() || [];
    console.log(`[SETOWNER-DEBUG] Owners en DB: ${owners.length} →`, owners.map(o => numeroVisible(o)));

    const senderNorm = normalizarJid(senderJid);

    for (const owner of owners) {
        if (normalizarJid(owner) === senderNorm) {
            console.log(`[SETOWNER-DEBUG] ✅ Coincide con owner en DB`);
            return true;
        }
        if (numeroVisible(owner) === senderNum && senderNum.length >= 8) {
            console.log(`[SETOWNER-DEBUG] ✅ Coincide número de owner en DB`);
            return true;
        }
    }

    // Resolver LID si es necesario
    try {
        if (senderJid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(senderJid);
            if (pn) {
                const pnNum = numeroVisible(pn);
                console.log(`[SETOWNER-DEBUG] LID resuelto a: ${pnNum}`);
                
                if (pnNum === OWNER_PRINCIPAL) {
                    console.log(`[SETOWNER-DEBUG] ✅ LID es owner principal`);
                    return true;
                }

                for (const owner of owners) {
                    if (numeroVisible(owner) === pnNum) {
                        console.log(`[SETOWNER-DEBUG] ✅ LID coincide con owner en DB`);
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        console.log(`[SETOWNER-DEBUG] Error resolviendo LID: ${e.message}`);
    }

    console.log(`[SETOWNER-DEBUG] ❌ NO es owner`);
    return false;
}

export default {
    nombre: 'setowner',
    categoria: 'Owner',
    alias: ['nuevoowner', 'cambiarowner'],
    owner: true,
    descripcion: 'Agrega un nuevo Owner sin quitar al Owner principal.',

    ejecutar: async ({ sock, msg, responder }) => {
        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;
        console.log(`[SETOWNER] Comando ejecutado por: ${numeroVisible(sender)} (${sender})`);

        const esOwnerUser = await esOwner(sock, sender);
        
        if (!esOwnerUser) {
            await responder.texto(
                '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Este comando es exclusivo\n' +
                '┃    para el *Owner principal*\n' +
                '┃\n' +
                '┃ 👑 Contacta al creador del\n' +
                '┃    bot si necesitas acceso\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
            console.log(`[SETOWNER] ❌ Bloqueado: ${numeroVisible(sender)}`);
            return;
        }

        console.log(`[SETOWNER] ✅ Acceso permitido a: ${numeroVisible(sender)}`);

        const objetivo = obtenerObjetivo(msg);
        console.log(`[SETOWNER] Objetivo detectado: ${objetivo || 'NINGUNO'}`);

        if (!objetivo) {
            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'Debes mencionar al nuevo Owner o responder a su mensaje.\n\n' +
                'Ejemplos:\n' +
                '↳ *.setowner @usuario*\n' +
                '↳ Responde a un mensaje con *.setowner*'
            );
            return;
        }

        if (String(objetivo).endsWith('@g.us')) {
            await responder.texto('❌ Ese objetivo no es un usuario válido.');
            return;
        }

        try {
            const principal = obtenerOwner();
            const nuevo = guardarOwner(objetivo);
            const numero = numeroVisible(nuevo);
            const owners = obtenerOwners();

            const principalNorm = normalizarJid(principal);

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        '╭━━〔 👑 𝐎𝐖𝐍𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        `┃ ✅ Nuevo Owner › @${numero}\n` +
                        '┃ 🔐 Permisos activados\n' +
                        '┃ 💾 Owner guardado correctamente\n' +
                        '┃\n' +
                        '┃ 👑 Owner principal › @' +
                        numeroVisible(principal) +
                        '\n' +
                        `┃ 👥 Total Owners › ${owners.length}\n` +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣',
                    mentions: [nuevo, principalNorm]
                },
                { quoted: msg }
            );

            console.log(`[SETOWNER] ✅ Owner agregado: ${nuevo} por ${numeroVisible(sender)}`);

        } catch (error) {
            console.error('[SETOWNER] Error:', error);
            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'No se pudo agregar el Owner.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};