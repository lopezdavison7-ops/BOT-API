import fs from 'fs/promises';
import path from 'path';

const GACHA_DIR = path.join(process.cwd(), 'media', 'gacha', 'jpg');
const MAX_FOTOS = 5;

function normalizar(s) {
    return String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

async function leerArchivos() {
    try {
        const entradas = await fs.readdir(GACHA_DIR);
        return entradas.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    } catch (e) {
        return [];
    }
}

function nombreBase(archivo) {
    return path.basename(archivo, path.extname(archivo)).replace(/[_\-\s]?\d+$/, '');
}

async function listarPersonajes() {
    const archivos = await leerArchivos();
    const set = new Set();
    for (const f of archivos) set.add(nombreBase(f));
    return Array.from(set).sort();
}

export default {
    nombre: 'cimagen',
    categoria: 'Gacha',
    alias: ['cimg', 'imagenes', 'fotos', 'gachafotos', 'personajefotos'],
    descripcion: 'Muestra varias fotos de un personaje del gacha',
    uso: '.cimagen <nombre del personaje>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const nombre = String(argumento || '').trim();

        if (!nombre) {
            const personajes = await listarPersonajes();

            let cap =
                '╭━━〔 🖼️ 𝐆𝐀𝐋𝐄𝐑Í𝐀 𝐆𝐀𝐂𝐇𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre del\n' +
                '┃    personaje\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .cimagen gojo\n' +
                '┃ ➪ .cimagen asta\n' +
                '┃\n';

            if (personajes.length) {
                cap += '┣━━〔 👥 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄𝐒 〕━━⬣\n┃\n';
                cap += '┃ ' + personajes.slice(0, 15).join(', ') + '\n┃\n';
            }

            cap += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            return await responder.texto(cap);
        }

        const archivos = await leerArchivos();

        if (!archivos.length) {
            return await responder.texto(
                '╭━━〔  𝐒𝐈𝐍 𝐅𝐎𝐓𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Aún no hay fotos en el\n' +
                '┃    gacha\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const n = normalizar(nombre);
        const coincidencias = archivos.filter(f =>
            normalizar(path.basename(f, path.extname(f))).includes(n)
        );

        if (!coincidencias.length) {
            const personajes = await listarPersonajes();

            return await responder.texto(
                '╭━━〔 ❌ 𝐍𝐎 𝐄𝐍𝐂𝐎𝐍𝐓𝐑𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ No hay fotos de *' + nombre + '*\n' +
                '┃\n' +
                '┃ 👥 Disponibles:\n' +
                '┃ ' + personajes.slice(0, 15).join(', ') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const seleccion = coincidencias.slice(0, MAX_FOTOS);

        const caption =
            '╭━━〔 🖼️ 𝐀𝐋𝐄𝐑Í𝐀 𝐆𝐀𝐂𝐇𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ 👤 Personaje › *' + nombre + '*\n' +
            '┃ 📸 Fotos encontradas › ' + coincidencias.length + '\n' +
            '┃ 🖼️ Mostrando › ' + seleccion.length + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        try {
            for (let i = 0; i < seleccion.length; i++) {
                const buffer = await fs.readFile(path.join(GACHA_DIR, seleccion[i]));

                if (i === 0) {
                    await sock.sendMessage(jid, {
                        image: buffer,
                        caption
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(jid, {
                        image: buffer
                    }, { quoted: msg });
                }
            }

            console.log(`[CIMAGEN] "${nombre}" → ${seleccion.length} fotos enviadas`);

        } catch (error) {
            console.error('[CIMAGEN] Error:', error?.message || error);
            await responder.texto('❌ Error al enviar las imágenes.');
        }
    }
};