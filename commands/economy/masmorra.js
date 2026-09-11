// commands/rpg/mazmorra.js
// ============================================================
// BOT-API — MAZMORRA (combate automático, 1 solo comando)
// ============================================================
// .mazmorra → pelea solo, muestra resultado
// .mazmorra stats → ver perfil RPG
// ============================================================
import fs from 'fs';
import path from 'path';

const RUTA_RPG = path.join(process.cwd(), 'database', 'mazmorra.json');
const RUTA_ECONOMIA = path.join(process.cwd(), 'database', 'economia.json');
const COOLDOWN = 15 * 1000; // 15s

// ---------- DB ----------
function leer(ruta, def) {
    try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) { return def; }
}
function guardar(ruta, data) {
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
}
function num(v) { return Number.isFinite(Number(v)) ? Number(v) : 0; }
function fmt(n) { return '$' + n.toLocaleString('en-US'); }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function barra(v, m = 100, s = 10) {
    const p = Math.max(0, Math.min(100, (v / m) * 100));
    const f = Math.round((p / 100) * s);
    const c = p >= 60 ? '🟩' : p >= 30 ? '🟨' : '🟥';
    return c.repeat(f) + '⬛'.repeat(s - f);
}

// ---------- PISOS ----------
const PISOS = [
    {
        nombre: '🕸️ Catacumbas',
        enemigos: [
            { nombre: '🦇 Murciélago', hp: 40, atk: 8, def: 2, xp: 10, oro: 30 },
            { nombre: '🕷️ Araña Gigante', hp: 55, atk: 12, def: 3, xp: 15, oro: 45 },
            { nombre: '💀 Esqueleto', hp: 60, atk: 15, def: 5, xp: 20, oro: 60 }
        ],
        jefe: { nombre: '👹 Rey Esqueleto', hp: 150, atk: 25, def: 8, xp: 80, oro: 300 }
    },
    {
        nombre: '🔥 Minas Ardientes',
        enemigos: [
            { nombre: '🐍 Serpiente de Fuego', hp: 80, atk: 18, def: 6, xp: 25, oro: 80 },
            { nombre: '🪨 Golem de Piedra', hp: 120, atk: 14, def: 12, xp: 30, oro: 90 },
            { nombre: '👻 Espectro', hp: 70, atk: 22, def: 4, xp: 28, oro: 85 }
        ],
        jefe: { nombre: '🐲 Dragón de Lava', hp: 250, atk: 35, def: 12, xp: 150, oro: 600 }
    },
    {
        nombre: '❄️ Abismo Helado',
        enemigos: [
            { nombre: '🐺 Lobo de Hielo', hp: 100, atk: 24, def: 8, xp: 35, oro: 110 },
            { nombre: '🧟 No-Muerto', hp: 130, atk: 28, def: 10, xp: 40, oro: 130 },
            { nombre: '🦂 Escorpión Gélido', hp: 90, atk: 30, def: 7, xp: 38, oro: 120 }
        ],
        jefe: { nombre: '❄️ Titán de Hielo', hp: 400, atk: 45, def: 18, xp: 250, oro: 1000 }
    },
    {
        nombre: '🌑 Trono Oscuro',
        enemigos: [
            { nombre: '😈 Demonio Menor', hp: 150, atk: 35, def: 12, xp: 50, oro: 180 },
            { nombre: '🧙 Brujo Oscuro', hp: 120, atk: 40, def: 10, xp: 55, oro: 200 },
            { nombre: '🗡️ Caballero Maldito', hp: 180, atk: 32, def: 18, xp: 60, oro: 220 }
        ],
        jefe: { nombre: '👿 Señor Oscuro', hp: 600, atk: 55, def: 22, xp: 400, oro: 2000 }
    },
    {
        nombre: '🌌 Vacío Eterno',
        enemigos: [
            { nombre: '🐙 Aberración', hp: 200, atk: 45, def: 15, xp: 70, oro: 300 },
            { nombre: '👁️ Ojo del Abismo', hp: 170, atk: 50, def: 12, xp: 75, oro: 350 },
            { nombre: '🦑 Tentáculo Cósmico', hp: 220, atk: 42, def: 20, xp: 80, oro: 380 }
        ],
        jefe: { nombre: '🌀 Dios del Vacío', hp: 1000, atk: 70, def: 30, xp: 700, oro: 5000 }
    }
];

