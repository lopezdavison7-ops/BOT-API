// commands/economy/mascota.js
// ============================================================
// COMANDO: MASCOTA (Tamagotchi con dinero real)
// ============================================================
// Adopta una mascota virtual, cuídala con dinero de tu .bal
// y hazla evolucionar por 5 etapas.
//
// Ejemplos:
// .mascota            → ver estado de tu mascota
// .mascota adoptar    → adopta una mascota nueva ($500)
// .mascota alimentar  → alimenta (-$50, +30 hambre)
// .mascota jugar      → juega (-$30, +30 felicidad)
// .mascota dormir     → duerme (+50 energía)
// .mascota curar      → cura si está enferma (-$200)
// .mascota renacer    → revive mascota muerta ($1000)
// ============================================================
import fs from 'fs';
import path from 'path';

const RUTA_MASCOTAS = path.join(process.cwd(), 'database', 'mascotas.json');
const RUTA_ECONOMIA = path.join(process.cwd(), 'database', 'economia.json');

const COSTOS = {
    adoptar:   500,
    alimentar: 50,
    jugar:     30,
    curar:     200,
    renacer:   1000
};

const ETAPAS = [
    { nombre: 'Huevo',       emoji: '🥚', xpMin: 0 },
    { nombre: 'Bebé',        emoji: '🐣', xpMin: 50 },
    { nombre: 'Cachorro',    emoji: '🐱', xpMin: 250 },
    { nombre: 'Adulto',      emoji: '🦁', xpMin: 800 },
    { nombre: 'Legendario',  emoji: '🐉', xpMin: 2000 }
];

