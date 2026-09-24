// lib/categoriaConfig.js — 📂 Estado de categorías POR CHAT
// ============================================================
// database/categorias.json:
// {
//   "global": { "nsfw": false },
//   "123@g.us": { "nsfw": true },
//   "456@s.whatsapp.net": { "nsfw": false }
// }
// Regla: estado del chat > estado global > true (activada)
// ============================================================

import fs from 'fs';
import path from 'path';

const RUTA = path.join(process.cwd(), 'database', 'categorias.json');

function leer() {
    try {
        if (!fs.existsSync(RUTA)) return {};
        return JSON.parse(fs.readFileSync(RUTA, 'utf8'));
    } catch (e) {
        return {};
    }
}

function guardar(db) {
    fs.mkdirSync(path.dirname(RUTA), { recursive: true });
    fs.writeFileSync(RUTA, JSON.stringify(db, null, 2), 'utf8');
}

function norm(cat) {
    return String(cat || '').toLowerCase().trim();
}

// ---------- CONSULTAR ----------
// true = activada, false = desactivada
export function categoriaActiva(chatJid, categoria) {
    const db = leer();
    const cat = norm(categoria);
    if (!cat) return true;

    // 1. Estado específico del chat
    if (db[chatJid] && typeof db[chatJid][cat] === 'boolean') {
        return db[chatJid][cat];
    }

    // 2. Estado global
    if (db.global && typeof db.global[cat] === 'boolean') {
        return db.global[cat];
    }

    // 3. Por defecto: activada
    return true;
}

// Devuelve dónde está configurado: 'chat' | 'global' | 'default'
export function origenEstado(chatJid, categoria) {
    const db = leer();
    const cat = norm(categoria);

    if (db[chatJid] && typeof db[chatJid][cat] === 'boolean') return 'chat';
    if (db.global && typeof db.global[cat] === 'boolean') return 'global';
    return 'default';
}

// ---------- CONFIGURAR ----------
// chatJid = null → global
export function setCategoria(chatJid, categoria, activa) {
    const db = leer();
    const cat = norm(categoria);
    const clave = chatJid ? chatJid : 'global';

    if (!db[clave]) db[clave] = {};
    db[clave][cat] = !!activa;
    guardar(db);

    return { clave, cat, activa: !!activa };
}

// Quitar configuración (vuelve al default)
export function resetCategoria(chatJid, categoria) {
    const db = leer();
    const cat = norm(categoria);
    const clave = chatJid ? chatJid : 'global';

    if (db[clave]) {
        delete db[clave][cat];
        if (!Object.keys(db[clave]).length) delete db[clave];
        guardar(db);
        return true;
    }
    return false;
}

// Listar categorías configuradas de un chat (para .cats)
export function listarEstados(chatJid) {
    const db = leer();
    const resultado = [];
    const claves = new Set([
        ...Object.keys(db[chatJid] || {}),
        ...Object.keys(db.global || {})
    ]);

    for (const cat of claves) {
        resultado.push({
            categoria: cat,
            activa: categoriaActiva(chatJid, cat),
            origen: origenEstado(chatJid, cat)
        });
    }
    return resultado;
}