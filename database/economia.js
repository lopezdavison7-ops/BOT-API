import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from '../lib/jsonStore.js';

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

// ============================================================
// ARCHIVO DE ECONOMÍA
// ============================================================

const ARCHIVO =
    path.join(
        __dirname,
        'economia.json'
    );

// ============================================================
// CONFIGURACIÓN RW
// ============================================================

// 4 horas en milisegundos
export const COOLDOWN_RW =
    4 * 60 * 60 * 1000;

// ============================================================
// ACCESO A DATOS (ahora en memoria, no toca disco cada vez)
// ============================================================

function datos() {

    return obtenerStore(ARCHIVO, {});

}

function guardar() {

    // Escritura en disco agrupada (debounce), no bloquea el bot.
    guardarStore(ARCHIVO);

}

// ============================================================
// CREAR USUARIO
// ============================================================

function crearUsuario() {

    return {

        dinero: 0,

        personajes: [],

        ultimoTrabajo: 0,

        // Última vez que utilizó .rw
        ultimoRW: 0

    };

}

// ============================================================
// OBTENER USUARIO
// ============================================================

export function obtenerUsuario(id) {

    const db =
        datos();

    if (!db[id]) {

        db[id] =
            crearUsuario();

        guardar();

        return db[id];

    }

    // --------------------------------------------------------
    // Compatibilidad con usuarios existentes
    // --------------------------------------------------------

    let cambiado = false;

    if (
        typeof db[id].dinero !== 'number'
    ) {

        db[id].dinero = 0;
        cambiado = true;

    }

    if (
        !Array.isArray(
            db[id].personajes
        )
    ) {

        db[id].personajes = [];
        cambiado = true;

    }

    if (
        typeof db[id].ultimoTrabajo !== 'number'
    ) {

        db[id].ultimoTrabajo = 0;
        cambiado = true;

    }

    if (
        typeof db[id].ultimoRW !== 'number'
    ) {

        db[id].ultimoRW = 0;
        cambiado = true;

    }

    if (cambiado) {

        guardar();

    }

    return db[id];

}

// ============================================================
// MODIFICAR DINERO
// ============================================================

export function modificarDinero(
    id,
    cantidad
) {

    const db =
        datos();

    if (!db[id]) {

        db[id] =
            crearUsuario();

    }

    db[id].dinero +=
        cantidad;

    if (
        db[id].dinero < 0
    ) {

        db[id].dinero = 0;

    }

    guardar();

    return db[id];

}

// ============================================================
// GUARDAR USUARIO
// ============================================================

export function guardarUsuario(
    id,
    usuario
) {

    const db =
        datos();

    db[id] =
        usuario;

    guardar();

    return usuario;

}

// ============================================================
// COMPROBAR COOLDOWN DE RW
// ============================================================

export function puedeUsarRW(id) {

    const usuario =
        obtenerUsuario(id);

    const ahora =
        Date.now();

    const ultimoRW =
        Number(
            usuario.ultimoRW || 0
        );

    if (!ultimoRW) {

        return true;

    }

    return (
        ahora - ultimoRW >=
        COOLDOWN_RW
    );

}

// ============================================================
// TIEMPO RESTANTE DE RW
// ============================================================

export function tiempoRestanteRW(id) {

    const usuario =
        obtenerUsuario(id);

    const ahora =
        Date.now();

    const ultimoRW =
        Number(
            usuario.ultimoRW || 0
        );

    if (!ultimoRW) {

        return 0;

    }

    const restante =
        COOLDOWN_RW -
        (ahora - ultimoRW);

    return Math.max(
        0,
        restante
    );

}

// ============================================================
// REGISTRAR USO DE RW
// ============================================================

export function registrarRW(id) {

    const db =
        datos();

    if (!db[id]) {

        db[id] =
            crearUsuario();

    }

    db[id].ultimoRW =
        Date.now();

    guardar();

    return db[id];

}

// ============================================================
// OBTENER TODOS
// ============================================================

export function obtenerTodos() {

    return datos();

}
