

import path from 'path';
import { obtenerStore, guardarStore } from './jsonStore.js';

const RUTA_AFK = path.join(process.cwd(), 'database', 'afk.json');

function datos() {
    return obtenerStore(RUTA_AFK, {});
}

export function obtenerAfk(jid) {
    return datos()[jid] || null;
}

export function setAfk(jid, info) {
    const db = datos();
    db[jid] = info;
    guardarStore(RUTA_AFK);
}

export function quitarAfk(jid) {
    const db = datos();
    const data = db[jid] || null;
    if (data) {
        delete db[jid];
        guardarStore(RUTA_AFK);
    }
    return data;
}
