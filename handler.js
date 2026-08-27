// handler.js
import { loadCommands } from './controllers/cmdManager.js';

const PREFIJO = '.';

let comandos = null;
let botJid = null;

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
}

export async function handleMessage(sock, msg, prefijo = '.', listaComandos = []) {
    try {
        if (!comandos) {
            comandos = await loadCommands();
        }

        if (!botJid) botJid = sock.user.id;

        // 1. IGNORAR SI NO HAY MENSAJE
        if (!msg.message) return;

        // 2. IGNORAR SOLO ESTADOS
        if (msg.key.remoteJid === 'status@broadcast') return;

        const jid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe; // true si lo mando el bot
        const isGroup = jid.endsWith('@g.us');

        const texto = msg.message?.conversation ||
                     msg.message?.extendedTextMessage?.text ||
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption ||
                     '';

        if (!texto.startsWith(prefijo)) return;

        // Separar comando y argumento conservando saltos de linea
        const sinPrefijo = texto.slice(prefijo.length).trim();
        const indiceEspacio = sinPrefijo.search(/\s/);

        const nombreComando = (
            indiceEspacio === -1
               ? sinPrefijo
                : sinPrefijo.slice(0, indiceEspacio)
        ).toLowerCase();

        const argumento =
            indiceEspacio === -1
               ? ''
                : sinPrefijo.slice(indiceEspacio + 1);

        // Buscar comando o alias
        let cmd = comandos.get(nombreComando);
        if (!cmd) {
            cmd = [...comandos.values()].find(c => c.alias?.includes(nombreComando));
        }
        if (!cmd) return;

        await cmd.ejecutar({
            sock,
            msg,
            argumento,
            listaComandos,
            prefijo,
            fromMe,
            isGroup,
            jid,
            botJid,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(jid, { text }, { quoted: msg });
                },
                imagen: async (img, caption = '') => {
                    await sock.sendMessage(jid, { image: img, caption }, { quoted: msg });
                },
                video: async (vid, caption = '') => {
                    await sock.sendMessage(jid, { video: vid, caption }, { quoted: msg });
                },
                audio: async (aud, ptt = true) => {
                    await sock.sendMessage(jid, { audio: aud, mimetype: 'audio/mpeg', ptt }, { quoted: msg });
                }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);
        // Responder error solo si no es del bot para evitar bucle
        if (!msg.key.fromMe) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
}