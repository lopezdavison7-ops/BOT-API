// commands/owner/delcmd.js
// ============================================================
// COMANDO: DELCMD (solo owner)
// ============================================================
// Elimina comandos creados desde el chat.
//
// Ejemplos:
// .delcmd fun/hola
// .delcmd economy/dar
// .delcmd NSFW/r34
// ============================================================
import fs from 'fs';
import path from 'path';
import { esOwner } from '../../lib/owner.js';

const CARPETAS = ['NSFW', 'ai', 'downloads', 'economy', 'fun', 'gacha', 'group', 'interaction', 'owner', 'sticker', 'system', 'utils'];

export default {
    nombre: 'delcmd',
    categoria: 'Owner',
    alias: ['deletecmd', 'removecmd', 'borrarcomando'],
    owner: true,
    descripcion: 'Elimina un comando existente (solo owner)',
    uso: '.delcmd carpeta/nombre',
    ejecutar: async ({ msg, argumento, responder }) => {

        // ----------------------------------------------------
        // SOLO OWNER
        // ----------------------------------------------------
        if (!esOwner(msg)) {
            await responder.texto('❌ Este comando es solo para el Owner.');
            return;
        }

        const raw = String(argumento || '').trim();
        const partes = raw.split('/').filter(Boolean);

        if (!raw || partes.length !== 2) {
            return await responder.texto(
                '╭━━〔 🗑️ 𝐃𝐄𝐋 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Uso: .delcmd carpeta/nombre\n' +
                '┃\n' +
                '┃ 📁 Carpetas:\n' +
                '┃ ' + CARPETAS.join(', ') + '\n' +
                '┃\n' +
                '┃ 📝 Ejemplos:\n' +
                '┃ .delcmd fun/hola\n' +
                '┃ .delcmd economy/dar\n' +
                '┃ .delcmd NSFW/r34\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const carpeta = partes[0].trim();
        const nombre = partes[1].trim().replace(/\.js$/i, '').toLowerCase();

        if (!CARPETAS.includes(carpeta)) {
            return await responder.texto(
                '╭━━〔 🗑️ 𝐃𝐄𝐋 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Carpeta no válida: *' + carpeta + '*\n' +
                '┃\n' +
                '┃ 📁 Válidas:\n' +
                '┃ ' + CARPETAS.join(', ') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!nombre) {
            return await responder.texto('❌ Nombre de comando no válido.');
        }

        try {
            const archivo = path.join(process.cwd(), 'commands', carpeta, nombre + '.js');

            if (!fs.existsSync(archivo)) {
                return await responder.texto(
                    '╭━━〔 🗑️ 𝐃𝐄𝐋 𝐂𝐌𝐃 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ No existe:\n' +
                    '┃ commands/' + carpeta + '/' + nombre + '.js\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // Protección: no dejar borrar comandos del sistema
            const comandosProtegidos = ['update', 'owner', 'addcmd', 'delcmd', 'setowner', 'delowner'];
            if (carpeta === 'owner' && comandosProtegidos.includes(nombre)) {
                return await responder.texto(
                    '╭━━〔 🗑️ 𝐃𝐄𝐋 𝐂𝐌𝐃 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 🚫 No puedes eliminar:\n' +
                    '┃ commands/owner/' + nombre + '.js\n' +
                    '┃\n' +
                    '┃ Es un comando protegido del sistema\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            fs.unlinkSync(archivo);

            await responder.texto(
                '╭━━〔 🗑️ 𝐃𝐄𝐋 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Comando eliminado:\n' +
                '┃ 📁 commands/' + carpeta + '/' + nombre + '.js\n' +
                '┃\n' +
                '┃ 🔄 Reinicia el bot para aplicar:\n' +
                '┃ pm2 restart alex-bot\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

        } catch (error) {
            console.error('[DELCMD] Error:', error?.stack || error?.message || error);
            await responder.texto('❌ Error al eliminar el comando: ' + (error.message || error));
        }
    }
};