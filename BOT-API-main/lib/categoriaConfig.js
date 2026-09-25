

import path from 'path';
import { obtenerStore, guardarStore } from './jsonStore.js';

const RUTA = path.join(process.cwd(), 'database', 'categorias.json');

function leer() {
    return obtenerStore(RUTA, {});
}

function guardar() {
    guardarStore(RUTA);
}

function norm(cat) {
    return String(cat || '').toLowerCase().trim();
}

export function categoriaActiva(chatJid, categoria) {
    const db = leer();
    const cat = norm(categoria);
    if (!cat) return true;

    if (db[chatJid] && typeof db[chatJid][cat] === 'boolean') {
        return db[chatJid][cat];
    }

    if (db.global && typeof db.global[cat] === 'boolean') {
        return db.global[cat];
    }

    return true;
}

export function origenEstado(chatJid, categoria) {
    const db = leer();
    const cat = norm(categoria);

    if (db[chatJid] && typeof db[chatJid][cat] === 'boolean') return 'chat';
    if (db.global && typeof db.global[cat] === 'boolean') return 'global';
    return 'default';
}

export function setCategoria(chatJid, categoria, activa) {
    const db = leer();
    const cat = norm(categoria);
    const clave = chatJid ? chatJid : 'global';

    if (!db[clave]) db[clave] = {};
    db[clave][cat] = !!activa;
    guardar();

    return { clave, cat, activa: !!activa };
}

export function resetCategoria(chatJid, categoria) {
    const db = leer();
    const cat = norm(categoria);
    const clave = chatJid ? chatJid : 'global';

    if (db[clave]) {
        delete db[clave][cat];
        if (!Object.keys(db[clave]).length) delete db[clave];
        guardar();
        return true;
    }
    return false;
}

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