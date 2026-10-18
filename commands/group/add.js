// ════════════════════════════════════════════════════════════════
//  grupos.js — add / remove / tumbar / addall  (Baileys)
// ════════════════════════════════════════════════════════════════
import { jidNormalizedUser, isJidGroup } from '@whiskeysockets/baileys'

// ─────────────────────────── 1. CONFIG ───────────────────────────
export const CFG = {
  codigoPais: '505',        // ← Nicaragua. null = no autocompletar
  largoLocal: 8,            // ← dígitos de móvil local sin país
  esperaMs: 1200,           // ← pausa entre grupos (anti rate-limit)
  expiraInvitaSeg: 604800,  // ← 7 días de validez de la invitación
  maxNumeros: 10,           // ← máx. números por comando
  msg: {
    uso:        'Uso: .{cmd} 50577455383',
    invalido:   'Número inválido o sin WhatsApp',
    noEsGrupo:  'Esto solo funciona dentro de un grupo',
    noAdmin:    'No soy admin acá, no puedo sacar a nadie',
    noEsta:     'Ese número no está en el grupo',
    yaEsta:     'Ya estaba en el grupo',
    agregado:   'Agregado',
    invitado:   'No se pudo agregar por privacidad, le mandé la invitación',
    sacado:     'Sacado',
    sinCambios: 'Sin cambios',
    sinAdmin:   'Grupos donde no soy admin',
    sinMiembro: 'Grupos donde no estaba',
    fallo:      'Falló'
  }
}

// ─────────────────────────── 2. HELPERS ──────────────────────────

/** Normaliza cualquier entrada a JID de teléfono. null si no es válida. */
export function aJidTelefono(entrada) {
  if (!entrada) return null
  let d = String(entrada).replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('00')) d = d.slice(2)
  if (CFG.codigoPais && d.length === CFG.largoLocal) d = CFG.codigoPais + d
  if (d.length < 8 || d.length > 15) return null
  return d + '@s.whatsapp.net'
}

/** Compara un participante contra pn/lid en cualquier formato (id, lid, phoneNumber). */
function coincide(p, pn, lid) {
  const campos = [p.id, p.lid, p.phoneNumber]
    .filter(Boolean)
    .map(jidNormalizedUser)
  return campos.includes(pn) || (!!lid && campos.includes(lid))
}

/** ¿El bot es admin/superadmin de este grupo? */
export async function soyAdmin(sock, groupJid) {
  try {
    const meta = await sock.groupMetadata(groupJid)
    const yo = jidNormalizedUser(sock.user.id)
    const p = meta.participants.find(x => jidNormalizedUser(x.id) === yo)
    return !!p && (p.admin === 'admin' || p.admin === 'superadmin')
  } catch {
    return false
  }
}

/** Valida el número en WhatsApp → { pn, lid } o null */
export async function resolverNumero(sock, entrada) {
  const pn = aJidTelefono(entrada)
  if (!pn) return null
  try {
    const r = await sock.onWhatsApp(pn.replace('@s.whatsapp.net', ''))
    const info = Array.isArray(r) ? r[0] : r
    if (!info?.exists) return null
    return {
      pn: jidNormalizedUser(info.jid || pn),
      lid: info.lid ? jidNormalizedUser(info.lid) : null
    }
  } catch {
    return { pn, lid: null }
  }
}

/** Devuelve el participante con su id EXACTO tal como figura en la metadata. */
export function buscarParticipante(meta, pn, lid) {
  return meta.participants.find(p => coincide(p, pn, lid)) || null
}

/** Convierte "a, b c" en array de números limpios */
export function partirNumeros(texto) {
  return String(texto || '')
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, CFG.maxNumeros)
}

// ─────────────────────────── 3. ACCIONES ─────────────────────────

