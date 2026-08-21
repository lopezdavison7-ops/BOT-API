import fs from 'fs';
import path from 'path';
import os from 'os';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================
// PACKAGE.JSON
// ============================================================

const pkgPath = join(
    process.cwd(),
    'package.json'
);

let pkg = {
    version: '2.0.0'
};

try {
    pkg = JSON.parse(
        readFileSync(
            pkgPath,
            'utf8'
        )
    );
} catch {}

// ============================================================
// ARCHIVO DEL CANAL
// ============================================================

const CANAL_FILE = path.join(
    process.cwd(),
    'database',
    'canal.json'
);

// ============================================================
// LEER CANAL
// ============================================================

function obtenerCanal() {

    try {

        if (
            !fs.existsSync(
                CANAL_FILE
            )
        ) {
            return '';
        }

        const data =
            JSON.parse(
                fs.readFileSync(
                    CANAL_FILE,
                    'utf8'
                )
            );

        return typeof data.url === 'string'
            ? data.url.trim()
            : '';

    } catch {

        return '';
    }
}

// ============================================================
// FORMATEAR UPTIME
// ============================================================

function clockString(ms) {

    const segundos =
        Math.floor(ms / 1000);

    const dias =
        Math.floor(
            segundos / 86400
        );

    const horas =
        Math.floor(
            (segundos % 86400) / 3600
        );

    const minutos =
        Math.floor(
            (segundos % 3600) / 60
        );

    const secs =
        segundos % 60;

    return (
        `${dias}d ` +
        `${horas}h ` +
        `${minutos}m ` +
        `${secs}s`
    );
}

// ============================================================
// FECHA
// ============================================================

function obtenerFecha() {

    const ahora =
        new Date();

    return ahora.toLocaleDateString(
        'es-NI',
        {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }
    );
}

// ============================================================
// HORA
// ============================================================

function obtenerHora() {

    const ahora =
        new Date();

    return ahora.toLocaleTimeString(
        'es-NI',
        {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }
    );
}

// ============================================================
// NÚMERO DEL USUARIO
// ============================================================

function obtenerNumero(msg) {

    const jid =
        msg?.key?.participant ||
        msg?.participant ||
        msg?.sender ||
        '';

    return String(jid)
        .split('@')[0]
        .replace(/\D/g, '');
}

// ============================================================
// TOTAL DE COMANDOS
// ============================================================

function obtenerTotalComandos() {

    if (
        global.commands &&
        typeof global.commands.size === 'number'
    ) {
        return global.commands.size;
    }

    return 0;
}

// ============================================================
// RAM
// ============================================================

function obtenerRAM() {

    const memoria =
        process.memoryUsage();

    return (
        memoria.rss /
        1024 /
        1024
    ).toFixed(1);
}

// ============================================================
// CATEGORÍAS
// ============================================================

function obtenerCategorias() {

    const categorias = {};

    if (
        !global.commands ||
        typeof global.commands.entries !== 'function'
    ) {
        return categorias;
    }

    for (
        const [, cmd]
        of global.commands.entries()
    ) {

        if (!cmd) {
            continue;
        }

        const categoria =
            String(
                cmd.categoria ||
                cmd.category ||
                'General'
            ).trim();

        if (
            categoria.toLowerCase() ===
            'owner'
        ) {
            continue;
        }

        if (
            !categorias[categoria]
        ) {
            categorias[categoria] =
                [];
        }

        const nombre =
            cmd.nombre ||
            cmd.name;

        if (!nombre) {
            continue;
        }

        let texto =
            `.${nombre}`;

        const alias =
            cmd.alias ||
            cmd.aliases;

        if (
            Array.isArray(alias) &&
            alias.length
        ) {

            const aliasTexto =
                alias
                    .filter(Boolean)
                    .map(
                        a => `.${a}`
                    )
                    .join(' ');

            texto +=
                ` • ${aliasTexto}`;
        }

        if (
            !categorias[categoria]
                .includes(texto)
        ) {

            categorias[categoria]
                .push(texto);
        }
    }

    return categorias;
}

// ============================================================
// CONSTRUIR MENÚ
// ============================================================

