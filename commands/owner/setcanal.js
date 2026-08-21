// ============================================================
// BOT-API
// COMANDO: SETCANAL
// ============================================================
// Configura el enlace oficial del canal de WhatsApp.
//
// Uso:
// .setcanal https://whatsapp.com/channel/XXXXXXXX
//
// Solo Owners pueden utilizarlo.
// El enlace se guarda en:
// database/canal.json
// ============================================================

import fs from 'fs';
import path from 'path';
import { esOwner } from '../../lib/owner.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const CANAL_FILE = path.join(
    process.cwd(),
    'database',
    'canal.json'
);

// ============================================================
// ASEGURAR DATABASE
// ============================================================

function asegurarArchivo() {

    const carpeta =
        path.dirname(CANAL_FILE);

    if (!fs.existsSync(carpeta)) {

        fs.mkdirSync(
            carpeta,
            {
                recursive: true
            }
        );
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
// VALIDAR URL
// ============================================================

function validarUrl(url) {

    try {

        const direccion =
            new URL(url);

        if (
            direccion.protocol !==
            'https:'
        ) {
            return false;
        }

        return true;

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
        'Configura el enlace del canal oficial del bot.',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        try {

            // ------------------------------------------------
            // COMPROBAR OWNER
            // ------------------------------------------------

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

            // ------------------------------------------------
            // OBTENER ARGUMENTO
            // ------------------------------------------------

            const url =
                String(
                    argumento || ''
                ).trim();

            if (!url) {

                await responder.texto(
                    '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Falta el enlace del canal.\n' +
                    '┃\n' +
                    '┃ 📌 Uso:\n' +
                    '┃ .setcanal https://whatsapp.com/channel/...\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // VALIDAR URL
            // ------------------------------------------------

            if (!validarUrl(url)) {

                await responder.texto(
                    '╭━━〔 ❌ 𝐄𝐍𝐋𝐀𝐂𝐄 𝐈𝐍𝐕Á𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ El enlace proporcionado\n' +
                    '┃ no es una URL válida.\n' +
                    '┃\n' +
                    '┃ Ejemplo:\n' +
                    '┃ https://whatsapp.com/channel/...\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // GUARDAR
            // ------------------------------------------------

            guardarCanal(url);

            // ------------------------------------------------
            // CONFIRMACIÓN
            // ------------------------------------------------

            await responder.texto(
                '╭━━〔 👑 𝐂𝐀𝐍𝐀𝐋 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Canal configurado correctamente.\n' +
                '┃\n' +
                `┃ 📢 ${url}\n` +
                '┃\n' +
                '┃ 💜 Ahora aparecerá en el menú\n' +
                '┃ como opción para visitar el canal.\n' +
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
                '❌ No pude guardar el enlace del canal.'
            );
        }
    }
};