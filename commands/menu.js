// ============================================================
// MENÚ PRINCIPAL - ALEX BOT
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FOTO_MENU = path.join(
    __dirname,
    '..',
    'media',
    'menu',
    'menu.jpg'
);

export default {
    nombre: 'menu',
    categoria: 'Utilidades',
    alias: ['ayuda', 'help'],
    descripcion: 'Muestra todos los comandos disponibles',

    async ejecutar({
        sock,
        msg,
        responder,
        listaComandos,
        prefijo
    }) {

        // ====================================================
        // ORDEN DE CATEGORÍAS
        // ====================================================

        const orden = [
            'Owner',
            'Administrador',
            'Grupos',
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
            const categoria = cmd.categoria || 'Otros';

            if (!grupos[categoria]) {
                grupos[categoria] = [];
            }

            grupos[categoria].push(cmd);
        }

        // ====================================================
        // ENCABEZADO
        // ====================================================

        let texto =
            '╭━━━〔 🤖 *ALEX BOT* 〕━━━╮\n' +
            '┃\n' +
            '┃ ⚡ *Bot de WhatsApp*\n' +
            '┃ 🚀 Rápido • Estable • Completo\n' +
            '┃ 📚 Menú de comandos\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n';

        // ====================================================
        // CATEGORÍAS
        // ====================================================

        const categorias = [
            ...orden.filter(c => grupos[c]),
            ...Object.keys(grupos).filter(
                c => !orden.includes(c)
            )
        ];

        for (const categoria of categorias) {

            texto +=
                `\n╭──〔 ${obtenerIcono(categoria)} *${categoria.toUpperCase()}* 〕\n`;

            for (const cmd of grupos[categoria]) {

                const descripcion =
                    cmd.descripcion ||
                    'Sin descripción disponible.';

                texto +=
                    `│\n` +
                    `│ ✦ *${prefijo}${cmd.nombre}*\n` +
                    `│   ↳ ${descripcion}\n`;
            }

            texto +=
                '│\n' +
                '╰──────────────────\n';
        }

        // ====================================================
        // PIE DEL MENÚ
        // ====================================================

        texto +=
            '\n╭──〔 📖 *CÓMO USAR* 〕\n' +
            `│ ✦ Escribe *${prefijo}<menu>*\n` +
            '│ ✦ Ejemplo: *.ping*\n' +
            '│ ✦ Usa *.help* para volver a ver este menú\n' +
            '╰──────────────────\n\n' +
            '🌙 *ALEX BOT*';

        // ====================================================
        // COMPROBAR IMAGEN
        // ====================================================

        if (!fs.existsSync(FOTO_MENU)) {

            console.error(
                `[MENU FOTO] No existe: ${FOTO_MENU}`
            );

            await responder.texto(texto);
            return;
        }

        // ====================================================
        // ENVIAR IMAGEN
        // ====================================================

        try {

            const stats = fs.statSync(FOTO_MENU);

            console.log(
                `[MENU FOTO] Archivo encontrado: ${stats.size} bytes`
            );

            console.log(
                `[MENU FOTO] Enviando: ${FOTO_MENU}`
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
                '[MENU FOTO] Foto enviada correctamente.'
            );

        } catch (error) {

            console.error(
                '[MENU FOTO] ERROR AL ENVIAR'
            );

            console.error(
                error?.stack ||
                error?.message ||
                error
            );

            // Si falla la imagen, todavía enviamos el menú
            // como texto para que el comando no quede inutilizado.

            try {
                await responder.texto(texto);
            } catch (textoError) {
                console.error(
                    '[MENU] También falló el envío de texto:',
                    textoError?.message || textoError
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
        Owner: '👑',
        Administrador: '🛡️',
        Grupos: '👥',
        Multimedia: '🎵',
        Diversión: '🎮',
        Utilidades: '🛠️',
        Descargas: '📥',
        Otros: '📦'
    };

    return iconos[categoria] || '📦';
}
