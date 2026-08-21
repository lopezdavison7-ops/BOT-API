// ============================================================
// COMANDO: SETCANAL
// ALEX BOT / BOT-API
// ============================================================
// Configura el canal oficial que aparecerá como botón
// "Ver canal" al final del menú.
// Solo Owners pueden utilizar este comando.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { esOwner } from '../../system/owner.js';

// ============================================================
// RUTAS
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_CANAL = path.join(
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

    const carpeta =
        path.dirname(ARCHIVO_CANAL);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO_CANAL)) {

        fs.writeFileSync(
            ARCHIVO_CANAL,
            JSON.stringify(
                {
                    canal: ''
                },
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// CARGAR CANAL
// ============================================================

function cargarCanal() {

    asegurarArchivo();

    try {

        const datos =
            JSON.parse(
                fs.readFileSync(
                    ARCHIVO_CANAL,
                    'utf8'
                )
            );

        return {
            canal:
                typeof datos?.canal === 'string'
                    ? datos.canal.trim()
                    : ''
        };

    } catch (error) {

        console.error(
            '[SETCANAL] Error leyendo canal.json:',
            error.message
        );

        return {
            canal: ''
        };
    }
}

// ============================================================
// GUARDAR CANAL
// ============================================================

function guardarCanal(url) {

    asegurarArchivo();

    fs.writeFileSync(
        ARCHIVO_CANAL,
        JSON.stringify(
            {
                canal: url
            },
            null,
            2
        ),
        'utf8'
    );
}

// ============================================================
// VALIDAR ENLACE
// ============================================================

function validarCanal(url) {

    if (!url) {
        return false;
    }

    try {

        const enlace =
            new URL(url);

        if (
            enlace.protocol !== 'https:' &&
            enlace.protocol !== 'http:'
        ) {
            return false;
        }

        const host =
            enlace.hostname
                .toLowerCase()
                .replace(/^www\./, '');

        const esWhatsApp =
            host === 'whatsapp.com' &&
            enlace.pathname
                .toLowerCase()
                .startsWith('/channel/');

        const esWaMe =
            host === 'wa.me' &&
            enlace.pathname
                .toLowerCase()
                .startsWith('/channel/');

        return esWhatsApp || esWaMe;

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

        // ----------------------------------------------------
        // COMPROBAR OWNER
        // ----------------------------------------------------

        if (!esOwner(msg)) {

            await responder.texto(
                '╭━━〔 🔐 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Solo los propietarios\n' +
                '┃ pueden usar este comando.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;
        }

        // ----------------------------------------------------
        // OBTENER ARGUMENTO
        // ----------------------------------------------------

        const url =
            argumento?.trim();

        // ----------------------------------------------------
        // MOSTRAR CANAL ACTUAL
        // ----------------------------------------------------

        if (!url) {

            const actual =
                cargarCanal().canal;

            if (actual) {

                await responder.texto(
                    '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📌 Canal configurado:\n' +
                    `┃ ${actual}\n` +
                    '┃\n' +
                    '┃ 💡 Para cambiarlo:\n' +
                    '┃ .setcanal <enlace>\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

            } else {

                await responder.texto(
                    '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ No hay ningún canal configurado.\n' +
                    '┃\n' +
                    '┃ 📌 Uso:\n' +
                    '┃ .setcanal https://whatsapp.com/channel/...\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            return;
        }

        // ----------------------------------------------------
        // VALIDAR URL
        // ----------------------------------------------------

        if (!validarCanal(url)) {

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ El enlace no parece ser\n' +
                '┃ un canal válido de WhatsApp.\n' +
                '┃\n' +
                '┃ 📌 Ejemplo:\n' +
                '┃ .setcanal https://whatsapp.com/channel/...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;
        }

        // ----------------------------------------------------
        // GUARDAR
        // ----------------------------------------------------

        try {

            guardarCanal(url);

            await responder.texto(
                '╭━━〔 ✅ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Canal configurado correctamente.\n' +
                '┃\n' +
                '┃ 📢 Ahora aparecerá el botón\n' +
                '┃ 「 Ver canal 」 al final del menú.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            console.log(
                `[SETCANAL] Canal actualizado: ${url}`
            );

        } catch (error) {

            console.error(
                '[SETCANAL] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
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