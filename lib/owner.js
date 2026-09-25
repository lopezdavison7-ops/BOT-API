

import path from 'path';
import { fileURLToPath } from 'url';
import { obtenerStore, guardarStore } from './jsonStore.js';

const OWNER_PRINCIPAL = '50578391933';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_OWNER = path.join(
    __dirname,
    '..',
    'database',
    'owner.json'
);

function limpiarNumero(valor = '') {

    return String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

function convertirJID(numero) {

    const limpio = limpiarNumero(numero);

    if (!limpio) {
        return null;
    }

    return `${limpio}@s.whatsapp.net`;
}

function cargarOwners() {

    const datos = obtenerStore(ARCHIVO_OWNER, { owners: [] });

    if (Array.isArray(datos)) {
        return datos;
    }

    if (Array.isArray(datos.owners)) {
        return datos.owners;
    }

    return [];
}

function guardarListaOwners(owners) {

    const limpios = [
        ...new Set(
            owners
                .map(limpiarNumero)
                .filter(Boolean)
                .filter(numero => numero !== OWNER_PRINCIPAL)
        )
    ];

    const datos = obtenerStore(ARCHIVO_OWNER, { owners: [] });
    datos.owners = limpios;
    guardarStore(ARCHIVO_OWNER);

    return limpios;
}

export function obtenerOwners() {

    const adicionales = cargarOwners();

    return [
        OWNER_PRINCIPAL,
        ...adicionales.filter(
            numero => numero !== OWNER_PRINCIPAL
        )
    ];
}

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

export function obtenerOwner() {

    return OWNER_PRINCIPAL;
}

export function guardarOwner(jid) {

    const numero =
        limpiarNumero(jid);

    if (!numero) {
        throw new Error(
            'El número del nuevo Owner no es válido.'
        );
    }

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

export function numeroEsOwner(numero) {

    const limpio =
        limpiarNumero(numero);

    return obtenerOwners().includes(limpio);
}

export function eliminarOwner(jid) {

    const numero =
        limpiarNumero(jid);

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
