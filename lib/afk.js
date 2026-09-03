// lib/afk.js
// ============================================================
// SISTEMA AFK - BOT-API
// ============================================================
// Guarda el estado AFK por chat y usuario.
//
// Funciona así:
// - .afk       -> entra en AFK
// - cualquier mensaje propio posterior -> vuelve automáticamente
// - si alguien menciona a una persona AFK -> el bot avisa
//
// Los datos se guardan en database/afk.json mediante jsonStore.
// ============================================================

import path from 'path';
import { obtenerStore, guardarStore } from './jsonStore.js';

const AFK_FILE = path.join(process.cwd(), 'database', 'afk.json');

function obtenerBase() {
    return obtenerStore(AFk_FILE_FIX(), {});
}

// Evita depender de una ruta global mutable.
function AFk_FILE_FIX() {
    return AFK_FILE;
}

function limpiarId(id) {
    if (!id || typeof id !== 'string') return '';
    return id.trim();
}

function clavesDeMensaje(msg) {
    const key = msg?.key || {};
    const valores = [
        key.participant,
        key.participantAlt,
        key.remoteJid,
        key.remoteJidAlt,
        key.senderPn,
        key.senderLid
    ];

    return [...new Set(
        valores
            .map(limpiarId)
            .filter(Boolean)
    )];
}

function clavePrincipal(ids = []) {
    return ids.find(id => id.endsWith('@s.whatsapp.net'))
        || ids.find(id => id.endsWith('@lid'))
        || ids[0]
        || '';
}

function coincideIds(a = [], b = []) {
    const setB = new Set(b.filter(Boolean));
    return a.some(id => setB.has(id));
}

export function obtenerIdentificadores(msg) {
    return clavesDeMensaje(msg);
}

export function marcarAfk({ jid, msg, razon = '' }) {
    if (!jid) return null;

    const ids = clavesDeMensaje(msg);
    const usuario = clavePrincipal(ids);

    if (!usuario) return null;

    const db = obtenerBase();

    if (!db[jid]) db[jid] = {};

    db[jid][usuario] = {
        ids,
        razon: String(razon || '').trim().slice(0, 120),
        desde: Date.now()
    };

    guardarStore(AFK_FILE);

    return db[jid][usuario];
}

export function buscarAfk({ jid, msg }) {
    if (!jid) return null;

    const db = obtenerBase();
    const chat = db[jid];

    if (!chat) return null;

    const ids = clavesDeMensaje(msg);

    for (const [usuario, datos] of Object.entries(chat)) {
        if (usuario === '_') continue;
        if (coincideIds(ids, datos?.ids || [usuario])) {
            return {
                usuario,
                ...datos
            };
        }
    }

    return null;
}

export function quitarAfk({ jid, msg }) {
    if (!jid) return null;

    const db = obtenerBase();
    const chat = db[jid];

    if (!chat) return null;

    const ids = clavesDeMensaje(msg);

    for (const [usuario, datos] of Object.entries(chat)) {
        if (coincideIds(ids, datos?.ids || [usuario])) {
            const eliminado = {
                usuario,
                ...datos
            };

            delete chat[usuario];

            if (Object.keys(chat).length === 0) {
                delete db[jid];
            }

            guardarStore(AFK_FILE);
            return eliminado;
        }
    }

    return null;
}

export function buscarAfkPorIds({ jid, ids = [] }) {
    if (!jid || !ids.length) return null;

    const db = obtenerBase();
    const chat = db[jid];

    if (!chat) return null;

    for (const [usuario, datos] of Object.entries(chat)) {
        if (coincideIds(ids, datos?.ids || [usuario])) {
            return {
                usuario,
                ...datos
            };
        }
    }

    return null;
}

export function obtenerAfksDelChat(jid) {
    if (!jid) return [];

    const db = obtenerBase();
    const chat = db[jid];

    if (!chat) return [];

    return Object.entries(chat).map(([usuario, datos]) => ({
        usuario,
        ...datos
    }));
}

export function formatearTiempoAfk(desde) {
    const segundos = Math.max(0, Math.floor((Date.now() - Number(desde || Date.now())) / 1000));
    const dias = Math.floor(segundos / 86400);
    const horas = Math.floor((segundos % 86400) / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);

    if (dias > 0) return `${dias}d ${horas}h`;
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
}
