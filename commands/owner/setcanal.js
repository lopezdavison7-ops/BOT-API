// ============================================================
// COMANDO: SETCANAL
// ALEX BOT / BOT-API
// Configura el enlace del canal que aparecerá en el menú.
// Solo Owners.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { esOwner } from '../../lib/owner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_CANAL = path.join(
    __dirname,
    '../../database/canal.json'
);

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {
    const carpeta = path.dirname(ARCHIVO_CANAL);

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
// COMANDO
// ============================================================

export default {
    nombre: 'setcanal',

    categoria: 'Owner',

    alias: [],

    descripcion:
        'Configura el enlace del canal que aparecerá en el menú.',

    async ejecutar({
        msg,
        responder,
        argumento
    }) {

        // ----------------------------------------------------
        // COMPROBAR OWNER
        // ----------------------------------------------------

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

        const enlace = argumento?.trim();

        // ----------------------------------------------------
        // SIN ENLACE
        // ----------------------------------------------------

        if (!enlace) {
            return responder.texto(
                '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ Usa el comando así:\n' +
                '┃\n' +
                '┃ › .setcanal https://whatsapp.com/channel/...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        // ----------------------------------------------------
        // VALIDAR ENLACE
        // ----------------------------------------------------

        let url;

        try {
            url = new URL(enlace);
        } catch {
            return responder.texto(
                '╭━━〔 ❌ 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ El enlace no es válido.\n' +
                '┃\n' +
                '┃ Ejemplo:\n' +
                '┃ https://whatsapp.com/channel/...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        // ----------------------------------------------------
        // GUARDAR
        // ----------------------------------------------------

        guardarCanal(url.toString());

        return responder.texto(
            '╭━━〔 📢 𝐒𝐄𝐓𝐂𝐀𝐍𝐀𝐋 〕━━⬣\n' +
            '┃\n' +
            '┃ ✅ Canal configurado correctamente.\n' +
            '┃\n' +
            '┃ 📢 El enlace aparecerá\n' +
            '┃ automáticamente en el menú.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};