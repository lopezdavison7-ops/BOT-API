import {
    guardarOwner,
    obtenerOwner,
    obtenerOwners
} from '../../lib/owner.js';

const OWNERS_PRINCIPALES = [
    '50578391933',
    '50577455383'
];

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

async function esOwner(sock, msg) {
    console.log('═══════════════════════════════════════');
    console.log('[SETOWNER-DEBUG] msg.key completo:');
    console.log(JSON.stringify(msg.key, null, 2));
    console.log('═══════════════════════════════════════');

    const candidatos = [
        msg.key.participant,
        msg.key.senderPn,
        msg.key.participantAlt,
        msg.key.remoteJidAlt,
        msg.key.sender,
        msg.key.remoteJid
    ].filter(Boolean);

    console.log('[SETOWNER-DEBUG] Candidatos a sender:', candidatos);

    for (const cand of candidatos) {
        const num = numeroVisible(cand);
        console.log(`[SETOWNER-DEBUG] Probando: ${cand} → número: ${num}`);
        
        if (OWNERS_PRINCIPALES.includes(num)) {
            console.log(`[SETOWNER-DEBUG] ✅ MATCH directo: ${num}`);
            return true;
        }
    }

    const owners = obtenerOwners() || [];
    console.log(`[SETOWNER-DEBUG] Owners en DB (${owners.length}):`, owners);

    for (const cand of candidatos) {
        const num = numeroVisible(cand);
        const norm = normalizarJid(cand);
        
        for (const owner of owners) {
            if (normalizarJid(owner) === norm || numeroVisible(owner) === num) {
                console.log(`[SETOWNER-DEBUG] ✅ MATCH en DB: ${num}`);
                return true;
            }
        }
    }

    try {
        for (const cand of candidatos) {
            if (String(cand).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(cand);
                if (pn) {
                    const pnNum = numeroVisible(pn);
                    console.log(`[SETOWNER-DEBUG] LID ${cand} → PN: ${pnNum}`);
                    
                    if (OWNERS_PRINCIPALES.includes(pnNum)) {
                        console.log(`[SETOWNER-DEBUG] ✅ MATCH LID→PN: ${pnNum}`);
                        return true;
                    }

                    for (const owner of owners) {
                        if (numeroVisible(owner) === pnNum) {
                            console.log(`[SETOWNER-DEBUG] ✅ MATCH LID→PN en DB`);
                            return true;
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.log(`[SETOWNER-DEBUG] Error LID: ${e.message}`);
    }

    console.log('[SETOWNER-DEBUG] ❌ NINGÚN candidato es owner');
    console.log('═══════════════════════════════════════');
    return false;
}

export default {
    nombre: 'setowner',
    categoria: 'Owner',
    alias: ['nuevoowner', 'cambiarowner'],
    owner: true,
    descripcion: 'Agrega un nuevo Owner sin quitar al Owner principal.',

    ejecutar: async ({ sock, msg, responder }) => {
        const esOwnerUser = await esOwner(sock, msg);
        
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
            return;
        }

        const objetivo = obtenerObjetivo(msg);

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
                    mentions: [nuevo, normalizarJid(principal)]
                },
                { quoted: msg }
            );

            console.log(`[SETOWNER] ✅ Owner agregado: ${nuevo}`);

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