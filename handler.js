// handler.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { crearRespondedor } from './lib/responder.js';
import { registrarUso } from './lib/estadisticas.js';
import { esOwner } from './lib/owner.js';
import { loadCommands } from './controllers/cmdManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREFIJO = '.';

export async function cargarComandos() {
    const commands = loadCommands();
    const mapaComandos = commands;
    const listaComandos = Array.from(commands.values())
        .filter((v, i, self) => self.indexOf(v) === i);

    return { mapaComandos, listaComandos };
}

export function crearManejador(sock, mapaComandos, listaComandos) {
    return async ({ messages }) => {
        const msg = messages?.[0];
        if (!msg?.message || msg.key?.fromMe) return;

        const marcaTiempo = (msg.messageTimestamp?.low ?? msg.messageTimestamp ?? 0) * 1000;
        if (marcaTiempo && Date.now() - marcaTiempo > 10000) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!texto.startsWith(PREFIJO)) return;

        const partes = texto.slice(PREFIJO.length).trim().split(/\s+/);
        const comandoCrudo = partes.shift() || '';
        const nombreComando = comandoCrudo.toLowerCase();
        const argumento = partes.join(' ').trim();
        const responder = crearRespondedor(sock, msg);

        const cmd = mapaComandos.get(nombreComando);
        if (!cmd) {
            if (nombreComando) {
                await responder.texto(`❌ Comando no reconocido.\n\nEscribe *${PREFIJO}menu* para ver los comandos.`);
            }
            return;
        }

        if (cmd.owner === true && !esOwner(msg)) {
            await responder.texto('⛔ Este comando es exclusivo del Owner.');
            return;
        }

        try {
            await cmd.ejecutar({ sock, msg, responder, argumento, listaComandos, prefijo: PREFIJO, esOwner: esOwner(msg) });
            registrarUso(cmd.nombre);
        } catch (error) {
            console.error(`[COMANDO ${nombreComando}]`, error);
            await responder.texto('⚠️ Ocurrió un error procesando tu solicitud.');
        }
    };
}

// 🔥 ESTO ES LO QUE FALTA: Exportación directa para el index.js
export const handleMessage = crearManejador;