function construirMenu(msg) {

    const numero =
        obtenerNumero(msg);

    const fecha =
        obtenerFecha();

    const hora =
        obtenerHora();

    const uptime =
        clockString(
            process.uptime() * 1000
        );

    const comandos =
        obtenerTotalComandos();

    const ram =
        obtenerRAM();

    let menu = '';

    // --------------------------------------------------------
    // ENCABEZADO
    // --------------------------------------------------------

    menu +=
`\n╭━━〔 🚀 𝐁𝐎𝐓-𝐀𝐏𝐈 2.0 〕━━⬣
┃
┃ 👋 𝐇𝐎𝐋𝐀 @${numero}
┃
┃ 📅 𝐅𝐄𝐂𝐇𝐀 › ${fecha}
┃ 🕐 𝐇𝐎𝐑𝐀 › ${hora}
┃
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 ⚡ 𝐈𝐍𝐅𝐎 〕━━⬣
┃
┃ 👨‍💻 𝐂𝐑𝐄𝐀𝐃𝐎𝐑 › Luis González
┃ 📦 𝐕𝐄𝐑𝐒𝐈Ó𝐍 › ${pkg.version}
┃ ⚙️ 𝐂𝐎𝐌𝐀𝐍𝐃𝐎𝐒 › ${comandos}
┃ 🟢 𝐄𝐒𝐓𝐀𝐃𝐎 › Online
┃ 🔧 𝐏𝐑𝐄𝐅𝐈𝐉𝐎 › .
┃ ⏱️ 𝐔𝐏𝐓𝐈𝐌𝐄 › ${uptime}
┃ 💾 𝐑𝐀𝐌 › ${ram} MB
┃
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 📋 𝐌𝐄𝐍Ú 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋 〕━━⬣
┃
┃ ✦ Usa *.menu* para volver a abrir
┃ ✦ Usa *.menu <categoría>* para ver una categoría
┃
╰━━━━━━━━━━━━━━━━⬣

`;

    // --------------------------------------------------------
    // CATEGORÍAS
    // --------------------------------------------------------

    const categorias =
        obtenerCategorias();

    for (
        const [categoria, comandosLista]
        of Object.entries(categorias)
    ) {

        menu +=
`\n╭━━〔 ${categoria.toUpperCase()} 〕━━⬣
┃
`;

        for (
            const comando
            of comandosLista
        ) {

            menu +=
`┃ ✦ ${comando}
`;
        }

        menu +=
`┃
┃ ➜ Usa *.menu ${categoria.toLowerCase()}*
╰━━━━━━━━━━━━━━━━⬣

`;
    }

    // --------------------------------------------------------
    // FOOTER
    // --------------------------------------------------------

    menu +=
`╭━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━⬣
┃
┃ 🚀 Rápido
┃ 🔒 Seguro
┃ 💫 Evolutivo
┃
╰━━━━━━━━━━━━━━━━⬣`;

    return menu;
}

// ============================================================
// COMANDO MENU
// ============================================================

export default {

    nombre: 'menu',

    categoria: 'Sistema',

    alias: [
        'help',
        'comandos',
        'h'
    ],

    descripcion:
        'Muestra el menú completo del bot.',

    ejecutar: async ({
        msg,
        text,
        responder,
        conn
    }) => {

        try {

            const categorias =
                obtenerCategorias();

            const consulta =
                String(
                    text || ''
                )
                .trim()
                .toLowerCase();

            // ------------------------------------------------
            // SI PIDIERON UNA CATEGORÍA
            // ------------------------------------------------

            let menu =
                construirMenu(msg);

            if (
                consulta &&
                categorias
            ) {

                const encontrada =
                    Object.entries(
                        categorias
                    ).find(
                        ([nombre]) =>
                            nombre
                                .toLowerCase() ===
                            consulta
                    );

                if (encontrada) {

                    const [
                        nombre,
                        lista
                    ] = encontrada;

                    menu =
`\n╭━━〔 ${nombre.toUpperCase()} 〕━━⬣
┃
`;

                    for (
                        const comando
                        of lista
                    ) {

                        menu +=
`┃ ✦ ${comando}
`;
                    }

                    menu +=
`┃
╰━━━━━━━━━━━━━━━━⬣

> © 2026 BOT-API • Creado por Luis González`;
                }
            }

            const canal =
                obtenerCanal();

            // ------------------------------------------------
            // BOTÓN REAL DE WHATSAPP
            // ------------------------------------------------

            if (
                canal &&
                responder &&
                typeof responder.botones ===
                'function'
            ) {

                await responder.botones(
                    menu,
                    [
                        {
                            text: 'VER CANAL',
                            url: canal
                        }
                    ]
                );

                return;
            }

            // ------------------------------------------------
            // COMPATIBILIDAD CON sendButtonMessage
            // ------------------------------------------------

            if (
                canal &&
                conn &&
                typeof conn.sendButtonMessage ===
                'function'
            ) {

                await conn.sendButtonMessage(
                    msg.key.remoteJid,
                    menu,
                    [
                        {
                            text: 'VER CANAL',
                            url: canal
                        }
                    ],
                    {
                        quoted: msg
                    }
                );

                return;
            }

            // ------------------------------------------------
            // ÚLTIMO RECURSO
            // ------------------------------------------------

            await responder.texto(
                menu
            );

        } catch (error) {

            console.error(
                '[MENU] Error:',
                error
            );

            try {

                await responder.texto(
                    '❌ *ERROR AL MOSTRAR EL MENÚ*\n\n' +
                    'Revisa la consola del bot para ver el error.'
                );

            } catch {}
        }
    }
};