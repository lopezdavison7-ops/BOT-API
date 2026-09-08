// commands/owner/update.js
// ============================================================
// COMANDO: UPDATE
// ============================================================
// Actualiza el bot desde GitHub sin romper nada:
//
// ✅ Si la carpeta NO es un repo git (tu error anterior), lo
//    convierte en repo automáticamente y descarga todo.
// ✅ Protege .env, config.js, auth_info, subbots, database y
//    media: el reset de git no puede borrar tus claves,
//    sesiones, owners ni fotos del menú.
// ✅ Detecta si package.json cambió y te avisa de reinstalar
//    dependencias.
// ✅ Si corre bajo PM2, se reinicia solo al terminar.
// ============================================================

import util from 'util';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { esOwner } from '../../lib/owner.js';

const execP = util.promisify(exec);

const REPO_URL = 'https://github.com/lopezdavison7-ops/BOT-API1.git';
const RAMA = 'main';

// Archivos/carpetas que NUNCA se pisan al actualizar
const PROTEGIDOS = [
    '.env',
    'config.js',
    'auth_info',
    'subbots',
    'database',
    'media'
];

const OPTS = {
    cwd: process.cwd(),
    maxBuffer: 1024 * 1024 * 10
};

// ============================================================
// HELPERS GIT
// ============================================================

async function git(cmd) {
    const { stdout, stderr } = await execP(`git ${cmd}`, OPTS);
    return (stdout || stderr || '').trim();
}

async function esRepoGit() {
    try {
        await execP('git rev-parse --is-inside-work-tree', OPTS);
        return true;
    } catch {
        return false;
    }
}

function leerSeguro(ruta) {
    try {
        return fs.readFileSync(ruta, 'utf8');
    } catch {
        return null;
    }
}

// ============================================================
// RESPALDO DE ARCHIVOS PROTEGIDOS
// ============================================================

function respaldarProtegidos() {
    const backup = path.join(
        os.tmpdir(),
        `botapi-backup-${Date.now()}`
    );

    const copiados = [];

    for (const nombre of PROTEGIDOS) {
        const orig = path.join(process.cwd(), nombre);
        if (!fs.existsSync(orig)) continue;

        const dest = path.join(backup, nombre);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(orig, dest, { recursive: true });
        copiados.push(nombre);
    }

    return { backup, copiados };
}

function restaurarProtegidos(backup, copiados) {
    for (const nombre of copiados) {
        const orig = path.join(backup, nombre);
        const dest = path.join(process.cwd(), nombre);
        if (!fs.existsSync(orig)) continue;

        fs.cpSync(orig, dest, { recursive: true, force: true });
    }

    try {
        fs.rmSync(backup, { recursive: true, force: true });
    } catch {}
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'update',
    categoria: 'Owner',
    alias: ['actualizar', 'up'],
    owner: true,

    descripcion:
        'Actualiza el bot desde GitHub protegiendo claves, sesiones y datos.',

    ejecutar: async ({ sock, msg, responder }) => {

        // ----------------------------------------------------
        // SOLO OWNER
        // ----------------------------------------------------
        if (!esOwner(msg, sock?.archivoOwner)) {
            await responder.texto(
                '❌ Este comando es solo para el Owner.'
            );
            return;
        }

        await responder.texto(
            '⏳ *UPDATE*\n\nDescargando actualizaciones de GitHub...'
        );

        try {

            let modo = 'repo';

            // ------------------------------------------------
            // SI NO ES REPO GIT: SE CONFIGURA SOLO
            // ------------------------------------------------
            if (!(await esRepoGit())) {
                modo = 'init';

                try {
                    await git(`config --global --add safe.directory ${process.cwd()}`);
                } catch {}

                await git('init');

                try {
                    await git(`remote add origin ${REPO_URL}`);
                } catch {}
            }

            // ------------------------------------------------
            // DESCARGAR RAMA
            // ------------------------------------------------
            await git(`fetch origin ${RAMA}`);

            let pendientes = '?';
            try {
                pendientes = await git(`rev-list --count HEAD..origin/${RAMA}`);
            } catch {}

            if (modo === 'repo' && pendientes === '0') {
                await responder.texto(
                    '✅ *UPDATE*\n\nEl bot ya está actualizado, no hay cambios nuevos en GitHub.'
                );
                return;
            }

            // ------------------------------------------------
            // RESPALDAR → APLICAR → RESTAURAR
            // ------------------------------------------------
            const pkgAntes = leerSeguro(
                path.join(process.cwd(), 'package.json')
            );

            const { backup, copiados } = respaldarProtegidos();

            await git(`reset --hard origin/${RAMA}`);

            restaurarProtegidos(backup, copiados);

            const pkgDespues = leerSeguro(
                path.join(process.cwd(), 'package.json')
            );

            const cambioDeps = pkgAntes !== pkgDespues;

            const detalle = modo === 'init'
                ? '🧬 La carpeta no era un repo git: se configuró sola y se descargó todo.'
                : `📦 Commits nuevos aplicados: ${pendientes}`;

            const bajoPm2 = Boolean(process.env.pm_id);

            await responder.texto(
                '╭━━〔 ✅ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                `┃ ${detalle}\n` +
                `┃ 🔒 Protegidos: ${copiados.join(', ') || 'nada'}\n` +
                (cambioDeps
                    ? '┃ 📦 package.json cambió: ejecuta *npm install* antes de reiniciar\n'
                    : '') +
                '┃\n' +
                (bajoPm2
                    ? '┃ 🔄 Reiniciando el bot en 3 segundos...\n'
                    : '┃ ⚠️ Reinicia el bot manual (pm2 restart) para aplicar.\n') +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            if (bajoPm2) {
                setTimeout(() => process.exit(0), 3000);
            }

        } catch (error) {

            console.error('[UPDATE] Error:', error);

            await responder.texto(
                '╭━━〔 ❌ 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ️ Error al descargar actualizaciones.\n' +
                '┃\n' +
                `┃ 🔍 ${(error?.stderr || error?.message || String(error)).slice(0, 300)}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};