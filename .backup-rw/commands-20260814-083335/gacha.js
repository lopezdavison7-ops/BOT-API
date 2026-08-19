import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURACIÓN
// ============================================================

const GACHA_DIR = path.join(__dirname, '../media/gacha/jpg');

// ============================================================
// RAREZAS
// ============================================================

const RAREZAS = [
    {
        nombre: 'COMÚN',
        emoji: '⚪',
        peso: 55,
        titulo: 'Una tirada común',
        mensaje: '¡Nada mal para empezar!'
    },
    {
        nombre: 'RARO',
        emoji: '🔵',
        peso: 28,
        titulo: '¡Tirada rara!',
        mensaje: '¡La suerte empieza a aparecer!'
    },
    {
        nombre: 'ÉPICO',
        emoji: '🟣',
        peso: 13,
        titulo: '¡¡TIRADA ÉPICA!!',
        mensaje: '¡Esto sí estuvo bueno!'
    },
    {
        nombre: 'LEGENDARIO',
        emoji: '🟡',
        peso: 4,
        titulo: '👑 ¡¡LEGENDARIO!! 👑',
        mensaje: '¡Una tirada extremadamente afortunada!'
    }
];

// ============================================================
// SELECCIONAR RAREZA
// ============================================================

function tirarRareza() {
    let numero = Math.random() * 100;

    for (const rareza of RAREZAS) {
        if (numero < rareza.peso) {
            return rareza;
        }

        numero -= rareza.peso;
    }

    return RAREZAS[0];
}

// ============================================================
// OBTENER IMÁGENES
// ============================================================

function obtenerImagen() {
    if (!fs.existsSync(GACHA_DIR)) {
        throw new Error(
            `No existe la carpeta:\n${GACHA_DIR}`
        );
    }

    const archivos = fs
        .readdirSync(GACHA_DIR)
        .filter((archivo) => /\.(jpg|jpeg)$/i.test(archivo));

    if (archivos.length === 0) {
        throw new Error(
            'No hay imágenes JPG/JPEG en media/gacha/jpg/.'
        );
    }

    const archivo =
        archivos[Math.floor(Math.random() * archivos.length)];

    return {
        nombre: archivo,
        ruta: path.join(GACHA_DIR, archivo),
        total: archivos.length
    };
}

// ============================================================
// CREAR MENSAJE DEL GACHA
// ============================================================

function crearMensaje(rareza, imagen) {
    let marco;

    if (rareza.nombre === 'LEGENDARIO') {
        marco =
`╔══════════════════════════════╗
║     👑  G A C H A  👑       ║
╠══════════════════════════════╣
║                              ║
║   🌟 ${rareza.titulo}
║                              ║
║   ${rareza.emoji} RAREZA: ${rareza.nombre}
║                              ║
║   ✨ ${rareza.mensaje}
║                              ║
║   🎴 CARTA OBTENIDA
║   └─ ${imagen.nombre}
║                              ║
║   📦 Colección: ${imagen.total} cartas
║                              ║
╚══════════════════════════════╝
       👑 ¡FELICIDADES! 👑`;

    } else if (rareza.nombre === 'ÉPICO') {
        marco =
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃       🔮  G A C H A  🔮      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                              ┃
┃   💜 ${rareza.titulo}
┃                              ┃
┃   ${rareza.emoji} RAREZA: ${rareza.nombre}
┃                              ┃
┃   ✨ ${rareza.mensaje}
┃                              ┃
┃   🎴 CARTA OBTENIDA
┃   └─ ${imagen.nombre}
┃                              ┃
┃   📦 Colección: ${imagen.total}
┃                              ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
          🔥 ¡BRUTAL! 🔥`;

    } else if (rareza.nombre === 'RARO') {
        marco =
`╭──────────────────────────────╮
│        💎 G A C H A 💎       │
├──────────────────────────────┤
│                              │
│   ✨ ${rareza.titulo}
│                              │
│   ${rareza.emoji} RAREZA: ${rareza.nombre}
│                              │
│   💫 ${rareza.mensaje}
│                              │
│   🎴 CARTA
│   └─ ${imagen.nombre}
│                              │
│   📦 ${imagen.total} cartas disponibles
│                              │
╰──────────────────────────────╯
          🍀 ¡SUERTE! 🍀`;

    } else {
        marco =
`╭──────────────────────────────╮
│          🎰 GACHA             │
├──────────────────────────────┤
│                              │
│   ✨ ${rareza.titulo}
│                              │
│   ${rareza.emoji} RAREZA: ${rareza.nombre}
│                              │
│   💫 ${rareza.mensaje}
│                              │
│   🎴 CARTA
│   └─ ${imagen.nombre}
│                              │
│   📦 ${imagen.total} cartas disponibles
│                              │
╰──────────────────────────────╯
        🌙 ¡Sigue tirando! 🌙`;
    }

    return marco;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'gacha',
    categoria: 'Diversión',

    alias: [
        'tirada',
        'roll'
    ],

    descripcion:
        'Realiza una tirada Gacha con imágenes locales.',

    ejecutar: async ({ responder }) => {
        try {
            // Elegir imagen
            const imagen = obtenerImagen();

            // Elegir rareza
            const rareza = tirarRareza();

            console.log(
                `[COMANDO gacha] Imagen: ${imagen.nombre}`
            );

            console.log(
                `[COMANDO gacha] Rareza: ${rareza.nombre}`
            );

            // Leer imagen
            const buffer = fs.readFileSync(imagen.ruta);

            if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
                throw new Error(
                    'La imagen seleccionada no es válida.'
                );
            }

            // Crear diseño
            const mensaje = crearMensaje(
                rareza,
                imagen
            );

            // Enviar imagen
            await responder.imagen(
                buffer,
                mensaje
            );

            console.log(
                '[COMANDO gacha] ✓ Imagen enviada correctamente.'
            );

        } catch (error) {
            console.error(
                '[COMANDO gacha] Error:',
                error
            );

            try {
                await responder.texto(
                    `❌ *GACHA*\n\n` +
                    `No se pudo completar la tirada.\n\n` +
                    `⚠️ ${error.message}`
                );
            } catch (errorTexto) {
                console.error(
                    '[COMANDO gacha] Error enviando aviso:',
                    errorTexto
                );
            }
        }
    }
};
