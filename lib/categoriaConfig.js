// lib/categoriaConfig.js
// ============================================================
// BOT-API
// SISTEMA GLOBAL DE ACTIVAR / DESACTIVAR CATEGORÍAS
// ============================================================
//
// La configuración NO depende del grupo.
//
// Ejemplo:
// .desactivar nsfw
//
// Resultado:
// NSFW queda desactivado GLOBALMENTE para todos los grupos.
//
// .activar nsfw
//
// Resultado:
// NSFW vuelve a estar activado GLOBALMENTE.
//
// Las categorías están activadas por defecto.
// ============================================================

import fs from 'fs';
import path from 'path';

// ============================================================
// ARCHIVO DE CONFIGURACIÓN
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

    const carpeta = path.dirname(ARCHIVO);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO)) {

        fs.writeFileSync(
            ARCHIVO,
            JSON.stringify(
                {
                    categorias: {}
                },
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// CARGAR CONFIGURACIÓN
// ============================================================

function cargar() {

    asegurarArchivo();

    try {

        const datos = JSON.parse(
            fs.readFileSync(
                ARCHIVO,
                'utf8'
            )
        );

        // ----------------------------------------------------
        // Compatibilidad con una configuración anterior
        // ----------------------------------------------------

        if (
            datos &&
            typeof datos === 'object'
        ) {

            // Formato nuevo
            if (
                datos.categorias &&
                typeof datos.categorias === 'object'
            ) {
                return datos;
            }

            // Si existía el formato anterior por grupo,
            // no se utiliza para el sistema global.
            return {
                categorias: {}
            };
        }

    } catch (error) {

        console.error(
            '[CATEGORIAS] ❌ Error leyendo categorias.json:',
            error.message
        );
    }

    return {
        categorias: {}
    };
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
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .replace(
            /[^a-z0-9]/g,
            ''
        );
}

// ============================================================
// ALIAS
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
    media: 'multimedia',
    multimedia: 'multimedia',

    // Utilidades
    utilidad: 'utilidades',
    utilidades: 'utilidades',
    utility: 'utilidades',
    utilities: 'utilidades',

    // Grupos
    group: 'grupos',
    grupo: 'grupos',
    groups: 'grupos',
    grupos: 'grupos',

    // Moderación
    moderacion: 'moderacion',
    moderaciones: 'moderacion',

    // Interacción
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

    // Stickers
    sticker: 'stickers',
    stickers: 'stickers',

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
        ALIAS_CATEGORIAS[normalizada] ||
        normalizada
    );
}

// ============================================================
// COMPROBAR SI ESTÁ ACTIVADA
// ============================================================
//
// IMPORTANTE:
// El JID del grupo ya NO se utiliza.
//
// Si no existe configuración:
//     ACTIVADA
//
// Si está en false:
//     DESACTIVADA
// ============================================================

export function categoriaActivada(
    categoria
) {

    const cat =
        resolverCategoria(
            categoria
        );

    if (!cat) {
        return true;
    }

    const datos =
        cargar();

    const estado =
        datos.categorias?.[cat];

    if (
        typeof estado !== 'boolean'
    ) {
        return true;
    }

    return estado === true;
}

// ============================================================
// ACTIVAR GLOBALMENTE
// ============================================================

export function activarCategoria(
    categoria
) {

    const cat =
        resolverCategoria(
            categoria
        );

    if (!cat) {
        return false;
    }

    const datos =
        cargar();

    if (
        !datos.categorias ||
        typeof datos.categorias !== 'object'
    ) {
        datos.categorias = {};
    }

    datos.categorias[cat] = true;

    guardar(datos);

    console.log(
        `[CATEGORIAS] 🟢 ACTIVADA GLOBALMENTE: ${cat}`
    );

    return true;
}

// ============================================================
// DESACTIVAR GLOBALMENTE
// ============================================================

export function desactivarCategoria(
    categoria
) {

    const cat =
        resolverCategoria(
            categoria
        );

    if (!cat) {
        return false;
    }

    const datos =
        cargar();

    if (
        !datos.categorias ||
        typeof datos.categorias !== 'object'
    ) {
        datos.categorias = {};
    }

    datos.categorias[cat] = false;

    guardar(datos);

    console.log(
        `[CATEGORIAS] 🔴 DESACTIVADA GLOBALMENTE: ${cat}`
    );

    return true;
}

// ============================================================
// OBTENER ESTADO
// ============================================================

export function obtenerEstadoCategoria(
    categoria
) {

    return categoriaActivada(
        categoria
    );
}

// ============================================================
// OBTENER TODAS LAS CATEGORÍAS DESACTIVADAS
// ============================================================

export function obtenerCategoriasDesactivadas() {

    const datos =
        cargar();

    const categorias =
        datos.categorias || {};

    return Object.entries(
        categorias
    )
        .filter(
            ([, estado]) =>
                estado === false
        )
        .map(
            ([categoria]) =>
                categoria
        );
}

// ============================================================
// OBTENER CONFIGURACIÓN GLOBAL
// ============================================================

export function obtenerConfiguracionGlobal() {

    const datos =
        cargar();

    return {
        ...(datos.categorias || {})
    };
}