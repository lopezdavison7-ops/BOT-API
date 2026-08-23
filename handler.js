// handler.js
import { loadCommands } from './controllers/cmdManager.js';

const PREFIJO = '.';

let comandos = null;

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

        const texto = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     '';

        if (!texto.startsWith(prefijo)) return;

        // Se separa solo el nombre del comando (primer "token").
        // El resto del texto se conserva TAL CUAL (con sus saltos de
        // línea originales), para que comandos como .eval reciban
        // código multilínea intacto en vez de todo aplastado en
        // una sola línea con espacios.
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
                : sinPrefijo.slice(indiceEspacio + 1).trim();

        const cmd = comandos.get(nombreComando);
        if (!cmd) return;

        await cmd.ejecutar({
            sock,
            msg,
            argumento,
            listaComandos,
            prefijo,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                imagen: async (img, caption) => {
                    await sock.sendMessage(msg.key.remoteJid, { image: img, caption }, { quoted: msg });
                },
                video: async (vid, caption) => {
                    await sock.sendMessage(msg.key.remoteJid, { video: vid, caption }, { quoted: msg });
                }
            }
        });

    } catch (error) {
        console.error('[HANDLER] Error al manejar mensaje:', error);
    }
}