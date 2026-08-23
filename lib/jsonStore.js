// lib/jsonStore.js
// ============================================================
// CACHÉ EN MEMORIA PARA ARCHIVOS JSON
// ============================================================
// Antes: cada comando (ej: .rw, .work, .menu) hacía
// fs.readFileSync + fs.writeFileSync EN CADA EJECUCIÓN.
// Eso bloquea el proceso completo de Node (todos los chats,
// no solo el que lo pidió) por cada lectura/escritura de disco.
//
// Ahora: el archivo se lee UNA sola vez y se guarda en memoria.
// Las escrituras se agrupan (debounce) en vez de tocar el disco
// en cada llamada. El bot responde mucho más rápido, sobre
// todo con muchos usuarios usando economía/juegos a la vez.
// ============================================================

import fs from 'fs';
import path from 'path';

// archivo -> { datos, timer }
const cache = new Map();

const DEBOUNCE_MS = 800;

function asegurarCarpeta(archivo) {

    const carpeta =
        path.dirname(archivo);

    if (!fs.existsSync(carpeta)) {

        fs.mkdirSync(carpeta, {
            recursive: true
        });

    }

}

function cargarDeDisco(archivo, porDefecto) {

    asegurarCarpeta(archivo);

    if (!fs.existsSync(archivo)) {

        fs.writeFileSync(
            archivo,
            JSON.stringify(porDefecto, null, 2),
            'utf8'
        );

        return JSON.parse(
            JSON.stringify(porDefecto)
        );

    }

    try {

        return JSON.parse(
            fs.readFileSync(archivo, 'utf8')
        );

    } catch (error) {

        console.error(
            `[STORE] JSON inválido en ${archivo}, usando valor por defecto:`,
            error.message
        );

        return JSON.parse(
            JSON.stringify(porDefecto)
        );

    }

}

// ============================================================
// OBTENER (lee de disco solo la primera vez, luego de RAM)
// ============================================================

export function obtenerStore(archivo, porDefecto = {}) {

    if (!cache.has(archivo)) {

        cache.set(archivo, {
            datos: cargarDeDisco(archivo, porDefecto),
            timer: null
        });

    }

    return cache.get(archivo).datos;

}

// ============================================================
// GUARDAR (agrupa escrituras; inmediato=true para forzar ya)
// ============================================================

export function guardarStore(archivo, inmediato = false) {

    const entrada =
        cache.get(archivo);

    if (!entrada) {
        return;
    }

    const escribirYa = () => {

        try {

            fs.writeFileSync(
                archivo,
                JSON.stringify(entrada.datos, null, 2),
                'utf8'
            );

        } catch (error) {

            console.error(
                `[STORE] Error guardando ${archivo}:`,
                error.message
            );

        }

        entrada.timer = null;

    };

    if (inmediato) {

        if (entrada.timer) {
            clearTimeout(entrada.timer);
        }

        escribirYa();
        return;

    }

    if (entrada.timer) {
        // Ya hay una escritura agendada, se agrupa con esta.
        return;
    }

    entrada.timer = setTimeout(escribirYa, DEBOUNCE_MS);

}

// ============================================================
// FORZAR GUARDADO DE TODO (útil antes de apagar el bot)
// ============================================================

export function guardarTodoAhora() {

    for (const archivo of cache.keys()) {

        guardarStore(archivo, true);

    }

}
