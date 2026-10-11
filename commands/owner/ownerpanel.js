
import {
    esOwner,
    obtenerOwner,
    obtenerOwners,
    guardarOwner,
    eliminarOwner,
    numeroEsOwner
} from '../../lib/owner.js';

function soloDigitos(valor) {

    return String(valor || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

}

function obtenerContexto(msg) {

    const m = msg?.message || {};

    return m.extendedTextMessage?.contextInfo ||
        m.imageMessage?.contextInfo ||
        m.videoMessage?.contextInfo ||
        m.documentMessage?.contextInfo ||
        m.audioMessage?.contextInfo ||
        null;

}

function obtenerObjetivo(msg, texto) {

    const contexto = obtenerContexto(msg);

    const mencionado = contexto?.mentionedJid?.[0];

    if (mencionado && !String(mencionado).endsWith('@g.us')) {
        return mencionado;
    }

    const citado = contexto?.participant;

    if (citado && !String(citado).endsWith('@g.us')) {
        return citado;
    }

    const numero = soloDigitos(String(texto || '').split(/\s+/)[0]);

    if (numero) {
        return `${numero}@s.whatsapp.net`;
    }

    return null;

}

function remitente(msg) {

    const key = msg?.key || {};

    return (
        key.participant ||
        key.senderPn ||
        key.participantAlt ||
        key.remoteJidAlt ||
        key.remoteJid ||
        ''
    );

}

async function resolverPN(sock, valor) {

    const texto = String(valor || '').trim();

    if (!texto) {
        return null;
    }

    if (texto.endsWith('@s.whatsapp.net')) {
        return soloDigitos(texto);
    }

    const repo = sock?.signalRepository;

    if (!repo) {
        return null;
    }

    const lid = texto.includes('@') ? texto : `${soloDigitos(texto)}@lid`;

    if (!lid.endsWith('@lid')) {
        return soloDigitos(texto);
    }

    const mapa = repo.lidMapping;

    const mapper = repo.lidMapper;

    const intentos = [
        { fn: mapa?.getPNForLID, thisArg: mapa },
        { fn: mapa?.getPNForLid, thisArg: mapa },
        { fn: mapper?.getPNForLid, thisArg: mapper },
        { fn: mapper?.getPNForLID, thisArg: mapper }
    ];

    for (const { fn, thisArg } of intentos) {

        if (typeof fn !== 'function') {
            continue;
        }

        try {

            const resultado = await fn.call(thisArg, lid);

            const digitos = soloDigitos(resultado?.jid || resultado?.pn || resultado);

            if (digitos) {
                return digitos;
            }

        } catch (error) {}

    }

    return null;

}

function caja(titulo, lineas, emoji = '👑') {

    let texto = `╭━━〔 ${emoji} ${titulo} 〕━━⬣\n┃\n`;

    for (const linea of lineas) {
        texto += `┃ ${linea}\n`;
    }

    texto += '┃\n╰━━━━━━━━━━━━━━━━⬣';

    return texto;

}

export default {

    nombre: 'ownerpanel',

    categoria: 'Owner',

    alias: [
        'opanel',
        'panelowner',
        'gestionowner',
        'sistemaowner'
    ],

    owner: true,

    descripcion: 'Sistema completo de propietarios (listar, agregar, eliminar y verificar).',

    ejecutar: async ({
        sock,
        msg,
        args,
        argumento,
        responder,
        prefijo
    }) => {

        if (!esOwner(msg)) {

            await responder.texto(
                caja('𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎', [
                    '🚫 Este comando es solo para el Owner.',
                    '🔐 Solicita permiso al propietario.'
                ], '⛔')
            );

            return;

        }

        const sub = String(args?.[0] || '').toLowerCase();

        const resto = args?.slice(1).join(' ').trim() || '';

        const jid = msg.key.remoteJid;

        const principal = soloDigitos(obtenerOwner());

        if (!sub || sub === 'help' || sub === 'menu' || sub === 'panel') {

            await responder.texto(
                caja('𝐒𝐈𝐒𝐓𝐄𝐌𝐀 𝐎𝐖𝐍𝐄𝐑', [
                    `📌 Prefijo: *${prefijo}*`,
                    '',
                    '📋 Subcomandos:',
                    `➪ ${prefijo}ownerpanel list`,
                    `➪ ${prefijo}ownerpanel add @user`,
                    `➪ ${prefijo}ownerpanel del @user`,
                    `➪ ${prefijo}ownerpanel check @user`,
                    `➪ ${prefijo}ownerpanel info`,
                    `➪ ${prefijo}ownerpanel clear confirmar`
                ])
            );

            return;

        }

        if (sub === 'list') {

            const owners = obtenerOwners();

            const lineas = [
                `📌 Total: *${owners.length}* propietario(s)`,
                ''
            ];

            const mentions = [];

            for (let i = 0; i < owners.length; i++) {

                const numero = soloDigitos(owners[i]);

                const esPrincipal = numero === principal;

                lineas.push(
                    `${i + 1}. @${numero}${esPrincipal ? ' 👑 (principal)' : ''}`
                );

                mentions.push(`${numero}@s.whatsapp.net`);

            }

            await sock.sendMessage(
                jid,
                {
                    text: caja('𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒', lineas),
                    mentions
                },
                { quoted: msg }
            );

            return;

        }

        if (sub === 'info') {

            const owners = obtenerOwners();

            const yo = soloDigitos(remitente(msg));

            await responder.texto(
                caja('𝐈𝐍𝐅𝐎 𝐎𝐖𝐍𝐄𝐑', [
                    `👑 Principal: *${principal}*`,
                    `👥 Secundarios: *${Math.max(owners.length - 1, 0)}*`,
                    `📊 Total: *${owners.length}*`,
                    `🔎 Tú eres owner: *${numeroEsOwner(yo) ? 'Sí' : 'No'}*`,
                    `🥇 Tú eres principal: *${yo === principal ? 'Sí' : 'No'}*`
                ])
            );

            return;

        }

        if (sub === 'check') {

            const objetivo = obtenerObjetivo(msg, resto);

            if (!objetivo) {

                await responder.texto(
                    caja('𝐂𝐇𝐄𝐂𝐊', [
                        '❌ Menciona, responde o escribe un número.',
                        `📌 Uso: ${prefijo}ownerpanel check @user`
                    ], '⚠️')
                );

                return;

            }

            const numero = soloDigitos(objetivo);

            await sock.sendMessage(
                jid,
                {
                    text: caja('𝐂𝐇𝐄𝐂𝐊', [
                        `🔎 Usuario: @${numero}`,
                        `📋 ¿Es owner?: *${numeroEsOwner(numero) ? 'Sí' : 'No'}*`,
                        `🥇 ¿Es principal?: *${numero === principal ? 'Sí' : 'No'}*`
                    ]),
                    mentions: [`${numero}@s.whatsapp.net`]
                },
                { quoted: msg }
            );

            return;

        }

        if (sub === 'add') {

            const objetivo = obtenerObjetivo(msg, resto);

            if (!objetivo) {

                await responder.texto(
                    caja('𝐀𝐃𝐃 𝐎𝐖𝐍𝐄𝐑', [
                        '❌ Menciona, responde o escribe un número.',
                        '',
                        `➪ ${prefijo}ownerpanel add @usuario`,
                        `➪ ${prefijo}ownerpanel add 50512345678`
                    ], '⚠️')
                );

                return;

            }

            const numeroObjetivo = soloDigitos(objetivo);

            const pn = await resolverPN(sock, objetivo);

            const numeroGuardar = pn || numeroObjetivo;

            if (numeroEsOwner(numeroGuardar)) {

                await responder.texto(
                    caja('𝐀𝐃𝐃 𝐎𝐖𝐍𝐄𝐑', [
                        `⚠️ @${numeroGuardar} ya es propietario.`
                    ], '⚠️')
                );

                return;

            }

            guardarOwner(numeroGuardar);

            const owners = obtenerOwners();

            await sock.sendMessage(
                jid,
                {
                    text: caja('𝐎𝐖𝐍𝐄𝐑 𝐀𝐆𝐑𝐄𝐆𝐀𝐃𝐎', [
                        `✅ Nuevo owner › @${numeroGuardar}`,
                        '🔐 Permisos activados',
                        '💾 Guardado correctamente',
                        '',
                        `👥 Total owners › *${owners.length}*`
                    ], '✅'),
                    mentions: [`${numeroGuardar}@s.whatsapp.net`]
                },
                { quoted: msg }
            );

            console.log(`[OWNERPANEL] Owner agregado: ${numeroGuardar}`);

            return;

        }

        if (sub === 'del' || sub === 'remove' || sub === 'rm') {

            const objetivo = obtenerObjetivo(msg, resto);

            if (!objetivo) {

                await responder.texto(
                    caja('𝐃𝐄𝐋 𝐎𝐖𝐍𝐄𝐑', [
                        '❌ Menciona, responde o escribe un número.',
                        '',
                        `➪ ${prefijo}ownerpanel del @usuario`,
                        `➪ ${prefijo}ownerpanel del 50512345678`
                    ], '⚠️')
                );

                return;

            }

            const numeroObjetivo = soloDigitos(objetivo);

            if (numeroObjetivo === principal) {

                await responder.texto(
                    caja('𝐃𝐄𝐋 𝐎𝐖𝐍𝐄𝐑', [
                        '🛡️ El Owner principal no puede eliminarse.',
                        '🔐 Protegido por el sistema.'
                    ], '⛔')
                );

                return;

            }

            const adicionales = obtenerOwners()
                .map(soloDigitos)
                .filter(numero => numero && numero !== principal);

            let almacenado = adicionales.find(numero => numero === numeroObjetivo) || null;

            if (!almacenado) {

                for (const numero of adicionales) {

                    const pn = await resolverPN(sock, numero);

                    if (pn && pn === numeroObjetivo) {
                        almacenado = numero;
                        break;
                    }

                }

            }

            if (!almacenado) {

                await responder.texto(
                    caja('𝐃𝐄𝐋 𝐎𝐖𝐍𝐄𝐑', [
                        `❌ @${numeroObjetivo} no es un owner registrado.`
                    ], '⚠️')
                );

                return;

            }

            eliminarOwner(almacenado);

            const owners = obtenerOwners();

            await sock.sendMessage(
                jid,
                {
                    text: caja('𝐎𝐖𝐍𝐄𝐑 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐎', [
                        `🗑️ Usuario eliminado › @${almacenado}`,
                        '💾 Base de datos actualizada',
                        '',
                        `👥 Total owners › *${owners.length}*`
                    ], '✅'),
                    mentions: [`${almacenado}@s.whatsapp.net`]
                },
                { quoted: msg }
            );

            console.log(`[OWNERPANEL] Owner eliminado: ${almacenado}`);

            return;

        }

        if (sub === 'clear' || sub === 'reset') {

            const confirmar = String(resto).toLowerCase();

            if (!['confirmar', 'confirm', 'si', 'sí'].includes(confirmar)) {

                await responder.texto(
                    caja('𝐂𝐋𝐄𝐀𝐑 𝐎𝐖𝐍𝐄𝐑𝐒', [
                        '⚠️ Esto eliminará TODOS los owners secundarios.',
                        '👑 El Owner principal se conserva.',
                        '',
                        `📌 Confirma con: ${prefijo}ownerpanel clear confirmar`
                    ], '⚠️')
                );

                return;

            }

            const adicionales = obtenerOwners()
                .map(soloDigitos)
                .filter(numero => numero && numero !== principal);

            for (const numero of adicionales) {
                eliminarOwner(numero);
            }

            const owners = obtenerOwners();

            await responder.texto(
                caja('𝐎𝐖𝐍𝐄𝐑𝐒 𝐋𝐈𝐌𝐏𝐈𝐀𝐃𝐎𝐒', [
                    `🗑️ Eliminados › *${adicionales.length}*`,
                    `👑 Principal conservado › @${principal}`,
                    '',
                    `👥 Total owners › *${owners.length}*`
                ], '✅')
            );

            console.log(`[OWNERPANEL] Limpieza: ${adicionales.length} owners eliminados`);

            return;

        }

        await responder.texto(
            caja('𝐒𝐔𝐁𝐂𝐎𝐌𝐀𝐍𝐃𝐎 𝐈𝐍𝐕Á𝐋𝐈𝐃𝐎', [
                `❌ *${sub}* no existe.`,
                `📋 Usa: ${prefijo}ownerpanel`
            ], '⚠️')
        );

    }

};
