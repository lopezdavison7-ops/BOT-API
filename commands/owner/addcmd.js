// ============================================================
// BOT-API
// COMANDO: ADDCMD (solo owner) — check de owner multi-fuente
// ============================================================
import fs from 'fs';
import path from 'path';

const OWNER_PRINCIPAL = '50578391933'; // ← tu número, crack
const RUTA_OWNER = path.join(process.cwd(), 'database', 'owner.json');
const CARPETAS = ['NSFW', 'ai', 'downloads', 'economy', 'fun', 'gacha', 'group', 'interaction', 'owner', 'sticker', 'system', 'utils'];
const PROHIBIDO = [/child_process/, /process\.exit/, /rmSync/, /rmdirSync/];

// ---------- Utilidades de números ----------
function digits(s) { return String(s || '').replace(/\D/g, ''); }

function recolectar(v, out) {
    if (typeof v === 'string' || typeof v === 'number') {
        const d = digits(v);
        if (d.length > 5) out.push(d);
    } else if (Array.isArray(v)) {
        v.forEach(x => recolectar(x, out));
    } else if (v && typeof v === 'object') {
        Object.values(v).forEach(x => recolectar(x, out));
    }
}

// ---------- Fuente 1: database/owner.json ----------
function ownersDesdeJson() {
    try {
        if (!fs.existsSync(RUTA_OWNER)) return [];
        const out = [];
        recolectar(JSON.parse(fs.readFileSync(RUTA_OWNER, 'utf8')), out);
        return out;
    } catch (e) { return []; }
}

// ---------- Fuente 2: variables globales (como usan muchos .update) ----------
function ownersGlobales() {
    const out = [];
    const g = globalThis;
    recolectar(g.owner || [], out);
    recolectar(g.owners || [], out);
    recolectar(g.ownerNumber || [], out);
    recolectar(g.numOwner || [], out);
    recolectar(g.config?.owner || [], out);
    recolectar(g.settings?.owner || [], out);
    recolectar(g.db?.settings?.owners || [], out);
    return out;
}

// ---------- Fuente 3: config.js / settings.js del repo ----------
async function ownersDesdeConfig() {
    const rutas = ['../../config.js', '../../settings.js', '../../lib/config.js', '../../src/config.js'];
    for (const r of rutas) {
        try {
            const mod = await import(r);
            const c = mod.default || mod;
            const out = [];
            recolectar(c.owner || c.owners || c.ownerNumber || c.numOwner || [], out);
            if (out.length) return out;
        } catch (e) { /* no existe, sigue */ }
    }
    return [];
}

// ---------- CHECK FINAL (igual de flexible que tu .update) ----------
async function esOwner(sender) {
    const d = digits(sender);
    if (!d) return false;
    // Owner principal hardcodeado
    if (d === OWNER_PRINCIPAL) return true;
    // Todas las demás fuentes
    const todos = [...ownersDesdeJson(), ...ownersGlobales(), ...(await ownersDesdeConfig())];
    return todos.some(n => {
        if (n === d) return true;
        if (n.length < 6 || d.length < 6) return false;
        return d.endsWith(n) || n.endsWith(d);
    });
}

// ============================================================
// COMANDO PRINCIPAL
// ============================================================
export default {
    nombre: 'addcmd',
    categoria: 'Owner',
    alias: ['crearcomando', 'newcmd', 'addcomando'],
    descripcion: 'Crea un comando nuevo desde el chat (solo owner)',
    uso: '.addcmd carpeta/nombre/CÓDIGO',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;

        if (!(await esOwner(sender))) {
            return await responder.texto(
                '╭━━〔 🚫 𝐀𝐂𝐂𝐄𝐒𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃  Solo el owner puede crear comandos\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━'
            );
        }

        const raw = String(argumento || '').trim();
        const partes = raw.split('/');

        if (!raw || partes.length < 3) {
            return await responder.texto(
                '╭━━〔 🛠️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃  Uso: .addcmd carpeta/nombre/CÓDIGO\n' +
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
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━'
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

        if (!nombre) return await responder.texto('❌ Nombre de comando no válido.');
        if (!codigo) return await responder.texto('❌ Falta el código del comando.');

        if (!/export\s+default/.test(codigo)) {
            return await responder.texto(
                '╭━━〔 🛠️ 𝐃𝐃 𝐌𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ El código debe incluir:\n' +
                '┃ export default { nombre, ejecutar }\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        for (const regla of PROHIBIDO) {
            if (regla.test(codigo)) {
                return await responder.texto('🚫 Código bloqueado: instrucción prohibida detectada.');
            }
        }

        try {
            const dir = path.join(process.cwd(), 'commands', carpeta);
            fs.mkdirSync(dir, { recursive: true });
            const archivo = path.join(dir, nombre + '.js');

            if (fs.existsSync(archivo)) {
                return await responder.texto(
                    '╭━━〔 ️ 𝐀𝐃𝐃 𝐂𝐌𝐃 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ Ya existe:\n' +
                    '┃ commands/' + carpeta + '/' + nombre + '.js\n' +
                    '┃\n' +
                    '┃ Bórralo manual para reemplazarlo\n' +
                    '┃\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            fs.writeFileSync(archivo, codigo, 'utf8');

            // Prueba de sintaxis: si truena, se borra solo
            try {
                await import(archivo + '?t=' + Date.now());
            } catch (e) {
                try { fs.unlinkSync(archivo); } catch (e2) {}
                return await responder.texto(
                    '╭━━〔 🛠️ 𝐀𝐃 𝐌 〕━━\n' +
                    '┃\n' +
                    '┃ ❌ Error de sintaxis detectado\n' +
                    '┃ Archivo eliminado automáticamente\n' +
                    '┃\n' +
                    '┃ ' + String(e.message).slice(0, 150) + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━'
                );
            }

            await responder.texto(
                '╭━━〔 🛠️ 𝐀𝐃 𝐌 〕━━\n' +
                '┃\n' +
                '┃ ✅ Comando creado:\n' +
                '┃ 📁 commands/' + carpeta + '/' + nombre + '.js\n' +
                '┃\n' +
                '┃ 🔄 Reinicia para activarlo:\n' +
                '┃ pm2 restart alex-bot\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━'
            );

        } catch (error) {
            console.error('[ADDCMD] Error:', error?.stack || error?.message || error);
            await responder.texto('❌ Error al crear el comando: ' + (error.message || error));
        }
    }
};