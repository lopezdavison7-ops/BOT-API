// handler.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { crearRespondedor } from './lib/responder.js';
import { registrarUso } from './lib/estadisticas.js';
import { esOwner } from './lib/owner.js';

// ============================================================
// NUEVO IMPORT: Cargador recursivo
// ============================================================

import { loadCommands } from './controllers/cmdManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PREFIJO = '.';

// ============================================================
// CARGAR COMANDOS (Usa el nuevo sistema)
// ============================================================

export async function cargarComandos() {
    // Simplemente llamamos al nuevo cargador recursivo
    const commands = loadCommands();
    
    // Convertir el Map a arrays para mantener compatibilidad
    const mapaComandos = commands;
    const listaComandos = Array.from(commands.values())
        .filter((v, i, self) => self.indexOf(v) === i); // Eliminar duplicados por alias

    return {
        mapaComandos,
        listaComandos
    };
}

// ============================================================
// MANEJADOR DE MENSAJES
// ============================================================

export function crearManejador(
    sock,
    mapaComandos,
    listaComandos
) {
    return async ({ messages }) => {

        const msg = messages?.[0];

        if (!msg?.message || msg.key?.fromMe) {
            return;
        }

        // ----------------------------------------------------
        // IGNORAR MENSAJES ANTIGUOS
        // ----------------------------------------------------

        const marcaTiempo =
            (msg.messageTimestamp?.low ??
                msg.messageTimestamp ??
                0) * 1000;

        if (
            marcaTiempo &&
            Date.now() - marcaTiempo > 10000
        ) {
            return;
        }

        // ----------------------------------------------------
        // OBTENER TEXTO
        // ----------------------------------------------------

        const texto =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

        if (!texto.startsWith(PREFIJO)) {
            return;
        }

        const partes = texto
            .slice(PREFIJO.length)
            .trim()
            .split(/\s+/);

        const comandoCrudo = partes.shift() || '';

        const nombreComando =
            comandoCrudo.toLowerCase();

        const argumento =
            partes.join(' ').trim();

        const responder =
            crearRespondedor(sock, msg);

        // ----------------------------------------------------
        // BUSCAR COMANDO
        // ----------------------------------------------------

        const cmd =
            mapaComandos.get(nombreComando);

        if (!cmd) {
            if (nombreComando) {
                await responder.texto(
                    `❌ Comando no reconocido.\n\nEscribe *${PREFIJO}menu* para ver los comandos.`
                );
            }

            return;
        }

        // ----------------------------------------------------
        // COMPROBAR OWNER
        // ----------------------------------------------------

        if (cmd.owner === true && !esOwner(msg)) {

            await responder.texto(
                '⛔ Este comando es exclusivo del Owner.'
            );

            return;
        }

        // ----------------------------------------------------
        // EJECUTAR COMANDO
        // ----------------------------------------------------

        try {

            await cmd.ejecutar({
                sock,
                msg,
                responder,
                argumento,
                listaComandos,
                prefijo: PREFIJO,
                esOwner: esOwner(msg)
            });

            registrarUso(cmd.nombre);

        } catch (error) {

            console.error(
                `[COMANDO ${nombreComando}]`,
                error
            );

            await responder.texto(
                '⚠️ Ocurrió un error procesando tu solicitud.'
            );
        }
    };
}