// ---------- DB helpers ----------
function leerJSON(ruta, def) {
    try {
        if (!fs.existsSync(ruta)) return def;
        return JSON.parse(fs.readFileSync(ruta, 'utf8'));
    } catch (e) { return def; }
}
function guardarJSON(ruta, data) {
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmt(n) { return '$' + n.toLocaleString('en-US'); }

function obtenerEtapa(xp) {
    let etapa = ETAPAS[0];
    for (const e of ETAPAS) {
        if (xp >= e.xpMin) etapa = e;
    }
    return etapa;
}

function aplicarDecaimiento(mascota) {
    const ahora = Date.now();
    const ultimo = mascota.ultimoUpdate || ahora;
    const horas = (ahora - ultimo) / (1000 * 60 * 60);
    if (horas <= 0) return mascota;

    // Decae 10 puntos por hora en hambre y felicidad
    mascota.hambre = Math.max(0, mascota.hambre - Math.floor(horas * 10));
    mascota.felicidad = Math.max(0, mascota.felicidad - Math.floor(horas * 8));
    mascota.energia = Math.max(0, mascota.energia - Math.floor(horas * 5));

    // Si está muy débil, pierde salud
    if (mascota.hambre < 20 || mascota.felicidad < 20) {
        mascota.salud = Math.max(0, mascota.salud - Math.floor(horas * 3));
    }

    // Muerte por abandono
    if (mascota.salud <= 0 && mascota.vivo) {
        mascota.vivo = false;
        mascota.muerteEn = ahora;
    }

    mascota.ultimoUpdate = ahora;
    return mascota;
}

function cobrar(jid, monto) {
    const eco = leerJSON(RUTA_ECONOMIA, {});
    const u = eco[jid];
    if (!u) return { ok: false, msg: 'No tienes cuenta en la economía. Usa .perfil primero.' };
    const mano = num(u.dinero);
    const banco = num(u.banco);
    if (mano + banco < monto) return { ok: false, msg: 'No tienes suficiente .bal (' + fmt(mano + banco) + ' vs ' + fmt(monto) + ').' };

    // Primero descuenta de la mano, luego del banco
    let restante = monto;
    if (mano >= restante) {
        u.dinero = mano - restante;
        restante = 0;
    } else {
        restante -= mano;
        u.dinero = 0;
        u.banco = banco - restante;
    }
    eco[jid] = u;
    guardarJSON(RUTA_ECONOMIA, eco);
    return { ok: true };
}

function barra(valor, max = 100, size = 10) {
    const pct = Math.max(0, Math.min(100, (valor / max) * 100));
    const filled = Math.round((pct / 100) * size);
    const empty = size - filled;
    const color = pct >= 70 ? '🟩' : pct >= 40 ? '🟨' : '🟥';
    return color.repeat(filled) + '⬛'.repeat(empty);
}

function estadoTexto(mascota) {
    if (!mascota.vivo) return '💀 MUERTA';
    if (mascota.salud < 30) return '🤒 Enferma';
    if (mascota.hambre < 20) return '😩 Hambrienta';
    if (mascota.felicidad < 20) return '😢 Triste';
    if (mascota.energia < 20) return '😴 Agotada';
    return '✨ Saludable';
}

export default {
    nombre: 'mascota',
    categoria: 'Fun',
    alias: ['pet', 'tamagotchi', 'tamagochi', 'mascotas'],
    descripcion: 'Adopta y cuida una mascota virtual con dinero real',
    uso: '.mascota [adoptar|alimentar|jugar|dormir|curar|renacer]',
    ejecutar: async ({ msg, argumento, responder }) => {
        const jid = msg.key.participant || msg.key.remoteJid;
        const accion = String(argumento || '').trim().toLowerCase();

        let db = leerJSON(RUTA_MASCOTAS, {});
        let m = db[jid];

        // ----------------------------------------------------
        // VER ESTADO (sin argumentos)
        // ----------------------------------------------------
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
            m = aplicarDecaimiento(m);
            db[jid] = m;
            guardarJSON(RUTA_MASCOTAS, db);

            const etapa = obtenerEtapa(m.xp);
            const siguiente = ETAPAS.find(e => e.xpMin > m.xp);

            if (!m.vivo) {
                return await responder.texto(
                    '╭━━〔 💀 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 𝐌𝐔𝐄𝐑𝐓𝐀 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 💀 *' + m.nombre + '* murió por abandono\n' +
                    '┃ ' + etapa.emoji + ' Etapa: ' + etapa.nombre + '\n' +
                    '┃ ⭐ XP alcanzado: ' + m.xp + '\n' +
                    '┃\n' +
                    '┃ Revívela con:\n' +
                    '┃ .mascota renacer (' + fmt(COSTOS.renacer) + ')\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const txt =
                '╭━━〔 🐾 𝐌𝐈 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + etapa.emoji + ' *' + m.nombre + '* (' + etapa.nombre + ')\n' +
                '┃\n' +
                '┃ ❤️ Salud › ' + barra(m.salud) + ' ' + m.salud + '/100\n' +
                '┃ 🍗 Hambre › ' + barra(m.hambre) + ' ' + m.hambre + '/100\n' +
                '┃ 😊 Felicidad › ' + barra(m.felicidad) + ' ' + m.felicidad + '/100\n' +
                '┃ ⚡ Energía › ' + barra(m.energia) + ' ' + m.energia + '/100\n' +
                '┃\n' +
                '┃ ⭐ XP › *' + m.xp + (siguiente ? '/' + siguiente.xpMin : '') + '*\n' +
                '┃ 🎯 Estado › ' + estadoTexto(m) + '\n' +
                '┃ 🎂 Edad › ' + Math.floor((Date.now() - m.nacido) / (1000 * 60 * 60 * 24)) + ' días\n' +
                '┃\n' +
                '┃ 📋 Acciones:\n' +
                '┃ • .mascota alimentar ' + fmt(COSTOS.alimentar) + '\n' +
                '┃ • .mascota jugar ' + fmt(COSTOS.jugar) + '\n' +
                '┃ • .mascota dormir (gratis)\n' +
                '┃ • .mascota curar ' + fmt(COSTOS.curar) + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
            return await responder.texto(txt);
        }

        // ----------------------------------------------------
        // ADOPTAR
        // ----------------------------------------------------
        if (accion === 'adoptar' || accion === 'adopt') {
            if (m && m.vivo) {
                return await responder.texto('⚠️ Ya tienes una mascota viva. Usa .mascota para verla.');
            }
            const cobro = cobrar(jid, COSTOS.adoptar);
            if (!cobro.ok) return await responder.texto('❌ ' + cobro.msg);

            const nombres = ['Luna', 'Mochi', 'Kira', 'Bolt', 'Nube', 'Sombra', 'Coco', 'Milo', 'Yuki', 'Rex'];
            const nuevo = {
                nombre: nombres[Math.floor(Math.random() * nombres.length)],
                vivo: true,
                salud: 100,
                hambre: 80,
                felicidad: 80,
                energia: 100,
                xp: 0,
                nacido: Date.now(),
                ultimoUpdate: Date.now()
            };
            db[jid] = nuevo;
            guardarJSON(RUTA_MASCOTAS, db);

            return await responder.texto(
                '╭━━〔 🐣 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 𝐀𝐃𝐎𝐏𝐓𝐀𝐃𝐀 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎉 Adoptaste a *' + nuevo.nombre + '*\n' +
                '┃\n' +
                '┃ 💰 Costo: -' + fmt(COSTOS.adoptar) + '\n' +
                '┃ 🥚 Etapa: Huevo\n' +
                '┃\n' +
                '┃ Cuídala bien o morirá 💀\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Para las demás acciones, requiere tener mascota viva
        if (!m) return await responder.texto('❌ No tienes mascota. Usa: .mascota adoptar');
        m = aplicarDecaimiento(m);
        if (!m.vivo) return await responder.texto('💀 Tu mascota murió. Usa: .mascota renacer');

        // ----------------------------------------------------
        // ALIMENTAR
        // ----------------------------------------------------
        if (accion === 'alimentar' || accion === 'feed') {
            if (m.hambre >= 95) return await responder.texto('🍗 Tu mascota no tiene hambre.');
            const cobro = cobrar(jid, COSTOS.alimentar);
            if (!cobro.ok) return await responder.texto('❌ ' + cobro.msg);
            m.hambre = Math.min(100, m.hambre + 30);
            m.xp += 5;
            db[jid] = m;
            guardarJSON(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 🍗 𝐀𝐋𝐈𝐌𝐄𝐍𝐓𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 🍗 Alimentaste a *' + m.nombre + '*\n' +
                '┃ ' + barra(m.hambre) + ' ' + m.hambre + '/100\n' +
                '┃ 💰 -' + fmt(COSTOS.alimentar) + ' · ⭐ +5 XP\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ----------------------------------------------------
        // JUGAR
        // ----------------------------------------------------
        if (accion === 'jugar' || accion === 'play') {
            if (m.energia < 20) return await responder.texto('😴 Muy cansada para jugar. Usa .mascota dormir primero.');
            if (m.felicidad >= 95) return await responder.texto('😊 Ya está muy feliz.');
            const cobro = cobrar(jid, COSTOS.jugar);
            if (!cobro.ok) return await responder.texto('❌ ' + cobro.msg);
            m.felicidad = Math.min(100, m.felicidad + 30);
            m.energia = Math.max(0, m.energia - 15);
            m.xp += 8;
            db[jid] = m;
            guardarJSON(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 🎾 𝐉𝐔𝐆𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎾 Jugaste con *' + m.nombre + '*\n' +
                '┃ ' + barra(m.felicidad) + ' ' + m.felicidad + '/100\n' +
                '┃ 💰 -' + fmt(COSTOS.jugar) + ' · ⭐ +8 XP\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ----------------------------------------------------
        // DORMIR (gratis)
        // ----------------------------------------------------
        if (accion === 'dormir' || accion === 'sleep') {
            if (m.energia >= 95) return await responder.texto('⚡ Ya está descansada.');
            m.energia = Math.min(100, m.energia + 50);
            m.xp += 2;
            db[jid] = m;
            guardarJSON(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 😴 𝐃𝐎𝐑𝐌𝐈𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 😴 *' + m.nombre + '* durmió y recuperó energía\n' +
                '┃ ' + barra(m.energia) + ' ' + m.energia + '/100\n' +
                '┃ 💤 Gratis · ⭐ +2 XP\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ----------------------------------------------------
        // CURAR
        // ----------------------------------------------------
        if (accion === 'curar' || accion === 'heal') {
            if (m.salud >= 90) return await responder.texto('❤️ Ya está saludable.');
            const cobro = cobrar(jid, COSTOS.curar);
            if (!cobro.ok) return await responder.texto('❌ ' + cobro.msg);
            m.salud = Math.min(100, m.salud + 50);
            m.hambre = Math.min(100, m.hambre + 20);
            db[jid] = m;
            guardarJSON(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 💊 𝐂𝐔𝐑𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ 💊 Curaste a *' + m.nombre + '*\n' +
                '┃ ' + barra(m.salud) + ' ' + m.salud + '/100\n' +
                '┃ 💰 -' + fmt(COSTOS.curar) + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ----------------------------------------------------
        // RENACER
        // ----------------------------------------------------
        if (accion === 'renacer' || accion === 'revive' || accion === 'revivir') {
            if (m.vivo) return await responder.texto('✨ Tu mascota está viva, no necesita revivir.');
            const cobro = cobrar(jid, COSTOS.renacer);
            if (!cobro.ok) return await responder.texto('❌ ' + cobro.msg);
            m.vivo = true;
            m.salud = 70;
            m.hambre = 70;
            m.felicidad = 70;
            m.energia = 70;
            m.xp = Math.floor(m.xp / 2); // Pierde la mitad del XP
            m.muerteEn = null;
            db[jid] = m;
            guardarJSON(RUTA_MASCOTAS, db);
            return await responder.texto(
                '╭━━〔 ✨ 𝐑𝐄𝐍𝐀𝐂𝐄𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ✨ *' + m.nombre + '* renació\n' +
                '┃ 💰 -' + fmt(COSTOS.renacer) + '\n' +
                '┃ ⭐ Perdió la mitad de su XP\n' +
                '┃\n' +
                '┃ Esta vez cuídala mejor 💀\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        return await responder.texto(
            '╭━━〔 🐾 𝐌𝐀𝐒𝐂𝐎𝐓𝐀 〕━━⬣\n' +
            '┃\n' +
            '┃ ❌ Acción no válida\n' +
            '┃\n' +
            '┃ 📋 Acciones:\n' +
            '┃ • .mascota (ver estado)\n' +
            '┃ • .mascota adoptar\n' +
            '┃ • .mascota alimentar\n' +
            '┃ • .mascota jugar\n' +
            '┃ • .mascota dormir\n' +
            '┃ • .mascota curar\n' +
            '┃ • .mascota renacer\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};