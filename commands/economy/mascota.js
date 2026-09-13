// commands/fun/mascota.js
// ============================================================
// BOT-API — MASCOTA v3 (adaptado al sistema oficial de economía)
// ============================================================
import fs from 'fs';
import path from 'path';
import {
    obtenerUsuario,
    modificarDinero,
    guardarUsuario
} from '../../database/economia.js';

const RUTA_MASCOTAS = path.join(process.cwd(), 'database', 'mascotas.json');

const COSTOS = { adoptar: 500, alimentar: 50, jugar: 30, curar: 200, renacer: 1000 };
const DIA_MS = 86400000;

const ETAPAS = [
    { nombre: 'Huevo', emoji: '🥚', xpMin: 0 },
    { nombre: 'Bebé', emoji: '🐣', xpMin: 50 },
    { nombre: 'Cachorro', emoji: '🐱', xpMin: 250 },
    { nombre: 'Adulto', emoji: '🦁', xpMin: 800 },
    { nombre: 'Legendario', emoji: '🐉', xpMin: 2000 }
];

// ---------- TRUCOS ----------
const TRUCOS = {
    sentar:   { emoji: '🪑', frames: ['🐾 Camina tranquilo...', '🧎 Se agacha despacio...', '🪑 ¡SE SENTÓ!'], xp: 4, energia: 5, felicidad: 6 },
    girar:    { emoji: '🌀', frames: ['🐶 Mira hacia arriba...', '🔄 Gira y gira...', '🌀 ¡GIRO COMPLETO!'], xp: 5, energia: 7, felicidad: 7 },
    bailar:   { emoji: '💃', frames: ['🎵 Suena la música...', '🕺 Mueve las patitas...', '💃 ¡BAILAZO ÉPICO!'], xp: 7, energia: 10, felicidad: 12 },
    pata:     { emoji: '🤝', frames: ['👀 Te mira fijamente...', '🦵 Levanta la patita...', '🤝 ¡CHOCALA!'], xp: 3, energia: 4, felicidad: 8 },
    rodar:    { emoji: '🎢', frames: ['⬆️ Se tira al suelo...', '🔄 Rueda de lado...', '🌀 ¡RODADA PERFECTA!'], xp: 5, energia: 8, felicidad: 7 },
    muerto:   { emoji: '💀', frames: ['🧍 Se queda quieto...', '📉 Cae dramáticamente...', '💀👅 ¡MUY MUERTO!'], xp: 6, energia: 6, felicidad: 9 },
    saltar:   { emoji: '🦘', frames: ['🧎 Toma impulso...', '⬆️ Vuela alto...', '🛬 ¡ATERRIZAJE PERFECTO!'], xp: 5, energia: 9, felicidad: 8 },
    ladrar:   { emoji: '🔊', frames: ['😶 Silencio total...', '🗯️ Toma aire...', '🔊 ¡GUAU GUAU GUAU!'], xp: 3, energia: 4, felicidad: 5 },
    beso:     { emoji: '💋', frames: ['👀 Se acerca tierno...', '😘 Se prepara...', '💋 ¡BESITO HÚMEDO!'], xp: 4, energia: 3, felicidad: 10 },
    voltereta:{ emoji: '🤸', frames: ['🧍 Se estira...', '🙃 Cabeza abajo...', '🤸 ¡VOLTERETA PRO!'], xp: 6, energia: 9, felicidad: 8 }
};

// ---------- EMPLEOS ----------
const EMPLEOS = {
    granjero:   { nombre: 'Granjero', emoji: '🧑‍🌾', sueldo: 120, etapaMin: 1 },
    policia:    { nombre: 'Policía', emoji: '👮‍♂️', sueldo: 150, etapaMin: 2 },
    profesor:   { nombre: 'Profesor', emoji: '🧑‍🏫', sueldo: 170, etapaMin: 2 },
    bombero:    { nombre: 'Bombero', emoji: '🚒', sueldo: 180, etapaMin: 2 },
    chef:       { nombre: 'Chef', emoji: '👨‍🍳', sueldo: 200, etapaMin: 3 },
    doctor:     { nombre: 'Doctor', emoji: '🧑‍⚕️', sueldo: 250, etapaMin: 3 },
    youtuber:   { nombre: 'Youtuber', emoji: '🎥', sueldo: 300, etapaMin: 3 },
    astronauta: { nombre: 'Astronauta', emoji: '🧑‍🚀', sueldo: 400, etapaMin: 4 }
};

