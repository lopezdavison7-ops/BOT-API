import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from '../lib/jsonStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ARCHIVO = path.join(__dirname, 'modoadmin.json');

function datos() {
    return obtenerStore(ARCHIVO, {});
}

function guardar() {
    guardarStore(ARCHIVO);
}

export function estaActivo(chatJid) {
    return Boolean(datos()[chatJid]);
}

export function activar(chatJid) {
    const db = datos();
    db[chatJid] = true;
    guardar();
}

export function desactivar(chatJid) {
    const db = datos();
    delete db[chatJid];
    guardar();
}