// ---------- Helpers ----------
function perfilDefault() {
    return {
        hp: 100, hpMax: 100,
        atk: 15, def: 5,
        nivel: 1, xp: 0, xpNext: 50,
        piso: 1, kills: 0, jefes: 0,
        nombre: 'Aventurero',
        ultimaEntrada: 0
    };
}

function subirNivel(p) {
    let subio = false;
    while (p.xp >= p.xpNext) {
        p.xp -= p.xpNext;
        p.nivel++;
        p.hpMax += 15;
        p.atk += 3;
        p.def += 2;
        p.hp = p.hpMax;
        p.xpNext = Math.floor(p.xpNext * 1.5);
        subio = true;
    }
    return subio;
}

function darOro(jid, cantidad) {
    const eco = leer(RUTA_ECONOMIA, {});
    if (!eco[jid]) eco[jid] = { dinero: 0, banco: 0 };
    eco[jid].dinero = num(eco[jid].dinero) + cantidad;
    guardar(RUTA_ECONOMIA, eco);
}

// ---------- Combate automático ----------
function simularCombate(p, enemigo) {
    let pHp = p.hp;
    let eHp = enemigo.hp;
    let log = [];
    let turno = 1;

    while (pHp > 0 && eHp > 0 && turno <= 30) {
        // Turno del jugador
        const criticoP = Math.random() < 0.15;
        let dmgP = Math.max(1, p.atk - enemigo.def + rand(-3, 5));
        if (criticoP) dmgP = Math.floor(dmgP * 1.8);
        eHp -= dmgP;
        log.push(
            '┃ ⚔️ T' + turno + ': Atacas › -' + dmgP + (criticoP ? ' 💥CRÍTICO!' : '') +
            ' → ' + enemigo.nombre + ' HP:' + Math.max(0, eHp)
        );

        if (eHp <= 0) break;

        // Turno del enemigo
        const criticoE = Math.random() < 0.08;
        let dmgE = Math.max(1, enemigo.atk - p.def + rand(-3, 4));
        if (criticoE) dmgE = Math.floor(dmgE * 1.5);
        pHp -= dmgE;
        log.push(
            '┃ ' + enemigo.nombre + ' ataca › -' + dmgE + (criticoE ? ' 💥!' : '') +
            ' → Tú HP:' + Math.max(0, pHp)
        );

        turno++;
    }

    return {
        gano: eHp <= 0,
        pHp: Math.max(0, pHp),
        eHp: Math.max(0, eHp),
        turnos: turno,
        log: log.slice(-8) // Solo últimos 8 turnos para no saturar
    };
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'mazmorra',
    categoria: 'economy',
    alias: ['dungeon', 'mz', 'mazmorras', 'mzmorra'],
    descripcion: 'Explora la mazmorra — combate automático',
    uso: '.mazmorra · .mazmorra stats',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const jid = msg.key.participant || msg.key.remoteJid;
        const accion = String(argumento || '').trim().toLowerCase();

        let db = leer(RUTA_RPG, {});
        if (!db[jid]) db[jid] = perfilDefault();
        let p = db[jid];
        p.nombre = msg.pushName || 'Aventurero';

        // ============================================
        // STATS
        // ============================================
        if (accion === 'stats' || accion === 'perfil') {
            const pisoInfo = PISOS[Math.min(p.piso - 1, PISOS.length - 1)];
            await responder.texto(
                '╭━━〔 ⚔️ 𝐏𝐄𝐑𝐅𝐈𝐋 𝐑𝐏𝐆 〕━━⬣\n' +
                '┃\n' +
                '┃ 🧙 *' + p.nombre + '* Nv.' + p.nivel + '\n' +
                '┃\n' +
                '┃ ❤️ HP › ' + barra(p.hp, p.hpMax) + ' ' + p.hp + '/' + p.hpMax + '\n' +
                '┃ ⚔️ ATK › *' + p.atk + '*\n' +
                '┃ 🛡️ DEF › *' + p.def + '*\n' +
                '┃ ⭐ XP › *' + p.xp + '/' + p.xpNext + '*\n' +
                '┃\n' +
                '┃ 🏰 Piso › ' + pisoInfo.nombre + ' (' + p.piso + '/' + PISOS.length + ')\n' +
                '┃ 💀 Kills › *' + p.kills + '*\n' +
                '┃ 👑 Jefes › *' + p.jefes + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
            return;
        }

        // ============================================
        // ENTRAR A LA MAZMORRA
        // ============================================
        const ahora = Date.now();
        if (ahora - p.ultimaEntrada < COOLDOWN) {
            const rest = Math.ceil((COOLDOWN - (ahora - p.ultimaEntrada)) / 1000);
            return await responder.texto('⏳ Espera *' + rest + 's* para explorar de nuevo.');
        }

        // Si murió, revivir con 30% HP
        if (p.hp <= 0) {
            p.hp = Math.floor(p.hpMax * 0.3);
        }

        p.ultimaEntrada = ahora;

        // Generar enemigo
        const pisoInfo = PISOS[Math.min(p.piso - 1, PISOS.length - 1)];
        const esJefe = Math.random() < 0.15;
        const base = esJefe ? pisoInfo.jefe : pisoInfo.enemigos[rand(0, pisoInfo.enemigos.length - 1)];
        const enemigo = { ...base, esJefe };

        // Simular combate
        const resultado = simularCombate(p, enemigo);

        // Aplicar resultado
        p.hp = resultado.pHp;

        if (resultado.gano) {
            p.kills++;
            p.xp += enemigo.xp;
            if (enemigo.esJefe) {
                p.jefes++;
                if (p.piso < PISOS.length) p.piso++;
            }
            const subio = subirNivel(p);
            darOro(jid, enemigo.oro);

            db[jid] = p;
            guardar(RUTA_RPG, db);

            let txt =
                '╭━━〔 🏰 ' + pisoInfo.nombre.toUpperCase() + ' 〕━━⬣\n' +
                '┃\n' +
                (enemigo.esJefe ? '┃ 👑 ¡¡JEFE ENCONTRADO!!\n┃\n' : '') +
                '┃ ⚔️ VS ' + enemigo.nombre + '\n' +
                '┃\n' +
                resultado.log.join('\n') + '\n' +
                '┃\n' +
                '┃ ══════════════════\n' +
                '┃\n' +
                '┃ 🎉 ¡¡VICTORIA!!\n' +
                '┃\n' +
                '┃ 💰 +' + fmt(enemigo.oro) + '\n' +
                '┃ ⭐ +' + enemigo.xp + ' XP\n' +
                '┃ ❤️ ' + barra(p.hp, p.hpMax) + ' ' + p.hp + '/' + p.hpMax + '\n' +
                (subio ? '┃\n┃ 🆙 ¡SUBISTE AL NIVEL ' + p.nivel + '!\n' : '') +
                (enemigo.esJefe && p.piso > 1 ? '┃ 🏰 ¡PISO ' + p.piso + ' DESBLOQUEADO!\n' : '') +
                '┃\n' +
                '┃ Turnos: ' + resultado.turnos + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(txt);
        } else {
            db[jid] = p;
            guardar(RUTA_RPG, db);

            await responder.texto(
                '╭━━〔 🏰 ' + pisoInfo.nombre.toUpperCase() + ' 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚔️ VS ' + enemigo.nombre + '\n' +
                '┃\n' +
                resultado.log.join('\n') + '\n' +
                '┃\n' +
                '┃ ══════════════════\n' +
                '┃\n' +
                '┃ 💀 ¡¡DERROTA!!\n' +
                '┃\n' +
                '┃ ' + enemigo.nombre + ' te destrozó...\n' +
                '┃\n' +
                '┃ ❤️ HP restante: *' + p.hp + '/' + p.hpMax + '*\n' +
                '┃\n' +
                '┃ Usa .mazmorra para revivir\n' +
                '┃ con 30% HP\n' +
                '┃\n' +
                '┃ Turnos: ' + resultado.turnos + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};