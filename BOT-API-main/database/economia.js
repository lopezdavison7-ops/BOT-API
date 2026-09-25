import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from '../lib/jsonStore.js';

const __filename =
    fileURLToPath(import.meta.url);

const __dirname =
    path.dirname(__filename);

const ARCHIVO =
    path.join(
        __dirname,
        'economia.json'
    );

export const COOLDOWN_RW =
    4 * 60 * 60 * 1000;

function datos() {

    return obtenerStore(ARCHIVO, {});

}

function guardar() {

    guardarStore(ARCHIVO);

}

function crearUsuario() {

    return {

        dinero: 0,

        banco: 0,

        personajes: [],

        items: [],

        ultimoTrabajo: 0,

        ultimoRW: 0,

        ultimoRobo: 0

    };

}

export function obtenerUsuario(id) {

    const db =
        datos();

    if (!db[id]) {

        db[id] =
            crearUsuario();

        guardar();

        return db[id];

    }

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

export function obtenerTodos() {

    return datos();

}
