// ============================================================
// COMANDO: SETCANAL
// ALEX BOT / BOT-API
// Configura el canal oficial que aparecerá como botón
// "Ver canal" al final del menú.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { esOwner } from '../../utils/owner.js';

// ============================================================
// RUTAS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CANAL_FILE = path.join(
    __dirname,
    '..',
    '..',
    'database',
    'canal.json'
);

// ============================================================
// ASEGURAR DATABASE
// ============================================================

function asegurarArchivo() {
    const carpeta = path.dirname(CANAL_FILE);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(CANAL_FILE)) {
        fs.writeFileSync(
            CANAL_FILE,
            JSON.stringify(
                {
                    url: ''
                },
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// GUARDAR CANAL
// ============================================================

function guardarCanal(url) {
    asegurarArchivo();

    fs.writeFileSync(
        CANAL_FILE,
        JSON.stringify(
            {
                url
            },
            null,
            2
        ),
        'utf8'
    );
}

// ============================================================
// VALIDAR CANAL
// ============================================================

function validarCanal(url) {
    try {
        const parsed = new URL(url);

        return (
            parsed.protocol === 'https:' &&
            (
                parsed.hostname === 'whatsapp.com' ||
                parsed.hostname === 'www.whatsapp.com'
            ) &&
            parsed.pathname.startsWith('/channel/')
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

    alias: [
        'canal',
        'setchannel'
    ],

    descripcion:
        'Configura el enlace del canal que aparecerá como botón en el menú.',

    async ejecutar({
        msg,
        responder,
        argumento
    }) {

        try {

            // ------------------------------------------------
            // COMPROBAR OWNER
            // ------------------------------------------------

            if (!esOwner(msg)) {

                return responder.texto(
                    '╭━━〔 🔐 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Solo los propietarios\n' +
                    '┃ pueden usar este comando.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            // ------------------------------------------------
            // OBTENER ENLACE
            // ------------------------------------------------

            const url =
                argumento?.trim();

            if (!url) {

                return responder.texto(
                    '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Debes enviar el enlace\n' +
                    '┃ de tu canal de WhatsApp.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplo:\n' +
                    '┃ .setcanal https://whatsapp.com/channel/XXXXXXXX\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            // ------------------------------------------------
            // VALIDAR
            // ------------------------------------------------

            if (!validarCanal(url)) {

                return responder.texto(
                    '╭━━〔 ❌ 𝐄𝐍𝐋𝐀𝐂𝐄 𝐈𝐍𝐕Á𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ El enlace no parece ser\n' +
                    '┃ un canal válido de WhatsApp.\n' +
                    '┃\n' +
                    '┃ 📌 Debe comenzar con:\n' +
                    '┃ https://whatsapp.com/channel/\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            // ------------------------------------------------
            // GUARDAR
            // ------------------------------------------------

            guardarCanal(url);

            console.log(
                `[SETCANAL] Canal actualizado: ${url}`
            );

            // ------------------------------------------------
            // RESPUESTA
            // ------------------------------------------------

            return responder.texto(
                '╭━━〔 ✅ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Canal configurado correctamente.\n' +
                '┃\n' +
                '┃ 📢 El menú ahora mostrará\n' +
                '┃ el botón *Ver canal* al final.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        } catch (error) {

            console.error(
                '[SETCANAL] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            return responder.texto(
                '╭━━〔 ❌ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude guardar el canal.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};