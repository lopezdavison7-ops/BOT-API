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

        // Dinero guardado en el banco. NO se puede robar con
        // .rob (solo el dinero en mano/wallet es vulnerable).
        banco: 0,

        personajes: [],

        // Items comprados en .shop (ids repetidos si compra
        // varios del mismo).
        items: [],

        ultimoTrabajo: 0,

        // Última vez que utilizó .rw
        ultimoRW: 0,

        // Última vez que usó .rob (intento o éxito, ambos cuentan)
        ultimoRobo: 0

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

    if (
        typeof db[id].ultimoRobo !== 'number'
    ) {

        db[id].ultimoRobo = 0;
        cambiado = true;

    }

    if (
        typeof db[id].banco !== 'number'
    ) {

        db[id].banco = 0;
        cambiado = true;

    }

    if (
        !Array.isArray(
            db[id].items
        )
    ) {

        db[id].items = [];
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
// COOLDOWN DE ROBO
// ============================================================

// 8 minutos entre intentos de robo
export const COOLDOWN_ROBO =
    8 * 60 * 1000;

export function puedeRobar(id) {

    const usuario =
        obtenerUsuario(id);

    const ahora =
        Date.now();

    const ultimoRobo =
        Number(
            usuario.ultimoRobo || 0
        );

    if (!ultimoRobo) {

        return true;

    }

    return (
        ahora - ultimoRobo >=
        COOLDOWN_ROBO
    );

}

export function tiempoRestanteRobo(id) {

    const usuario =
        obtenerUsuario(id);

    const ahora =
        Date.now();

    const ultimoRobo =
        Number(
            usuario.ultimoRobo || 0
        );

    if (!ultimoRobo) {

        return 0;

    }

    const restante =
        COOLDOWN_ROBO -
        (ahora - ultimoRobo);

    return Math.max(
        0,
        restante
    );

}

export function registrarRobo(id) {

    const db =
        datos();

    if (!db[id]) {

        db[id] =
            crearUsuario();

    }

    db[id].ultimoRobo =
        Date.now();

    guardar();

    return db[id];

}

// ============================================================
// BANCO
// ============================================================
// El dinero en el banco está protegido de .rob. Solo el
// dinero "en mano" (campo `dinero`) es robable.
// ============================================================

export function depositar(
    id,
    cantidad
) {

    const usuario =
        obtenerUsuario(id);

    const monto =
        Math.min(
            cantidad,
            usuario.dinero
        );

    if (monto <= 0) {

        return usuario;

    }

    usuario.dinero -= monto;
    usuario.banco += monto;

    guardar();

    return usuario;

}

export function retirar(
    id,
    cantidad
) {

    const usuario =
        obtenerUsuario(id);

    const monto =
        Math.min(
            cantidad,
            usuario.banco
        );

    if (monto <= 0) {

        return usuario;

    }

    usuario.banco -= monto;
    usuario.dinero += monto;

    guardar();

    return usuario;

}

// ============================================================
// INVENTARIO (items comprados en .shop)
// ============================================================

export function agregarItem(
    id,
    itemId
) {

    const usuario =
        obtenerUsuario(id);

    usuario.items.push(
        itemId
    );

    guardar();

    return usuario;

}

export function obtenerInventario(id) {

    return obtenerUsuario(id).items;

}

// ============================================================
// OBTENER TODOS
// ============================================================

export function obtenerTodos() {

    return datos();

}