// ---------- DB ----------
function leer(ruta, def) {
    try { return JSON.parse(fs.readFileSync(ruta, 'utf8')); } catch (e) { return def; }
}
function guardar(ruta, data) {
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
}
function fmt(n) { return '$' + n.toLocaleString('en-US'); }
function barra(v, m = 100, s = 10) {
    const p = Math.max(0, Math.min(100, (v / m) * 100));
    const f = Math.round((p / 100) * s);
    const c = p >= 70 ? '🟩' : p >= 40 ? '🟨' : '🟥';
    return c.repeat(f) + '⬛'.repeat(s - f);
}
function obtenerEtapa(xp) {
    let e = ETAPAS[0];
    for (const x of ETAPAS) if (xp >= x.xpMin) e = x;
    return e;
}
function edadDias(m) {
    return Math.max(0, Math.floor((Date.now() - m.nacido) / DIA_MS));
}

// ---------- USAR SISTEMA OFICIAL DE ECONOMÍA ----------
function cobrar(jid, monto) {
    const usuario = obtenerUsuario(jid);
    const total = (usuario.dinero || 0) + (usuario.banco || 0);
    if (total < monto) {
        return { ok: false, msg: 'No te alcanza (' + fmt(total) + ' vs ' + fmt(monto) + ').' };
    }
    // Cobrar primero de dinero en mano, luego del banco
    let rest = monto;
    if ((usuario.dinero || 0) >= rest) {
        modificarDinero(jid, -rest);
    } else {
        const deMano = usuario.dinero || 0;
        rest -= deMano;
        if (deMano > 0) modificarDinero(jid, -deMano);
        // Del banco (modificar directo ya que no hay función para banco)
        const u2 = obtenerUsuario(jid);
        u2.banco = (u2.banco || 0) - rest;
        guardarUsuario(jid, u2);
    }
    return { ok: true };
}

function darOro(jid, monto) {
    modificarDinero(jid, monto);
}

// ---------- CRECIMIENTO DIARIO ----------
function aplicarCrecimiento(m) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (!m.ultimoDia) { m.ultimoDia = hoy; return ''; }
    if (m.ultimoDia === hoy) return '';
    const antes = new Date(m.ultimoDia + 'T00:00:00Z').getTime();
    const ahora = new Date(hoy + 'T00:00:00Z').getTime();
    const dias = Math.max(1, Math.round((ahora - antes) / DIA_MS));
    m.xp += dias * 10;
    m.ultimoDia = hoy;
    return '🎂 ¡Pasaron ' + dias + ' día(s)! Tu mascota creció +' + (dias * 10) + ' XP';
}

function decaimiento(m) {
    const ahora = Date.now();
    const horas = (ahora - (m.ultimoUpdate || ahora)) / 3600000;
    if (horas > 0) {
        m.hambre = Math.max(0, m.hambre - Math.floor(horas * 10));
        m.felicidad = Math.max(0, m.felicidad - Math.floor(horas * 8));
        m.energia = Math.max(0, m.energia - Math.floor(horas * 5));
        if (m.hambre < 20 || m.felicidad < 20) m.salud = Math.max(0, m.salud - Math.floor(horas * 3));
        if (m.salud <= 0 && m.vivo) m.vivo = false;
    }
    m.ultimoUpdate = ahora;
    return m;
}

