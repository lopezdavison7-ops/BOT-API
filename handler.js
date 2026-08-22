// handler.js
import { loadCommands } from './controllers/cmdManager.js';
import fs from 'fs';
import path from 'path';

const PREFIJO = '.';

let comandos = null;

function getOwners() {
    try {
        const file = path.join(process.cwd(), 'database', 'owner.json');
        if (!fs.existsSync(file)) return [];
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return data.owners || [];
    } catch {
        return [];
    }
}

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
                     msg.message?.imageMessage?.caption ||
                     msg.message?.videoMessage?.caption ||
                     msg.message?.documentMessage?.caption ||
                     '';

        if (!texto) return;

        const senderId = msg.key.fromMe
            ? (sock.user.id.split('@')[0].split(':')[0] + '@s.whatsapp.net')
            : (msg.key.participant || msg.key.remoteJid || '').split('@')[0].split(':')[0] + '@s.whatsapp.net';

        const senderNumber = senderId.split('@')[0];
        const owners = getOwners();
        const isOwner = msg.key.fromMe || owners.includes(senderNumber);

        let textoProcesado = texto;
        let prefijoUsado = prefijo;

        if (texto.startsWith('=>')) {
            prefijoUsado = '=>';
            textoProcesado = '.' + 'eval ' + texto.slice(2).trim();
        }

        if (!textoProcesado.startsWith(prefijoUsado)) return;

        const args = textoProcesado.slice(prefijoUsado.length).trim().split(/\s+/);
        const nombreComando = args.shift().toLowerCase();
        const argumento = args.join(' ').trim();

        const cmd = comandos.get(nombreComando);
        if (!cmd) return;

        await cmd.ejecutar({
            sock,
            msg,
            argumento,
            body: texto,
            isOwner,
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
