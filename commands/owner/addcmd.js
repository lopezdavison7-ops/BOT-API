// commands/owner/addcmd.js
// ============================================================
// COMANDO: ADDCMD (solo owner)
// ============================================================
// Crea comandos nuevos desde el chat sin tocar el servidor.
//
// Ejemplos:
// .addcmd fun/hola/export default { nombre: 'hola', categoria: 'Fun', alias: [], descripcion: 'Saluda', ejecutar: async ({ responder }) => { await responder.texto('Hola xd') } }
// .addcmd economy/dar/import db from "#db"; export default { nombre: 'dar', categoria: 'Economy', alias: [], descripcion: 'Da dinero', ejecutar: async ({ argumento, responder }) => { await responder.texto('Diste ' + argumento) } }
// ============================================================
import fs from 'fs';
import path from 'path';
import { esOwner } from '../../lib/owner.js';

const CARPETAS = ['NSFW', 'ai', 'downloads', 'economy', 'fun', 'gacha', 'group', 'interaction', 'owner', 'sticker', 'system', 'utils'];
const PROHIBIDO = [/child_process/, /process\.exit/, /rmSync/, /rmdirSync/, /format\s*\(/i];

export default {
    nombre: 'addcmd',
    categoria: 'Owner',
    alias: ['crearcomando', 'newcmd', 'addcomando'],
    owner: true,
    descripcion: 'Crea un comando nuevo desde el chat (solo owner)',
    uso: '.addcmd carpeta/nombre/CÓDIGO',
    ejecutar: async ({ msg, argumento, responder }) => {

        // ----------------------------------------------------
        // SOLO OWNER (igual que .update)
        // ----------------------------------------------------
        if (!esOwner(msg)) {
            await responder.texto('❌ Este comando es solo para el Owner.');
            return;
        }

        const raw = String(argumento || '').trim();
        const partes = raw.split('/');

        if (!raw || partes.length < 3) {
            return await responder.texto(
                '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Uso: .addcmd carpeta/nombre/CÓDIGO\n' +
                '┃\n' +
                '┃ 📁 Carpetas:\n' +
                '┃ ' + CARPETAS.join(', ') + '\n' +
                '┃\n' +
                '┃ 📝 Ejemplo:\n' +
                '┃ .addcmd fun/hola/export default {\n' +
                '┃   nombre: \'hola\',\n' +
                '┃   categoria: \'Fun\',\n' +
                '┃   alias: [],\n' +
                '┃   descripcion: \'Saluda\',\n' +
                '┃   ejecutar: async ({ responder }) => {\n' +
                '┃     await responder.texto(\'Hola xd\')\n' +
                '┃   }\n' +
                '┃ }\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const carpeta = partes[0].trim();
        const nombre = partes[1].trim().replace(/[^a-z0-9_-]/gi, '').toLowerCase();
        const codigo = partes.slice(2).join('/').trim();

        if (!CARPETAS.includes(carpeta)) {
            return await responder.texto(
                '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
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

        if (!codigo) {
            return await responder.texto('❌ Falta el código del comando.');
        }

        if (!/export\s+default/.test(codigo)) {
            return await responder.texto(
                '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ El código debe incluir:\n' +
                '┃ export default { nombre, ejecutar }\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        for (const regla of PROHIBIDO) {
            if (regla.test(codigo)) {
                return await responder.texto('🚫 Código bloqueado: contiene instrucción prohibida (' + regla + ').');
            }
        }

        try {
            const dir = path.join(process.cwd(), 'commands', carpeta);
            fs.mkdirSync(dir, { recursive: true });
            const archivo = path.join(dir, nombre + '.js');

            if (fs.existsSync(archivo)) {
                return await responder.texto(
                    '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ Ya existe:\n' +
                    '┃ commands/' + carpeta + '/' + nombre + '.js\n' +
                    '┃\n' +
                    '┃ Bórralo manual si quieres reemplazarlo\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            fs.writeFileSync(archivo, codigo, 'utf8');

            // Validación de sintaxis: importa el módulo en prueba
            try {
                await import(archivo + '?t=' + Date.now());
            } catch (e) {
                fs.unlinkSync(archivo);
                return await responder.texto(
                    '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Error de sintaxis detectado\n' +
                    '┃ Archivo eliminado automáticamente\n' +
                    '┃\n' +
                    '┃ ' + String(e.message).slice(0, 150) + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            await responder.texto(
                '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Comando creado:\n' +
                '┃ 📁 commands/' + carpeta + '/' + nombre + '.js\n' +
                '┃\n' +
                '┃ 🔄 Reinicia el bot para activarlo:\n' +
                '┃ pm2 restart alex-bot\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );

        } catch (error) {
            console.error('[ADDCMD] Error:', error?.stack || error?.message || error);
            await responder.texto('❌ Error al crear el comando: ' + (error.message || error));
        }
    }
};