export async function agregarAlGrupo(sock, groupJid, entrada) {
  const obj = await resolverNumero(sock, entrada)
  if (!obj) return { estado: 'invalido' }

  const meta = await sock.groupMetadata(groupJid)
  if (buscarParticipante(meta, obj.pn, obj.lid)) return { estado: 'ya_esta' }

  const res = await sock.groupParticipantsUpdate(groupJid, [obj.pn], 'add')
  const st = String(res?.[0]?.status ?? '200')
  if (st === '200') return { estado: 'ok' }

  if (['403', '408', '409'].includes(st)) {
    try {
      const code = await sock.groupInviteCode(groupJid)
      await sock.sendMessage(obj.pn, {
        groupInvite: {
          jid: groupJid,
          inviteCode: code,
          inviteExpiration: Math.floor(Date.now() / 1000) + CFG.expiraInvitaSeg,
          subject: meta.subject || 'Grupo',
          text: 'Te invito al grupo'
        }
      })
      return { estado: 'invitado', status: st }
    } catch {
      return { estado: 'fallo', status: st }
    }
  }
  return { estado: 'fallo', status: st }
}

export async function sacarDelGrupo(sock, groupJid, entrada) {
  const obj = await resolverNumero(sock, entrada)
  if (!obj) return { estado: 'invalido' }

  if (!(await soyAdmin(sock, groupJid))) return { estado: 'no_admin' }

  const meta = await sock.groupMetadata(groupJid)
  const p = buscarParticipante(meta, obj.pn, obj.lid)
  if (!p) return { estado: 'no_esta' }

  const res = await sock.groupParticipantsUpdate(groupJid, [p.id], 'remove')
  const st = String(res?.[0]?.status ?? '200')
  return st === '200' ? { estado: 'ok' } : { estado: 'fallo', status: st }
}

/** Saca el número de TODOS los grupos donde el bot es admin. */
export async function tumbarEnTodos(sock, entrada) {
  const obj = await resolverNumero(sock, entrada)
  if (!obj) return { estado: 'invalido' }

  const todos = await sock.groupFetchAllParticipating()
  const yo = jidNormalizedUser(sock.user.id)
  const ok = [], noAdmin = [], noEsta = [], fallo = []

  for (const [gid, meta] of Object.entries(todos)) {
    try {
      const mi = meta.participants.find(x => jidNormalizedUser(x.id) === yo)
      const admin = !!mi && (mi.admin === 'admin' || mi.admin === 'superadmin')
      if (!admin) { noAdmin.push(meta.subject || gid); continue }

      const p = buscarParticipante(meta, obj.pn, obj.lid)
      if (!p) { noEsta.push(meta.subject || gid); continue }

      const res = await sock.groupParticipantsUpdate(gid, [p.id], 'remove')
      const st = String(res?.[0]?.status ?? '200')
      st === '200' ? ok.push(meta.subject || gid) : fallo.push(`${meta.subject || gid} (${st})`)

      await new Promise(r => setTimeout(r, CFG.esperaMs))
    } catch {
      fallo.push(meta.subject || gid)
    }
  }
  return { estado: 'ok', ok, noAdmin, noEsta, fallo }
}

/** Agrega el número a TODOS los grupos donde el bot es admin. */
export async function agregarATodos(sock, entrada) {
  const obj = await resolverNumero(sock, entrada)
  if (!obj) return { estado: 'invalido' }

  const todos = await sock.groupFetchAllParticipating()
  const yo = jidNormalizedUser(sock.user.id)
  const ok = [], yaEsta = [], noAdmin = [], invitado = [], fallo = []

  for (const [gid, meta] of Object.entries(todos)) {
    try {
      const mi = meta.participants.find(x => jidNormalizedUser(x.id) === yo)
      const admin = !!mi && (mi.admin === 'admin' || mi.admin === 'superadmin')
      if (!admin) { noAdmin.push(meta.subject || gid); continue }

      if (buscarParticipante(meta, obj.pn, obj.lid)) { yaEsta.push(meta.subject || gid); continue }

      const res = await sock.groupParticipantsUpdate(gid, [obj.pn], 'add')
      const st = String(res?.[0]?.status ?? '200')
      if (st === '200') ok.push(meta.subject || gid)
      else if (['403', '408', '409'].includes(st)) invitado.push(meta.subject || gid)
      else fallo.push(`${meta.subject || gid} (${st})`)

      await new Promise(r => setTimeout(r, CFG.esperaMs))
    } catch {
      fallo.push(meta.subject || gid)
    }
  }
  return { estado: 'ok', ok, yaEsta, noAdmin, invitado, fallo }
}

