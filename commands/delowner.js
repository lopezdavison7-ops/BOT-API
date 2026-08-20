// commands/delowner.js
import fs from 'fs/promises';
import path from 'path';
import { jidNormalizedUser } from 'baileys';

const OWNER_FILE = path.join(process.cwd(), 'database', 'owner.json');

function limpiarJid(valor) {
    if (!valor) return null;
    if (typeof valor === 'object') {
        valor = valor.lid || valor.jid || valor.id || valor.number || valor.numero || valor.phone || '';
    }
    const texto = String(valor).trim();
    if (!texto) return null;
    if (texto.includes('@')) return texto;
    return texto;
}

function obtenerLidJid(owner) {
    const valor = limpiarJid(owner);
    if (!valor) return null;
    if (valor.endsWith('@lid')) return valor;
    if (valor.endsWith('@s.whatsapp.net')) return valor;
    const numero = valor.replace(/[^0-9]/g, '');
    if (!numero) return null;
    return `${numero}@lid`;
}

function normalizarPN(valor) {
    if (!valor) return null;
    let texto = String(valor).trim();
    if (!texto) return null;
    if (texto.includes('@')) {
        try { return jidNormalizedUser(texto); } catch { }
    }
    const numero = texto.replace(/[^0-9]/g, '');
    if (!numero) return null;
    return `${numero}@s.whatsapp.net`;
}

async function resolverPN(sock, owner) {
    const valor = limpiarJid(owner);
    if (!valor) return null;
    if (valor.endsWith('@s.whatsapp.net')) {
        return normalizarPN(valor);
    }
    const lid = obtenerLidJid(owner);
    if (!lid) return null;
    const mapping = sock?.signalRepository?.lidMapping;
    if (!mapping || typeof mapping.getPNForLID !== 'function') {
        console.error('[DELOWNER] getPNForLID no está disponible.');
        return null;
    }
    try {
        const resultado = await mapping.getPNForLID(lid);
        if (!resultado) {
            console.warn(`[DELOWNER] No existe mapping PN para ${lid}`);
            return null;
        }
        const pn = normalizarPN(resultado);
        if (!pn) return null;
        console.log(`[DELOWNER] LID ${lid} -> PN ${pn}`);
        return pn;
    } catch (error) {
        console.error(`[DELOWNER] Error resolviendo ${lid}:`, error?.message || error);
        return null;
    }
}

async function leerOwners() {
    const raw = await fs.readFile(OWNER_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.owners)) return data.owners;
    if (Array.isArray(data?.owner)) return data.owner;
    if (data && typeof data === 'object') {
        return Object.values(data).filter(value => typeof value === 'string' || typeof value === 'object');
    }
    return [];
}

async function guardarOwners(owners) {
    await fs.writeFile(OWNER_FILE, JSON.stringify({ owners }, null, 2));
}

export default {
    nombre: 'delowner',
    categoria: 'Owner',
    alias: ['deleteowner', 'removerowner'],
    descripcion: 'Elimina un propietario del bot usando mención o número.',
    ejecutar: async ({ msg, sock, responder, argumento }) => {
        try {
            // 1. Obtener el objetivo
            let target = null;

            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) target = quoted;

            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length > 0) {
                target = mentioned[0];
                if (quoted && mentioned.length > 0) target = mentioned[0];
            }

            if (!target && argumento) {
                const texto = String(argumento).trim().replace(/[^0-9]/g, '');
                if (texto.length >= 10) {
                    target = `${texto}@s.whatsapp.net`;
                }
            }

            if (!target) {
                await responder.texto(
                    `❌ *DELOWNER*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Responde a un mensaje del usuario\n` +
                    `2️⃣ Menciona al usuario: *.delowner @usuario*\n` +
                    `3️⃣ Escribe el número: *.delowner 521234567890*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.delowner @pedro*\n` +
                    `*.delowner 521234567890*`
                );
                return;
            }

            // 2. Resolver el JID real
            const jidReal = await resolverPN(sock, target);
            if (!jidReal) {
                await responder.texto('❌ No se pudo resolver el JID del usuario.');
                return;
            }

            // 3. Leer owners
            let owners = await leerOwners();

            // 4. Buscar coincidencia (comparar número limpio)
            const targetLimpio = jidReal.replace(/[^0-9]/g, '');
            let index = -1;

            for (let i = 0; i < owners.length; i++) {
                const owner = owners[i];
                const ownerLimpio = String(owner).replace(/[^0-9]/g, '');
                if (ownerLimpio === targetLimpio) {
                    index = i;
                    break;
                }
            }

            if (index === -1) {
                await responder.texto('❌ Ese usuario no es un propietario registrado.');
                return;
            }

            // 5. Eliminar y guardar
            const eliminado = owners[index];
            owners.splice(index, 1);
            await guardarOwners(owners);

            const numeroMostrar = jidReal.split('@')[0];

            const respuesta = `
╭〔 ✅ 𝐎𝐖𝐍𝐄𝐑 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐎 〕⬣
┃
┃ 🗑️ Usuario eliminado: @${numeroMostrar}
┃
┃ 👥 Total Owners: ${owners.length}
┃
┃ 💾 Base de datos actualizada.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: respuesta,
                mentions: [jidReal]
            }, { quoted: msg });

            console.log(`[DELOWNER] Eliminado: ${jidReal}`);

        } catch (error) {
            console.error('[DELOWNER] Error:', error?.stack || error?.message || error);
            await responder.texto('❌ Error al eliminar el propietario.');
        }
    }
};