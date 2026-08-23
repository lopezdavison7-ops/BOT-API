// ============================================================
// SETCANAL - BOT-API
// Configura el canal oficial que aparecerá en el menú.
// ============================================================

import path from 'path';
import { obtenerStore, guardarStore } from '../../lib/jsonStore.js';

const CANAL_FILE = path.join(
    process.cwd(),
    'database',
    'canal.json'
);

// ============================================================
// GUARDAR CANAL
// ============================================================

function guardarCanal(url) {

    const datos =
        obtenerStore(CANAL_FILE, { url: '' });

    datos.url = url;

    // Inmediato: este comando se usa poco (owner), y así el
    // .menu de otros chats ve el cambio al instante.
    guardarStore(CANAL_FILE, true);

}

// ============================================================
// VALIDAR ENLACE
// ============================================================

function validarCanal(url) {
    try {
        const enlace = new URL(url);

        return (
            enlace.protocol === 'https:' &&
            enlace.hostname === 'whatsapp.com' &&
            enlace.pathname.startsWith('/channel/')
        );
    } catch {
        return false;
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'setcanal',
    categoria: 'Owner',
    alias: [],
    descripcion: 'Configura el enlace del canal que aparecerá en el menú.',

    async ejecutar({ msg, responder }) {
        try {
            // ----------------------------------------------------
            // COMPROBAR OWNER
            // ----------------------------------------------------
            const key = msg?.key || {};

            const candidatos = [
                key.senderPn,
                key.participantAlt,
                key.remoteJidAlt,
                key.participant,
                key.remoteJid
            ];

            const numeroOwnerPrincipal = '50578391933';

            const esOwnerPrincipal = candidatos.some(jid => {
                if (!jid) return false;

                const numero = String(jid)
                    .split('@')[0]
                    .split(':')[0]
                    .replace(/\D/g, '');

                return numero === numeroOwnerPrincipal;
            });

            if (!esOwnerPrincipal) {
                return responder.texto(
                    `╭━━〔 🔐 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣
┃
┃ ❌ Solo los propietarios
┃ pueden usar este comando.
┃
╰━━━━━━━━━━━━━━━━⬣`
                );
            }

            // ----------------------------------------------------
            // OBTENER TEXTO DEL COMANDO
            // ----------------------------------------------------

            const texto =
                msg?.message?.conversation ||
                msg?.message?.extendedTextMessage?.text ||
                '';

            const partes = texto.trim().split(/\s+/);

            const url = partes[1]?.trim();

            if (!url) {
                return responder.texto(
                    `╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣
┃
┃ ❌ Debes colocar el enlace
┃ de tu canal de WhatsApp.
┃
┃ 📌 Ejemplo:
┃ *.setcanal https://whatsapp.com/channel/xxxxx*
┃
╰━━━━━━━━━━━━━━━━⬣`
                );
            }

            // ----------------------------------------------------
            // VALIDAR
            // ----------------------------------------------------

            if (!validarCanal(url)) {
                return responder.texto(
                    `╭━━〔 ❌ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣
┃
┃ El enlace no parece ser
┃ un canal válido de WhatsApp.
┃
┃ 📌 Debe comenzar con:
┃ https://whatsapp.com/channel/
┃
╰━━━━━━━━━━━━━━━━⬣`
                );
            }

            // ----------------------------------------------------
            // GUARDAR
            // ----------------------------------------------------

            guardarCanal(url);

            return responder.texto(
                `╭━━〔 ✅ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣
┃
┃ 🎉 Canal configurado
┃ correctamente.
┃
┃ 📢 El enlace se utilizará
┃ automáticamente en el menú.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );

        } catch (error) {
            console.error(
                '[SETCANAL] Error:',
                error?.message || error
            );

            return responder.texto(
                `╭━━〔 ❌ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣
┃
┃ Ocurrió un error al guardar
┃ el canal.
┃
┃ ⚠️ ${error?.message || 'Error desconocido'}
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }
    }
};