import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
    registrarRW,
    puedeUsarRW,
    tiempoRestanteRW
} from '../database/economia.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RW_DIR = path.join(
    __dirname,
    '../media/gacha/jpg'
);

// ============================================================
// OBTENER IMÁGENES
// ============================================================

function obtenerImagenes() {

    if (!fs.existsSync(RW_DIR)) {
        throw new Error(
            'No existe la carpeta de imágenes.'
        );
    }

    const archivos = fs
        .readdirSync(RW_DIR)
        .filter(
            archivo =>
                /\.(jpg|jpeg)$/i.test(archivo)
        );

    if (archivos.length === 0) {
        throw new Error(
            'No hay imágenes disponibles.'
        );
    }

    return archivos;
}

// ============================================================
// ELEGIR IMAGEN ALEATORIA
// ============================================================

function elegirImagen() {

    const imagenes =
        obtenerImagenes();

    const nombre =
        imagenes[
            Math.floor(
                Math.random() * imagenes.length
            )
        ];

    return {
        nombre,
        ruta: path.join(
            RW_DIR,
            nombre
        ),
        total: imagenes.length
    };
}

// ============================================================
// FORMATEAR TIEMPO
// ============================================================

function formatearTiempo(
    milisegundos
) {

    const totalSegundos =
        Math.ceil(
            milisegundos / 1000
        );

    const horas =
        Math.floor(
            totalSegundos / 3600
        );

    const minutos =
        Math.floor(
            (totalSegundos % 3600) / 60
        );

    const segundos =
        totalSegundos % 60;

    const partes = [];

    if (horas > 0) {
        partes.push(
            `${horas} hora${horas !== 1 ? 's' : ''}`
        );
    }

    if (minutos > 0) {
        partes.push(
            `${minutos} minuto${minutos !== 1 ? 's' : ''}`
        );
    }

    if (
        segundos > 0 &&
        horas === 0
    ) {
        partes.push(
            `${segundos} segundo${segundos !== 1 ? 's' : ''}`
        );
    }

    return partes.join(' y ');
}

// ============================================================
// MENSAJE DE RECOMPENSA
// ============================================================

function crearMensaje(total) {

    return (
`╭──────────────────────────────╮
│       🎁 R E C O M P E N S A │
├──────────────────────────────┤
│                              │
│   ✨ ¡HAS RECIBIDO UNA       │
│      RECOMPENSA ALEATORIA!   │
│                              │
│   🍀 ¡Disfruta tu premio!    │
│                              │
│   🎴 CARTA ALEATORIA         │
│                              │
│   📦 ${total} cartas disponibles
│                              │
╰──────────────────────────────╯
        🎉 ¡FELICIDADES! 🎉`
    );
}

// ============================================================
// COMANDO RW
// ============================================================

export default {

    nombre: 'rw',

    categoria: 'Diversión',

    alias: [
        'recompensa'
    ],

    descripcion:
        'Obtiene una recompensa aleatoria cada 4 horas.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.remoteJid;

        try {

            // ------------------------------------------------
            // COMPROBAR COOLDOWN
            // ------------------------------------------------

            if (
                !puedeUsarRW(id)
            ) {

                const restante =
                    tiempoRestanteRW(id);

                await responder.texto(
                    `⏳ *RECOMPENSA EN COOLDOWN*\n\n` +
                    `Ya utilizaste tu recompensa aleatoria.\n\n` +
                    `🎁 Podrás volver a usar *.rw* en:\n` +
                    `⏱️ *${formatearTiempo(restante)}*\n\n` +
                    `🍀 ¡Vuelve cuando esté disponible!`
                );

                return;
            }

            // ------------------------------------------------
            // ELEGIR IMAGEN
            // ------------------------------------------------

            const imagen =
                elegirImagen();

            // ------------------------------------------------
            // LEER IMAGEN
            // ------------------------------------------------

            const buffer =
                fs.readFileSync(
                    imagen.ruta
                );

            if (
                !Buffer.isBuffer(buffer) ||
                buffer.length === 0
            ) {

                throw new Error(
                    'La imagen no es válida.'
                );
            }

            // ------------------------------------------------
            // CREAR MENSAJE
            // ------------------------------------------------

            const mensaje =
                crearMensaje(
                    imagen.total
                );

            // ------------------------------------------------
            // ENVIAR IMAGEN
            // ------------------------------------------------

            await responder.imagen(
                buffer,
                mensaje
            );

            // ------------------------------------------------
            // REGISTRAR USO
            // SOLO SI LA IMAGEN SE ENVIÓ
            // ------------------------------------------------

            registrarRW(id);

            console.log(
                `[COMANDO rw] ✓ Recompensa enviada correctamente.`
            );

        } catch (error) {

            // ------------------------------------------------
            // ERROR INTERNO
            // No mostrar el error técnico al usuario
            // ------------------------------------------------

            console.error(
                '[COMANDO rw] Error:',
                error
            );

            // ------------------------------------------------
            // AVISO LIMPIO
            // ------------------------------------------------

            try {

                await responder.texto(
                    `⚠️ *RW*\n\n` +
                    `No se pudo enviar la recompensa en este momento.\n\n` +
                    `🍀 Inténtalo nuevamente más tarde.`
                );

            } catch (errorTexto) {

                console.error(
                    '[COMANDO rw] Error enviando aviso:',
                    errorTexto
                );
            }
        }
    }
};
EOF
