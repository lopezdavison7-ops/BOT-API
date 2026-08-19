// ============================================================
// SISTEMA OWNER - ALEX BOT
// ============================================================
// Owner principal permanente + Owners adicionales
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// CONFIGURACIÓN
// ============================================================

// Owner principal permanente
const OWNER_PRINCIPAL = '50578391933';

// Archivo donde se guardan los Owners adicionales
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_OWNER = path.join(
    __dirname,
    '..',
    'database',
    'owner.json'
);

// ============================================================
// LIMPIAR NÚMERO
// ============================================================

function limpiarNumero(valor = '') {

    return String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// CONVERTIR A JID
// ============================================================

function convertirJID(numero) {

    const limpio = limpiarNumero(numero);

    if (!limpio) {
        return null;
    }

    return `${limpio}@s.whatsapp.net`;
}

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {

    const carpeta = path.dirname(ARCHIVO_OWNER);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO_OWNER)) {

        fs.writeFileSync(
            ARCHIVO_OWNER,
            JSON.stringify(
                {
                    owners: []
                },
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// CARGAR OWNERS
// ============================================================

function cargarOwners() {

    asegurarArchivo();

    try {

        const datos = JSON.parse(
            fs.readFileSync(
                ARCHIVO_OWNER,
                'utf8'
            )
        );

        if (Array.isArray(datos)) {
            return datos;
        }

        if (Array.isArray(datos.owners)) {
            return datos.owners;
        }

        return [];

    } catch (error) {

        console.error(
            '[OWNER] Error leyendo owner.json:',
            error.message
        );

        return [];
    }
}

// ============================================================
// GUARDAR OWNERS
// ============================================================

function guardarListaOwners(owners) {

    asegurarArchivo();

    const limpios = [
        ...new Set(
            owners
                .map(limpiarNumero)
                .filter(Boolean)
                .filter(numero => numero !== OWNER_PRINCIPAL)
        )
    ];

    fs.writeFileSync(
        ARCHIVO_OWNER,
        JSON.stringify(
            {
                owners: limpios
            },
            null,
            2
        ),
        'utf8'
    );

    return limpios;
}

// ============================================================
// OBTENER TODOS LOS OWNERS
// ============================================================

export function obtenerOwners() {

    const adicionales = cargarOwners();

    return [
        OWNER_PRINCIPAL,
        ...adicionales.filter(
            numero => numero !== OWNER_PRINCIPAL
        )
    ];
}

// ============================================================
// COMPROBAR SI ES OWNER
// ============================================================

export function esOwner(msg) {

    const key = msg?.key || {};

    const candidatos = [
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ];

    const owners = obtenerOwners();

    for (const candidato of candidatos) {

        const numero =
            limpiarNumero(candidato);

        if (
            numero &&
            owners.includes(numero)
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// OBTENER OWNER PRINCIPAL
// ============================================================

export function obtenerOwner() {

    return OWNER_PRINCIPAL;
}

// ============================================================
// AGREGAR OWNER
// ============================================================

export function guardarOwner(jid) {

    const numero =
        limpiarNumero(jid);

    if (!numero) {
        throw new Error(
            'El número del nuevo Owner no es válido.'
        );
    }

    // El Owner principal ya es Owner.
    // No hace falta guardarlo como adicional.
    if (numero === OWNER_PRINCIPAL) {
        return convertirJID(numero);
    }

    const actuales =
        cargarOwners();

    if (!actuales.includes(numero)) {

        actuales.push(numero);

        guardarListaOwners(actuales);
    }

    return convertirJID(numero);
}

// ============================================================
// COMPROBAR SI UN NÚMERO ES OWNER
// ============================================================

export function numeroEsOwner(numero) {

    const limpio =
        limpiarNumero(numero);

    return obtenerOwners().includes(limpio);
}

// ============================================================
// ELIMINAR OWNER ADICIONAL
// ============================================================

export function eliminarOwner(jid) {

    const numero =
        limpiarNumero(jid);

    // El Owner principal NUNCA se elimina
    if (numero === OWNER_PRINCIPAL) {

        throw new Error(
            'El Owner principal no puede ser eliminado.'
        );
    }

    const actuales =
        cargarOwners();

    const nuevos =
        actuales.filter(
            owner => owner !== numero
        );

    guardarListaOwners(nuevos);

    return true;
}
