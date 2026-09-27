import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from '../lib/jsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO = path.join(__dirname, 'mutes.json');

function datos() {
    return obtenerStore(ARCHIVO, {});
}

function guardar() {
    guardarStore(ARCHIVO);
}

export function estaMuteado(chatJid, userId) {
    const db = datos();
    return Boolean(db[chatJid]?.[userId]);
}

export function mutear(chatJid, userId, razon = '', quienMutea = '') {
    const db = datos();
    if (!db[chatJid]) db[chatJid] = {};
    db[chatJid][userId] = {
        razon,
        quienMutea,
        fecha: Date.now()
    };
    guardar();
    return db[chatJid][userId];
}

export function desmutear(chatJid, userId) {
    const db = datos();
    if (!db[chatJid]?.[userId]) return false;
    delete db[chatJid][userId];
    if (!Object.keys(db[chatJid]).length) delete db[chatJid];
    guardar();
    return true;
}

export function listarMuteados(chatJid) {
    const db = datos();
    return Object.entries(db[chatJid] || {}).map(([userId, info]) => ({
        userId,
        ...info
    }));
}