import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {

    if (!fs.existsSync(ARCHIVO)) {

        fs.writeFileSync(
            ARCHIVO,
            '{}',
            'utf8'
        );

    }

}

// ============================================================
// CARGAR DATOS
// ============================================================

function cargar() {

    asegurarArchivo();

    try {

        return JSON.parse(
            fs.readFileSync(
                ARCHIVO,
                'utf8'
            )
        );

    } catch {

        return {};

    }

}

// ============================================================
// GUARDAR DATOS
// ============================================================

function guardar(datos) {

    fs.writeFileSync(
        ARCHIVO,
        JSON.stringify(
            datos,
            null,
            2
        ),
        'utf8'
    );

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

    const datos =
        cargar();

    if (!datos[id]) {

        datos[id] =
            crearUsuario();

        guardar(datos);

        return datos[id];

    }

    // --------------------------------------------------------
    // Compatibilidad con usuarios existentes
    // --------------------------------------------------------

    if (
        typeof datos[id].dinero !== 'number'
    ) {

        datos[id].dinero = 0;

    }

    if (
        !Array.isArray(
            datos[id].personajes
        )
    ) {

        datos[id].personajes = [];

    }

    if (
        typeof datos[id].ultimoTrabajo !== 'number'
    ) {

        datos[id].ultimoTrabajo = 0;

    }

    if (
        typeof datos[id].ultimoRW !== 'number'
    ) {

        datos[id].ultimoRW = 0;

        guardar(datos);

    }

    return datos[id];

}

// ============================================================
// MODIFICAR DINERO
// ============================================================

export function modificarDinero(
    id,
    cantidad
) {

    const datos =
        cargar();

    if (!datos[id]) {

        datos[id] =
            crearUsuario();

    }

    datos[id].dinero +=
        cantidad;

    if (
        datos[id].dinero < 0
    ) {

        datos[id].dinero = 0;

    }

    guardar(datos);

    return datos[id];

}

// ============================================================
// GUARDAR USUARIO
// ============================================================

export function guardarUsuario(
    id,
    usuario
) {

    const datos =
        cargar();

    datos[id] =
        usuario;

    guardar(datos);

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

    const datos =
        cargar();

    if (!datos[id]) {

        datos[id] =
            crearUsuario();

    }

    datos[id].ultimoRW =
        Date.now();

    guardar(datos);

    return datos[id];

}

// ============================================================
// OBTENER TODOS
// ============================================================

export function obtenerTodos() {

    return cargar();

}