// ─────────────────── 4. RESPUESTAS (formato) ─────────────────────

const lista = (t, arr) => arr.length ? `\n\n*${t}* (${arr.length}):\n${arr.map(x => '• ' + x).join('\n')}` : ''

function formatear(r, cmd) {
  switch (r.estado) {
    case 'invalido':  return CFG.msg.invalido
    case 'noEsGrupo': return CFG.msg.noEsGrupo
    case 'no_admin':  return CFG.msg.noAdmin
    case 'no_esta':   return CFG.msg.noEsta
    case 'ya_esta':   return CFG.msg.yaEsta
    case 'agregado':
    case 'ok':
      if (r.ok) {
        return `Listo. ${r.ok.length} grupos.`
          + lista(CFG.msg.sinAdmin, r.noAdmin || [])
          + lista(CFG.msg.sinMiembro, r.noEsta || [])
          + lista('Ya estaba', r.yaEsta || [])
          + lista(CFG.msg.fallo, r.fallo || [])
      }
      return CFG.msg[cmd === 'remove' ? 'sacado' : 'agregado']
    case 'invitado':  return CFG.msg.invitado
    case 'fallo':     return `${CFG.msg.fallo} (status ${r.status})`
    default:          return CFG.msg.sinCambios
  }
}

// ─────────────────────────── 5. DESPACHO ─────────────────────────
//  ← ESTA es la sección que adaptás a tu estructura

const COMANDOS = {
  add:     { tipo: 'grupo', fn: agregarAlGrupo },
  remove:  { tipo: 'grupo', fn: sacarDelGrupo },
  kick:    { tipo: 'grupo', fn: sacarDelGrupo },
  tumbar:  { tipo: 'global', fn: tumbarEnTodos },
  addall:  { tipo: 'global', fn: agregarATodos },
}

/**
 * Devuelve true si el mensaje era un comando de grupos.
 * Llamalo desde tu handler de mensajes.
 */
export async function manejarComandoGrupos(sock, msg, texto) {
  if (!msg?.key?.remoteJid) return false

  const m = String(texto || '').trim().match(/^\.(add|remove|kick|tumbar|addall)\b\s*(.*)$/i)
  if (!m) return false

  const cmd = m[1].toLowerCase()
  const def = COMANDOS[cmd]
  const chat = msg.key.remoteJid
  const responder = txt => sock.sendMessage(chat, { text: txt }, { quoted: msg })

  const numeros = partirNumeros(m[2])
  if (!numeros.length) return void await responder(CFG.msg.uso.replace('{cmd}', cmd)), true

  if (def.tipo === 'grupo' && !isJidGroup(chat)) {
    await responder(CFG.msg.noEsGrupo)
    return true
  }

  // multi-número en comandos de grupo
  if (def.tipo === 'grupo' && numeros.length > 1) {
    const lineas = []
    for (const n of numeros) {
      const r = await def.fn(sock, chat, n)
      lineas.push(`${r.estado === 'ok' ? '✓' : '✗'} ${n} — ${formatear(r, cmd)}`)
      await new Promise(r => setTimeout(r, 600))
    }
    await responder(lineas.join('\n'))
    return true
  }

  try {
    const r = await def.fn(sock, chat, numeros[0])
    await responder(formatear(r, cmd))
  } catch (e) {
    await responder(`${CFG.msg.fallo}: ${e.message}`)
  }
  return true
}