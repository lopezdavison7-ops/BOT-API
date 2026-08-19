// ============================================================
// MENÚ PRINCIPAL - BOT-API
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = '1.0.0';
const CREADOR = 'Luis González';
const MOTOR = 'Baileys';

const FOTO_MENU = path.join(
    __dirname,
    '..',
    'media',
    'menu',
    'menu.jpg'
);

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'menu',

    categoria: 'Utilidades',

    alias: [
        'ayuda',
        'help'
    ],

    descripcion:
        'Muestra todos los comandos disponibles.',

    async ejecutar({
        sock,
        msg,
        responder,
        listaComandos,
        prefijo
    }) {

        try {

            // ====================================================
            // ORDEN DE CATEGORÍAS
            // ====================================================

            const orden = [
                'Owner',
                'Administrador',
                'Grupos',
                'Economia',
                'economia',
                'Multimedia',
                'Diversión',
                'Utilidades',
                'Descargas',
                'Otros'
            ];

            const grupos = {};

            // ====================================================
            // ORGANIZAR COMANDOS
            // ====================================================

            for (const cmd of listaComandos) {

                const categoria =
                    cmd.categoria || 'Otros';

                if (!grupos[categoria]) {
                    grupos[categoria] = [];
                }

                grupos[categoria].push(cmd);
            }

            // ====================================================
            // CATEGORÍAS DISPONIBLES
            // ====================================================

            const categorias = [
                ...orden.filter(
                    categoria => grupos[categoria]
                ),

                ...Object.keys(grupos).filter(
                    categoria =>
                        !orden.includes(categoria)
                )
            ];

            // ====================================================
            // INFORMACIÓN
            // ====================================================

            const cantidadComandos =
                listaComandos.length;

            // ====================================================
            // ENCABEZADO
            // ====================================================

            let texto =
                `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
                `┃       🌙 𝐁𝐎𝐓-𝐀𝐏𝐈       ┃\n` +
                `┃        𝐌𝐄𝐍𝐔́ 𝟐.𝟎        ┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +

                `┌─〔 ⚡ 𝐈𝐍𝐅𝐎 〕\n` +
                `│ 👨‍💻 Creador › ${CREADOR}\n` +
                `│ 📦 Versión › ${VERSION}\n` +
                `│ ⚙️ Motor    › ${MOTOR}\n` +
                `│ 📚 Comandos › ${cantidadComandos}\n` +
                `│ 🟢 Estado   › Online\n` +
                `│ 🔧 Prefijo  › ${prefijo}\n` +
                `└──────────────────────────\n\n`;

            // ====================================================
            // MENÚ DE CATEGORÍAS
            // ====================================================

            for (const categoria of categorias) {

                const comandos =
                    grupos[categoria];

                if (!comandos?.length) {
                    continue;
                }

                texto +=
                    `╭─〔 ${obtenerIcono(categoria)} ` +
                    `𝐄𝐂𝐎𝐍𝐎𝐌𝐈́𝐀 〕\n`;

                // Cambiar título según categoría
                texto =
                    texto.slice(
                        0,
                        texto.lastIndexOf(
                            `╭─〔 ${obtenerIcono(categoria)}`
                        )
                    ) +
                    `╭─〔 ${obtenerIcono(categoria)} ` +
                    `𝐄𝐂𝐎𝐍𝐎𝐌𝐈́𝐀 〕\n`;

                // =================================================
                // TÍTULO CORRECTO DE LA CATEGORÍA
                // =================================================

                const titulo =
                    obtenerNombreCategoria(
                        categoria
                    );

                const inicioCategoria =
                    texto.lastIndexOf(
                        `╭─〔 ${obtenerIcono(categoria)} 𝐄𝐂𝐎𝐍𝐎𝐌𝐈́𝐀 〕`
                    );

                if (inicioCategoria !== -1) {

                    texto =
                        texto.substring(
                            0,
                            inicioCategoria
                        ) +
                        `╭─〔 ${obtenerIcono(categoria)} ${titulo} 〕\n`;
                }

                // =================================================
                // COMANDOS
                // =================================================

                for (const cmd of comandos) {

                    const descripcion =
                        cmd.descripcion ||
                        'Sin descripción.';

                    texto +=
                        `│\n` +
                        `│ ✦ ${prefijo}${cmd.nombre}\n` +
                        `│   ↳ ${descripcion}\n`;
                }

                texto +=
                    `│\n` +
                    `╰──────────────────────────\n`;
            }

            // ====================================================
            // CÓMO USAR
            // ====================================================

            texto +=
                `\n╭─〔 📖 𝐂𝐎́𝐌𝐎 𝐔𝐒𝐀𝐑 〕\n` +
                `│ ✦ Escribe ${prefijo}<comando>\n` +
                `│ ✦ Ejemplo › ${prefijo}ping\n` +
                `│ ✦ ${prefijo}help › Volver al menú\n` +
                `╰──────────────────────────\n\n`;

            // ====================================================
            // PIE
            // ====================================================

            texto +=
                `╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮\n` +
                `┃       ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈       ┃\n` +
                `┃ 🚀 Rápido • 🔒 Seguro   ┃\n` +
                `┃ 💫 Siempre evolucionando ┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            // ====================================================
            // COMPROBAR FOTO
            // ====================================================

            if (!fs.existsSync(FOTO_MENU)) {

                console.error(
                    `[MENU FOTO] No existe: ${FOTO_MENU}`
                );

                await responder.texto(texto);

                return;
            }

            // ====================================================
            // ENVIAR FOTO + MENÚ
            // ====================================================

            const stats =
                fs.statSync(FOTO_MENU);

            console.log(
                `[MENU FOTO] Encontrado: ${stats.size} bytes`
            );

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    image: {
                        url: FOTO_MENU
                    },
                    caption: texto
                },
                {
                    quoted: msg,
                    mediaUploadTimeoutMs: 120000
                }
            );

            console.log(
                '[MENU FOTO] ✓ Menú enviado correctamente.'
            );

        } catch (error) {

            console.error(
                '[MENU] Error:',
                error
            );

            // ====================================================
            // FALLBACK A TEXTO
            // ====================================================

            try {

                await responder.texto(
                    `❌ *MENÚ*\n\n` +
                    `No se pudo enviar la imagen del menú.\n\n` +
                    `Puedes usar *${prefijo}help* nuevamente.`
                );

            } catch (errorTexto) {

                console.error(
                    '[MENU] Error enviando fallback:',
                    errorTexto
                );
            }
        }
    }
};

// ============================================================
// ICONOS DE CATEGORÍAS
// ============================================================

function obtenerIcono(categoria) {

    const iconos = {

        Owner:
            '👑',

        Administrador:
            '🛡️',

        Grupos:
            '👥',

        Economia:
            '💎',

        economia:
            '💎',

        Multimedia:
            '🎨',

        Diversión:
            '🎮',

        Utilidades:
            '🛠️',

        Descargas:
            '📥',

        Otros:
            '📦'
    };

    return (
        iconos[categoria] ||
        '📦'
    );
}

// ============================================================
// NOMBRES BONITOS DE CATEGORÍAS
// ============================================================

function obtenerNombreCategoria(categoria) {

    const nombres = {

        Owner:
            '𝐎𝐖𝐍𝐄𝐑',

        Administrador:
            '𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐃𝐎𝐑',

        Grupos:
            '𝐆𝐑𝐔𝐏𝐎𝐒',

        Economia:
            '𝐄𝐂𝐎𝐍𝐎𝐌𝐈́𝐀',

        economia:
            '𝐄𝐂𝐎𝐍𝐎𝐌𝐈́𝐀',

        Multimedia:
            '𝐌𝐔𝐋𝐓𝐈𝐌𝐄𝐃𝐈𝐀',

        Diversión:
            '𝐃𝐈𝐕𝐄𝐑𝐒𝐈𝐎́𝐍',

        Utilidades:
            '𝐔𝐓𝐈𝐋𝐈𝐃𝐀𝐃𝐄𝐒',

        Descargas:
            '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒',

        Otros:
            '𝐎𝐓𝐑𝐎𝐒'
    };

    return (
        nombres[categoria] ||
        categoria.toUpperCase()
    );
}
