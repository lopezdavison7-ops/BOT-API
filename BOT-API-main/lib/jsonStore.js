

import fs from 'fs';
import path from 'path';

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

export function obtenerStore(archivo, porDefecto = {}) {

    if (!cache.has(archivo)) {

        cache.set(archivo, {
            datos: cargarDeDisco(archivo, porDefecto),
            timer: null
        });

    }

    return cache.get(archivo).datos;

}

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

        return;
    }

    entrada.timer = setTimeout(escribirYa, DEBOUNCE_MS);

}

export function guardarTodoAhora() {

    for (const archivo of cache.keys()) {

        guardarStore(archivo, true);

    }

}