function estadoTexto(m) {
    if (!m.vivo) return '💀 MUERTA';
    if (m.salud < 30) return '🤒 Enferma';
    if (m.hambre < 20) return '😩 Hambrienta';
    if (m.felicidad < 20) return '😢 Triste';
    if (m.energia < 20) return '😴 Agotada';
    return '✨ Saludable';
}

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'mascota',
    categoria: 'Fun',
    alias: ['pet', 'tamagotchi', 'mascotas'],
    descripcion: 'Mascota virtual con trucos, empleos y crecimiento diario',
    uso: '.mascota [acción] · .mascota trucos · .mascota empleo',
    ejecutar: async ({ msg, argumento, responder }) => {
        const id = msg.key.participant || msg.key.remoteJid;
        const tokens = String(argumento || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
        const accion = tokens[0] || '';

        let db = leer(RUTA_MASCOTAS, {});
        let m = db[id];

        // ============================================
        // VER ESTADO
        // ============================================
        if (!accion) {
            if (!m) {
                return await responder.texto(
                    '╭━━〔 🐾 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 🥚 Aún no tienes mascota\n' +
                    '┃\n' +
                    '┃ Adopta una con:\n' +
                    '┃ .mascota adoptar (' + fmt(COSTOS.adoptar) + ')\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
            m = decaimiento(m);
            const aviso = aplicarCrecimiento(m);
            db[id] = m; guardar(RUTA_MASCOTAS, db);

            const etapa = obtenerEtapa(m.xp);
            const siguiente = ETAPAS.find(e => e.xpMin > m.xp);
            const empleo = m.empleo ? EMPLEOS[m.empleo.tipo] : null;

            if (!m.vivo) {
                return await responder.texto(
                    '╭━━〔 💀 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 𝐌𝐔𝐄𝐑𝐓𝐀 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 💀 *' + m.nombre + '* murió por abandono\n' +
                    '┃ 🎂 Vivió: ' + edadDias(m) + ' días\n' +
                    '┃\n' +
                    '┃ Revívela: .mascota renacer (' + fmt(COSTOS.renacer) + ')\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            await responder.texto(
                '╭━━〔 🐾 𝐌𝐈 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + etapa.emoji + ' *' + m.nombre + '* (' + etapa.nombre + ')\n' +
                '┃ 🎂 Edad: ' + edadDias(m) + ' día(s)\n' +
                (aviso ? '┃ ' + aviso + '\n' : '') +
                '┃\n' +
                '┃ ❤️ Salud › ' + barra(m.salud) + ' ' + m.salud + '/100\n' +
                '┃ 🍗 Hambre › ' + barra(m.hambre) + ' ' + m.hambre + '/100\n' +
                '┃ 😊 Felicidad › ' + barra(m.felicidad) + ' ' + m.felicidad + '/100\n' +
                '┃ ⚡ Energía › ' + barra(m.energia) + ' ' + m.energia + '/100\n' +
                '┃\n' +
                '┃ ⭐ XP › *' + m.xp + (siguiente ? '/' + siguiente.xpMin : '') + '*\n' +
                '┃ 🎯 Estado › ' + estadoTexto(m) + '\n' +
                '┃ 💼 Empleo › ' + (empleo ? empleo.emoji + ' ' + empleo.nombre + ' (' + fmt(empleo.sueldo) + '/día)' : 'Desempleada') + '\n' +
                '┃\n' +
                '┃ 🎪 Trucos: .mascota trucos\n' +
                '┃ 💼 Empleo: .mascota empleo\n' +
                '┃ 💰 Cobrar: .mascota cobrar\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
            return;
        }

        // ============================================
        // ADOPTAR
        // ============================================
        if (accion === 'adoptar' || accion === 'adopt') {
            if (m && m.vivo) return await responder.texto('⚠️ Ya tienes mascota viva.');
            const cobro = cobrar(id, COSTOS.adoptar);
            if (!cobro.ok) return await responder.texto('❌ ' + cobro.msg);
            const nombres = ['Luna', 'Mochi', 'Kira', 'Bolt', 'Nube', 'Sombra', 'Coco', 'Milo', 'Yuki', 'Rex', 'Firulais', 'Manchas'];
            const nuevo = {
                nombre: nombres[Math.floor(Math.random() * nombres.length)],
                vivo: true, salud: 100, hambre: 80, felicidad: 80, energia: 100,
                xp: 0, nacido: Date.now(), ultimoUpdate: Date.now(),
                ultimoDia: new Date().toISOString().slice(0, 10),
                empleo: null, ultimoTruco: 0
            };
            db[id] = nuevo; guardar(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 🐣 𝐀𝐃𝐎𝐏𝐓𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎉 Adoptaste a *' + nuevo.nombre + '*\n' +
                '┃ 💰 -' + fmt(COSTOS.adoptar) + '\n' +
                '┃\n' +
                '┃ Cuídala, enséñale trucos\n' +
                '┃ y consíguele un empleo 💼\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!m) return await responder.texto('❌ No tienes mascota. Usa: .mascota adoptar');
        m = decaimiento(m);
        const avisoCrec = aplicarCrecimiento(m);
        if (!m.vivo) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('💀 Tu mascota murió. Usa: .mascota renacer'); }

        const etapa = obtenerEtapa(m.xp);
        const idxEtapa = ETAPAS.indexOf(etapa);

        // ============================================
        // LISTA DE TRUCOS
        // ============================================
        if (accion === 'trucos' || accion === 'tricks') {
            const lista = Object.entries(TRUCOS).map(([k, v]) => '┃ ' + v.emoji + ' .mascota ' + k).join('\n');
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 🎪 𝐓𝐑𝐔𝐂𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                lista + '\n' +
                '┃\n' +
                '┃ Cada truco gasta ⚡ energía\n' +
                '┃ y da ⭐ XP + 😊 felicidad\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // HACER TRUCO
        // ============================================
        if (TRUCOS[accion]) {
            const t = TRUCOS[accion];
            const ahora = Date.now();
            if (ahora - (m.ultimoTruco || 0) < 10000) {
                db[id] = m; guardar(RUTA_MASCOTAS, db);
                return await responder.texto('⏳ Espera unos segundos entre trucos.');
            }
            if (m.energia < t.energia) {
                db[id] = m; guardar(RUTA_MASCOTAS, db);
                return await responder.texto('😴 Muy cansada para ese truco. Usa .mascota dormir');
            }
            m.ultimoTruco = ahora;
            m.energia = Math.max(0, m.energia - t.energia);
            m.felicidad = Math.min(100, m.felicidad + t.felicidad);
            m.xp += t.xp;
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 🎪 𝐓𝐑𝐔𝐂𝐎: ' + accion.toUpperCase() + ' 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎬 ' + t.frames.join('\n┃    ') + '\n' +
                '┃\n' +
                '┃ ' + etapa.emoji + ' *' + m.nombre + '* lo hizo perfecto\n' +
                '┃ ⭐ +' + t.xp + ' XP · 😊 +' + t.felicidad + ' · ⚡ -' + t.energia + '\n' +
                (avisoCrec ? '┃ ' + avisoCrec + '\n' : '') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // EMPLEO
        // ============================================
        if (accion === 'empleo' || accion === 'trabajo' || accion === 'job') {
            const cual = tokens[1] || '';
            if (cual === 'dejar' || cual === 'renunciar') {
                if (!m.empleo) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('⚠️ Tu mascota no tiene empleo.'); }
                const viejo = EMPLEOS[m.empleo.tipo];
                m.empleo = null;
                db[id] = m; guardar(RUTA_MASCOTAS, db);
                return await responder.texto('💼 *' + m.nombre + '* renunció a ' + viejo.emoji + ' ' + viejo.nombre + '.');
            }
            if (!cual) {
                const actual = m.empleo ? EMPLEOS[m.empleo.tipo] : null;
                const lista = Object.entries(EMPLEOS).map(([k, v]) =>
                    '┃ ' + v.emoji + ' ' + k + ' › ' + fmt(v.sueldo) + '/día · req: ' + ETAPAS[v.etapaMin].nombre
                ).join('\n');
                db[id] = m; guardar(RUTA_MASCOTAS, db);
                return await responder.texto(
                    '╭━━〔 💼 𝐄𝐌𝐏𝐋𝐄𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Actual: ' + (actual ? actual.emoji + ' ' + actual.nombre : 'Desempleada') + '\n' +
                    '┃\n' +
                    lista + '\n' +
                    '┃\n' +
                    '┃ Tomar: .mascota empleo chef\n' +
                    '┃ Dejar: .mascota empleo dejar\n' +
                    '┃ Cobrar: .mascota cobrar\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
            const emp = EMPLEOS[cual];
            if (!emp) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❌ Empleo no válido. Usa .mascota empleo'); }
            if (idxEtapa < emp.etapaMin) {
                db[id] = m; guardar(RUTA_MASCOTAS, db);
                return await responder.texto('❌ *' + m.nombre + '* es ' + etapa.emoji + ' ' + etapa.nombre + '.\nNecesita ser ' + ETAPAS[emp.etapaMin].nombre + ' para ' + emp.emoji + ' ' + emp.nombre + '.');
            }
            m.empleo = { tipo: cual, desde: Date.now(), ultimoCobro: Date.now() };
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 💼 𝐍𝐔𝐄𝐕𝐎 𝐄𝐌𝐏𝐋𝐄𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + emp.emoji + ' *' + m.nombre + '* ahora es ' + emp.nombre + '\n' +
                '┃ 💰 Sueldo: ' + fmt(emp.sueldo) + '/día\n' +
                '┃\n' +
                '┃ Cobra con: .mascota cobrar\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // COBRAR SUELDO
        // ============================================
        if (accion === 'cobrar' || accion === 'sueldo') {
            if (!m.empleo) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❌ Tu mascota no tiene empleo.'); }
            const emp = EMPLEOS[m.empleo.tipo];
            const dias = Math.floor((Date.now() - (m.empleo.ultimoCobro || Date.now())) / DIA_MS);
            if (dias < 1) {
                const horasRest = Math.ceil(((DIA_MS - (Date.now() - m.empleo.ultimoCobro)) / 3600000));
                db[id] = m; guardar(RUTA_MASCOTAS, db);
                return await responder.texto('⏳ Aún no toca sueldo.\nFaltan ~' + horasRest + 'h.');
            }
            const diasPagados = Math.min(7, dias);
            const total = diasPagados * emp.sueldo;
            darOro(id, total);
            m.empleo.ultimoCobro = Date.now();
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 💰 𝐒𝐔𝐄𝐋𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + emp.emoji + ' *' + m.nombre + '* cobró sueldo\n' +
                '┃ 📅 Días: ' + diasPagados + '\n' +
                '┃ 💰 Total: +' + fmt(total) + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // ACCIONES CLÁSICAS
        // ============================================
        if (accion === 'alimentar' || accion === 'feed') {
            if (m.hambre >= 95) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('🍗 No tiene hambre.'); }
            const c = cobrar(id, COSTOS.alimentar);
            if (!c.ok) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❌ ' + c.msg); }
            m.hambre = Math.min(100, m.hambre + 30); m.xp += 5;
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto('🍗 Alimentaste a *' + m.nombre + '*\n' + barra(m.hambre) + ' ' + m.hambre + '/100\n💰 -' + fmt(COSTOS.alimentar) + ' · ⭐ +5 XP');
        }

        if (accion === 'jugar' || accion === 'play') {
            if (m.energia < 20) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('😴 Muy cansada.'); }
            const c = cobrar(id, COSTOS.jugar);
            if (!c.ok) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❌ ' + c.msg); }
            m.felicidad = Math.min(100, m.felicidad + 30); m.energia = Math.max(0, m.energia - 15); m.xp += 8;
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto('🎾 Jugaste con *' + m.nombre + '*\n' + barra(m.felicidad) + ' ' + m.felicidad + '/100\n💰 -' + fmt(COSTOS.jugar) + ' · ⭐ +8 XP');
        }

        if (accion === 'dormir' || accion === 'sleep') {
            if (m.energia >= 95) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('⚡ Ya está descansada.'); }
            m.energia = Math.min(100, m.energia + 50); m.xp += 2;
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto('😴 *' + m.nombre + '* durmió rico\n' + barra(m.energia) + ' ' + m.energia + '/100\n💤 Gratis · ⭐ +2 XP');
        }

        if (accion === 'curar' || accion === 'heal') {
            if (m.salud >= 90) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❤️ Ya está saludable.'); }
            const c = cobrar(id, COSTOS.curar);
            if (!c.ok) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❌ ' + c.msg); }
            m.salud = Math.min(100, m.salud + 50); m.hambre = Math.min(100, m.hambre + 20);
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto('💊 Curaste a *' + m.nombre + '*\n' + barra(m.salud) + ' ' + m.salud + '/100\n💰 -' + fmt(COSTOS.curar));
        }

        if (accion === 'renacer' || accion === 'revivir') {
            if (m.vivo) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('✨ Está viva, no necesita revivir.'); }
            const c = cobrar(id, COSTOS.renacer);
            if (!c.ok) { db[id] = m; guardar(RUTA_MASCOTAS, db); return await responder.texto('❌ ' + c.msg); }
            m.vivo = true; m.salud = 70; m.hambre = 70; m.felicidad = 70; m.energia = 70;
            m.xp = Math.floor(m.xp / 2);
            db[id] = m; guardar(RUTA_MASCOTAS, db);
            return await responder.texto('✨ *' + m.nombre + '* renació\n💰 -' + fmt(COSTOS.renacer) + '\n⭐ Perdió mitad de XP');
        }

        db[id] = m; guardar(RUTA_MASCOTAS, db);
        return await responder.texto(
            '╭━━〔 🐾 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ ❌ Acción no válida\n' +
            '┃\n' +
            '┃ 📋 Acciones:\n' +
            '┃ • .mascota (ver)\n' +
            '┃ • .mascota adoptar\n' +
            '┃ • .mascota trucos 🎪\n' +
            '┃ • .mascota empleo 💼\n' +
            '┃ • .mascota cobrar 💰\n' +
            '┃ • alimentar · jugar · dormir\n' +
            '┃ • curar · renacer\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};