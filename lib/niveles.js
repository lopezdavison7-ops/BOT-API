// ============================================================
// BOT-API
// SISTEMA DE NIVELES / XP
// ============================================================

import fs from 'fs';
import path from 'path';

const DATABASE_DIR = path.join(process.cwd(), 'database');
const FILE = path.join(DATABASE_DIR, 'niveles.json');

function asegurarArchivo() {
    if (!fs.existsSync(DATABASE_DIR)) {
        fs.mkdirSync(DATABASE_DIR, { recursive: true });
    }

    if (!fs.existsSync(FILE)) {
        fs.writeFileSync(FILE, '{}', 'utf8');
    }
}

function cargar() {
    asegurarArchivo();

    try {
        return JSON.parse(fs.readFileSync(FILE, 'utf8'));
    } catch {
        return {};
    }
}

function guardar(data) {
    asegurarArchivo();
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf8');
}

function normalizarJid(jid) {
    if (!jid) return null;

    return String(jid)
        .split(':')[0]
        .trim();
}

export function obtenerNivel(jid) {
    const id = normalizarJid(jid);
    if (!id) return null;

    const db = cargar();

    if (!db[id]) {
        db[id] = {
            xp: 0,
            nivel: 1,
            mensajes: 0
        };

        guardar(db);
    }

    return db[id];
}

export function xpNecesaria(nivel) {
    return 100 + ((nivel - 1) * 50);
}

export function agregarXP(jid, cantidad = 10) {
    const id = normalizarJid(jid);
    if (!id) {
        return {
            xp: 0,
            nivel: 1,
            subio: false,
            nivelAnterior: 1
        };
    }

    const db = cargar();

    if (!db[id]) {
        db[id] = {
            xp: 0,
            nivel: 1,
            mensajes: 0
        };
    }

    const usuario = db[id];

    const nivelAnterior = usuario.nivel;

    usuario.xp += Number(cantidad) || 0;
    usuario.mensajes += 1;

    let subio = false;

    while (usuario.xp >= xpNecesaria(usuario.nivel)) {
        usuario.xp -= xpNecesaria(usuario.nivel);
        usuario.nivel++;
        subio = true;
    }

    guardar(db);

    return {
        ...usuario,
        subio,
        nivelAnterior
    };
}

export function obtenerRanking(limit = 10) {
    const db = cargar();

    return Object.entries(db)
        .map(([jid, datos]) => ({
            jid,
            ...datos
        }))
        .sort((a, b) => {
            if (b.nivel !== a.nivel) {
                return b.nivel - a.nivel;
            }

            return b.xp - a.xp;
        })
        .slice(0, limit);
}

export function porcentajeXP(usuario) {
    if (!usuario) return 0;

    const necesaria = xpNecesaria(usuario.nivel);

    return Math.min(
        100,
        Math.floor((usuario.xp / necesaria) * 100)
    );
}