// lib/categoriaConfig.js
// ============================================================
// BOT-API
// SISTEMA DE ACTIVAR / DESACTIVAR CATEGORÍAS
// ============================================================
//
// Guarda la configuración POR GRUPO.
//
// Ejemplos:
// .desactivar nsfw
// .activar nsfw
// .desactivar economy off
// .activar economy on
//
// Archivo generado:
// database/categorias.json
// ============================================================

import fs from 'fs';
import path from 'path';

// ============================================================
// ARCHIVO
// ============================================================

const ARCHIVO = path.join(
    process.cwd(),
    'database',
    'categorias.json'
);

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {

    const carpeta =
        path.dirname(ARCHIVO);

    if (!fs.existsSync(carpeta)) {

        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO)) {

        fs.writeFileSync(
            ARCHIVO,
            JSON.stringify(
                {},
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// CARGAR
// ============================================================

function cargar() {

    asegurarArchivo();

    try {

        const datos =
            JSON.parse(
                fs.readFileSync(
                    ARCHIVO,
                    'utf8'
                )
            );

        if (
            datos &&
            typeof datos === 'object'
        ) {
            return datos;
        }

    } catch (error) {

        console.error(
            '[CATEGORIAS] Error leyendo categorias.json:',
            error.message
        );
    }

    return {};
}

// ============================================================
// GUARDAR
// ============================================================

function guardar(datos) {

    asegurarArchivo();

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
// NORMALIZAR CATEGORÍA
// ============================================================

export function normalizarCategoria(
    categoria = ''
) {

    return String(categoria)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// ============================================================
// ALIAS DE CATEGORÍAS
// ============================================================
// Permite usar:
// economy -> Economía
// economia -> Economía
// fun -> Diversión
// diversion -> Diversión
// group -> Grupos
// etc.
// ============================================================

const ALIAS_CATEGORIAS = {

    // Economía
    economy: 'economia',
    economica: 'economia',
    economico: 'economia',
    economia: 'economia',

    // Diversión
    fun: 'diversion',
    funny: 'diversion',
    diversion: 'diversion',

    // Descargas
    download: 'descargas',
    downloads: 'descargas',
    descarga: 'descargas',
    descargas: 'descargas',

    // Multimedia
    multimedia: 'multimedia',
    media: 'multimedia',

    // Utilidades
    utilidad: 'utilidades',
    utilidades: 'utilidades',
    utility: 'utilidades',
    utilities: 'utilidades',

    // Grupos
    group: 'grupos',
    grupos: 'grupos',
    grupo: 'grupos',

    // Moderación
    moderacion: 'moderacion',
    moderacioness: 'moderacion',

    // Interacción
    interaccion: 'interaccion',
    interaccion: 'interaccion',

    // Sistema
    sistema: 'sistema',
    system: 'sistema',

    // Owner
    owner: 'owner',

    // IA
    ia: 'ia',
    ai: 'ia',

    // Otros
    otro: 'otros',
    otros: 'otros',

    // NSFW
    nsfw: 'nsfw'
};

// ============================================================
// RESOLVER CATEGORÍA
// ============================================================

export function resolverCategoria(
    categoria = ''
) {

    const normalizada =
        normalizarCategoria(
            categoria
        );

    return (
        ALIAS_CATEGORIAS[
            normalizada
        ] ||
        normalizada
    );
}

// ============================================================
// ESTADO
// ============================================================
// true  = activada
// false = desactivada
//
// Por defecto TODO está activado.
// ============================================================

export function categoriaActivada(
    jid,
    categoria
) {

    if (
        !jid ||
        !jid.endsWith('@g.us')
    ) {
        return true;
    }

    const cat =
        resolverCategoria(
            categoria
        );

    const datos =
        cargar();

    const grupo =
        datos[jid];

    if (
        !grupo ||
        typeof grupo !== 'object'
    ) {
        return true;
    }

    if (
        typeof grupo[cat] !== 'boolean'
    ) {
        return true;
    }

    return grupo[cat] === true;
}

// ============================================================
// ACTIVAR
// ============================================================

export function activarCategoria(
    jid,
    categoria
) {

    if (
        !jid ||
        !jid.endsWith('@g.us')
    ) {
        return false;
    }

    const cat =
        resolverCategoria(
            categoria
        );

    const datos =
        cargar();

    if (
        !datos[jid] ||
        typeof datos[jid] !== 'object'
    ) {
        datos[jid] = {};
    }

    datos[jid][cat] = true;

    guardar(datos);

    return true;
}

// ============================================================
// DESACTIVAR
// ============================================================

export function desactivarCategoria(
    jid,
    categoria
) {

    if (
        !jid ||
        !jid.endsWith('@g.us')
    ) {
        return false;
    }

    const cat =
        resolverCategoria(
            categoria
        );

    const datos =
        cargar();

    if (
        !datos[jid] ||
        typeof datos[jid] !== 'object'
    ) {
        datos[jid] = {};
    }

    datos[jid][cat] = false;

    guardar(datos);

    return true;
}

// ============================================================
// OBTENER ESTADO
// ============================================================

export function obtenerEstadoCategoria(
    jid,
    categoria
) {

    return categoriaActivada(
        jid,
        categoria
    );
}

// ============================================================
// OBTENER CONFIGURACIÓN DEL GRUPO
// ============================================================

export function obtenerCategoriasGrupo(
    jid
) {

    const datos =
        cargar();

    return datos[jid] || {};
}

// ============================================================
// ELIMINAR CONFIGURACIÓN DEL GRUPO
// ============================================================

export function eliminarConfiguracionGrupo(
    jid
) {

    const datos =
        cargar();

    if (datos[jid]) {

        delete datos[jid];

        guardar(datos);
    }
}