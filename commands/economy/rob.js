import {
    obtenerUsuario,
    modificarDinero,
    puedeRobar,
    tiempoRestanteRobo,
    registrarRobo
} from '../../database/economia.js';

const PROBABILIDAD_EXITO = 0.45;
const PORCENTAJE_MIN = 0.10;
const PORCENTAJE_MAX = 0.25;
const TOPE_ROBO = 5000;
const MINIMO_VICTIMA = 200;
const MULTA_MIN = 100;
const MULTA_MAX = 300;

function numeroAleatorio(minimo, maximo) {
    return Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
}

function formatearMs(ms) {
    const totalSegundos = Math.ceil(ms / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    if (minutos <= 0) return `${segundos}s`;
    return `${minutos}m ${segundos}s`;
}

function limpiarNombre(nombre) {
    if (!nombre) return 'Usuario';
    return String(nombre)
        .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
        .replace(/\s+/g, ' ')
        .replace(/[*_~`]/g, '')
        .trim()
        .slice(0, 25) || 'Usuario';
}

async function obtenerNombreReal(sock, jid, msg) {
    if (!jid) return 'Usuario';

    if (sock?.store?.contacts?.[jid]?.name) {
        return limpiarNombre(sock.store.contacts[jid].name);
    }
    if (sock?.store?.contacts?.[jid]?.notify) {
        return limpiarNombre(sock.store.contacts[jid].notify);
    }
    if (sock?.store?.contacts?.[jid]?.verifiedName) {
        return limpiarNombre(sock.store.contacts[jid].verifiedName);
    }

    try {
        if (msg.key.remoteJid?.endsWith('@g.us')) {
            const metadata = await sock.groupMetadata(msg.key.remoteJid);
            for (const p of (metadata.participants || [])) {
                const pJid = typeof p === 'string' ? p : (p.id || p.jid || '');
                if (pJid === jid) {
                    if (p.name) return limpiarNombre(p.name);
                    if (p.notify) return limpiarNombre(p.notify);
                }
            }
        }
    } catch {}

    return jid.split('@')[0].replace(/\D/g, '');
}

export default {
    nombre: 'rob',
    categoria: 'economia',
    alias: ['robar', 'steal'],
    descripcion: 'Intenta robarle dinero a otro usuario. Uso: .rob @usuario',

    ejecutar: async ({ sock, msg, responder, jid }) => {
        const ladron = msg.key.participant || msg.key.remoteJid;
        const mencionados = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (mencionados.length === 0) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐑𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona a quién quieres robarle.\n' +
                '┃\n' +
                '┃ 📌 Uso: .rob @usuario\n' +
                '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const victima = mencionados[0];

        if (victima === ladron) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐑𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ No puedes robarte a ti mismo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        if (!puedeRobar(ladron)) {
            const restante = tiempoRestanteRobo(ladron);
            return await responder.texto(
                '╭━━〔  𝐑𝐎𝐁 〕━━⬣\n' +
                '\n' +
                '┃ Ya intentaste robar hace poco.\n' +
                '┃\n' +
                ` 🕐 Espera › *${formatearMs(restante)}*\n` +
                '┃\n' +
                '━━━━━━━━━━━━━━━━⬣'
            );
        }

        const cuentaVictima = obtenerUsuario(victima);
        const dineroVictima = Number(cuentaVictima.dinero || 0);

        if (dineroVictima < MINIMO_VICTIMA) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐑𝐁 〕━━⬣\n' +
                '┃\n' +
                '┃ Esa persona no tiene suficiente\n' +
                '┃ dinero para que valga la pena\n' +
                '┃ robarle.\n' +
                '┃\n' +
                `┃ 📌 Mínimo › *$${MINIMO_VICTIMA.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        registrarRobo(ladron);

        const exito = Math.random() < PROBABILIDAD_EXITO;

        if (!exito) {
            const multa = numeroAleatorio(MULTA_MIN, MULTA_MAX);
            const cuentaLadron = obtenerUsuario(ladron);
            const dineroLadron = Number(cuentaLadron.dinero || 0);
            const multaReal = Math.min(multa, dineroLadron);

            if (multaReal > 0) {
                modificarDinero(ladron, -multaReal);
            }

            return await responder.texto(
                '╭━━〔 🚨 𝐎𝐁 𝐅𝐀𝐋𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ Te atraparon intentando robar.\n' +
                '┃\n' +
                ` 💸 Multa › *$${multaReal.toLocaleString()}*\n` +
                '\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const porcentaje = PORCENTAJE_MIN + Math.random() * (PORCENTAJE_MAX - PORCENTAJE_MIN);
        const robado = Math.min(Math.floor(dineroVictima * porcentaje), TOPE_ROBO);

        modificarDinero(victima, -robado);
        modificarDinero(ladron, robado);

        const nombreVictima = await obtenerNombreReal(sock, victima, msg);

        await sock.sendMessage(jid, {
            text:
                '╭━━〔 💰 𝐎𝐁 𝐄𝐈𝐓𝐎𝐎 〕━━⬣\n' +
                '┃\n' +
                `┃ 🥷 Le robaste a *${nombreVictima}*\n` +
                '┃\n' +
                `┃ 💵 Ganaste › *$${robado.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━',
            mentions: [victima]
        }, { quoted: msg });
    }
};