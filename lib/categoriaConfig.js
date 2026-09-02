// lib/categoriaConfig.js
// ============================================================
// BOT-API
// SISTEMA GLOBAL DE ACTIVAR / DESACTIVAR CATEGORÍAS
// ============================================================
//
// La configuración es GLOBAL.
//
// .desactivar nsfw
// → NSFW se bloquea en grupos Y chats privados.
//
// .activar nsfw
// → NSFW vuelve a funcionar globalmente.
//
// Todas las categorías están ACTIVADAS por defecto.
// No requiere ninguna dependencia adicional.
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
// CARGAR
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

        if (
            datos &&
            typeof datos === 'object' &&
            datos.categorias &&
            typeof datos.categorias === 'object'
        ) {
            return datos;
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
// NORMALIZAR
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

    economy: 'economia',
    economica: 'economia',
    economico: 'economia',
    economia: 'economia',

    fun: 'diversion',
    funny: 'diversion',
    diversion: 'diversion',

    download: 'descargas',
    downloads: 'descargas',
    descarga: 'descargas',
    descargas: 'descargas',

    media: 'multimedia',
    multimedia: 'multimedia',

    utilidad: 'utilidades',
    utilidades: 'utilidades',
    utility: 'utilidades',
    utilities: 'utilidades',

    group: 'grupos',
    grupo: 'grupos',
    groups: 'grupos',
    grupos: 'grupos',

    moderacion: 'moderacion',
    moderaciones: 'moderacion',

    interaccion: 'interaccion',

    sistema: 'sistema',
    system: 'sistema',

    owner: 'owner',

    ia: 'ia',
    ai: 'ia',

    otro: 'otros',
    otros: 'otros',

    sticker: 'stickers',
    stickers: 'stickers',

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
// COMPROBAR ESTADO GLOBAL
// ============================================================
//
// Si una categoría no aparece en el archivo,
// se considera ACTIVADA.
//
// false = desactivada
// true  = activada
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
// CATEGORÍAS DESACTIVADAS
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
// CONFIGURACIÓN GLOBAL
// ============================================================

export function obtenerConfiguracionGlobal() {

    const datos =
        cargar();

    return {
        ...(datos.categorias || {})
    };
}