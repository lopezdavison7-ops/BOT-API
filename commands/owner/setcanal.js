import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// ARCHIVO DONDE SE GUARDA EL CANAL
// ============================================================

const DATA_DIR = path.join(
    process.cwd(),
    'database'
);

const CANAL_FILE = path.join(
    DATA_DIR,
    'canal.json'
);

// ============================================================
// CREAR CARPETA / ARCHIVO SI NO EXISTEN
// ============================================================

function prepararArchivo() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, {
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
            )
        );
    }
}

// ============================================================
// LEER CANAL
// ============================================================

export function obtenerCanal() {
    try {
        prepararArchivo();

        const data = JSON.parse(
            fs.readFileSync(
                CANAL_FILE,
                'utf8'
            )
        );

        return typeof data.url === 'string'
            ? data.url
            : '';
    } catch {
        return '';
    }
}

// ============================================================
// GUARDAR CANAL
// ============================================================

function guardarCanal(url) {
    prepararArchivo();

    fs.writeFileSync(
        CANAL_FILE,
        JSON.stringify(
            {
                url
            },
            null,
            2
        )
    );
}

// ============================================================
// COMPROBAR OWNER
// ============================================================

function limpiarNumero(numero) {
    return String(numero || '')
        .replace(/\D/g, '');
}

function obtenerNumeroJid(jid) {
    return limpiarNumero(
        String(jid || '').split('@')[0]
    );
}

function esOwner(msg) {
    const sender = obtenerNumeroJid(
        msg?.key?.participant ||
        msg?.participant ||
        msg?.sender ||
        ''
    );

    // Intentar usar el sistema de owners existente.
    try {
        if (
            typeof global.esOwner === 'function'
        ) {
            return Boolean(
                global.esOwner(msg)
            );
        }
    } catch {}

    // Owners dinámicos.
    const owners = [];

    if (Array.isArray(global.owners)) {
        owners.push(...global.owners);
    }

    if (Array.isArray(global.owner)) {
        owners.push(...global.owner);
    }

    if (typeof global.owner === 'string') {
        owners.push(global.owner);
    }

    if (typeof global.OWNER_NUMBER === 'string') {
        owners.push(global.OWNER_NUMBER);
    }

    if (typeof process.env.OWNER_NUMBER === 'string') {
        owners.push(process.env.OWNER_NUMBER);
    }

    return owners.some(
        owner =>
            limpiarNumero(owner) === sender
    );
}

// ============================================================
// COMANDO .SETCANAL
// ============================================================

export default {
    nombre: 'setcanal',

    categoria: 'Owner',

    alias: [
        'setchannel',
        'canal'
    ],

    descripcion:
        'Configura el enlace del canal que aparecerá como botón en el menú.',

    ejecutar: async ({
        msg,
        text,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // COMPROBAR OWNER
            // ------------------------------------------------

            if (!esOwner(msg)) {

                await responder.texto(
                    '🔐 *ACCESO DENEGADO*\n\n' +
                    'Este comando es exclusivo del Owner.'
                );

                return;
            }

            // ------------------------------------------------
            // OBTENER TEXTO
            // ------------------------------------------------

            const url = String(
                text || ''
            ).trim();

            // ------------------------------------------------
            // MOSTRAR CANAL ACTUAL
            // ------------------------------------------------

            if (!url) {

                const actual =
                    obtenerCanal();

                if (!actual) {

                    await responder.texto(
                        '📢 *CANAL NO CONFIGURADO*\n\n' +
                        'Usa:\n' +
                        '*.setcanal https://whatsapp.com/channel/...*'
                    );

                    return;
                }

                await responder.texto(
                    '📢 *CANAL ACTUAL*\n\n' +
                    `${actual}`
                );

                return;
            }

            // ------------------------------------------------
            // VALIDAR URL
            // ------------------------------------------------

            if (
                !/^https?:\/\/(www\.)?whatsapp\.com\/channel\//i.test(
                    url
                )
            ) {

                await responder.texto(
                    '❌ *ENLACE INVÁLIDO*\n\n' +
                    'Debes colocar un enlace de canal de WhatsApp.\n\n' +
                    'Ejemplo:\n' +
                    '*.setcanal https://whatsapp.com/channel/XXXXXXXX*'
                );

                return;
            }

            // ------------------------------------------------
            // GUARDAR
            // ------------------------------------------------

            guardarCanal(url);

            console.log(
                `[SETCANAL] ✓ Canal actualizado: ${url}`
            );

            await responder.texto(
                '✅ *CANAL ACTUALIZADO*\n\n' +
                'El menú ahora utilizará el botón:\n' +
                '▸ *VER CANAL*\n\n' +
                '🔗 Enlace guardado correctamente.'
            );

        } catch (error) {

            console.error(
                '[SETCANAL] Error:',
                error
            );

            try {

                await responder.texto(
                    '❌ *ERROR*\n\n' +
                    'No se pudo guardar el canal.'
                );

            } catch {}
        }
    }
};