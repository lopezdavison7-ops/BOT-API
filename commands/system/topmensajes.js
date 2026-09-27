

import fs from 'node:fs';
import path from 'node:path';

const RUTA_DB = path.join(process.cwd(), 'database', 'topComandos.json');

const MEDALLAS = ['🥇', '🥈', '🥉', '✨', '🌟', '💫', '⭐', '🎯', '🔥', ''];

function leerDB() {
    try {
        if (!fs.existsSync(RUTA_DB)) return { comandos: {}, usuarios: {}, total: 0 };
        return JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
    } catch {
        return { comandos: {}, usuarios: {}, total: 0 };
    }
}

// "17400" → "17.4 mil" | "3000" → "3 mil" | "2400000" → "2.4 M"
function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' M';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' mil';
    return String(n);
}

// Barra proporcional al máximo (como la captura)
function barra(valor, max, largo = 30) {
    const llenos = Math.max(1, Math.round((valor / max) * largo));
    return '█'.repeat(llenos) + '░'.repeat(largo - llenos);
}

export default {
    nombre: 'topmensajes',
    categoria: 'system',
    // ⚠️ Sin "top" porque ese alias ya existe en tu bot
    alias: ['topcmd', 'topcomandos', 'topcmds', 'utilizados', 'masusados', 'topusados', 'cmdstop'],
    descripcion: 'Top de comandos y usuarios más activos, estilo encuesta.',
    uso: '.topmensajes | .topmensajes 10 | .topmensajes usuarios',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const db = leerDB();
        const partes = String(argumento || '').trim().toLowerCase().split(/\s+/);

        const modoUsuarios = partes.some(p => ['usuarios', 'users', 'activos', 'gente'].includes(p));
        const numArg = parseInt(partes.find(p => /^\d+$/.test(p)) || '5', 10);
        const limite = Math.min(Math.max(numArg || 5, 3), 10);

        // ───────────── MODO USUARIOS ─────────────
        if (modoUsuarios) {
            const lista = Object.entries(db.usuarios || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, limite);

            if (!lista.length) {
                return await responder.texto('📊 *Top Usuarios Activos*\n\n📭 Aún no hay datos suficientes.');
            }

            const max = lista[0][1];

            let texto = `👥 *Top ${lista.length} Usuarios Activos*\n\n`;

            lista.forEach(([numero, count], i) => {
                texto +=
                    `${MEDALLAS[i] || '▫️'} @${numero} — *${fmtNum(count)}* usos\n` +
                    `${barra(count, max)}\n\n`;
            });

            texto += `🗳️ Total de usos: *${fmtNum(db.total || 0)}*`;

            const mentions = lista.map(([n]) => n + '@s.whatsapp.net');

            try {
                await sock.sendMessage(jid, { text: texto, mentions }, { quoted: msg });
            } catch (e) {
                await responder.texto(texto);
            }
            return;
        }

        // ───────────── MODO COMANDOS (default) ─────────────
        const lista = Object.entries(db.comandos || {})
            .sort((a, b) => b[1] - a[1])
            .slice(0, limite);

        if (!lista.length) {
            return await responder.texto(
                '📊 *Top Comandos Más Usados*\n\n' +
                '📭 Aún no hay datos.\n' +
                'Usa algunos comandos y vuelve a intentarlo.'
            );
        }

        const totalVotos = Object.values(db.comandos || {}).reduce((a, b) => a + b, 0);
        const max = lista[0][1];

        let texto = `📊 *Top ${lista.length} Comandos Más Usados*\n\n`;

        lista.forEach(([nombre, count], i) => {
            const pct = totalVotos ? Math.round((count / totalVotos) * 100) : 0;
            texto +=
                `${MEDALLAS[i] || '▫️'} ${nombre} — ${pct}%\n` +
                `${barra(count, max)}  ${fmtNum(count)}\n\n`;
        });

        texto +=
            `🗳️ Total de votos: *${fmtNum(totalVotos)}*\n` +
            `👥 Participantes: *${Object.keys(db.usuarios || {}).length}*`;

        await responder.texto(texto);
    }
};