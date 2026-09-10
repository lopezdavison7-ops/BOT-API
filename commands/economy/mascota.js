import db from "#db"

// 🐾 Lista de mascotas disponibles
const MASCOTAS_DISPONIBLES = [
  { id: 1, nombre: 'Perrito', emoji: '🐶', precio: 80 },
  { id: 2, nombre: 'Gatito', emoji: '🐱', precio: 80 },
  { id: 3, nombre: 'Conejito', emoji: '🐰', precio: 80 },
  { id: 4, nombre: 'Zorrito', emoji: '🦊', precio: 100 },
  { id: 5, nombre: 'Panda', emoji: '🐼', precio: 120 },
  { id: 6, nombre: 'Pollito', emoji: '🐤', precio: 70 },
  { id: 7, nombre: 'Hámster', emoji: '🐹', precio: 90 },
  { id: 8, nombre: 'Pony', emoji: '🐴', precio: 150 },
  { id: 9, nombre: 'Cerdito', emoji: '🐷', precio: 95 },
  { id: 10, nombre: 'Pajarito', emoji: '🐦', precio: 85 },
  { id: 11, nombre: 'Pezcito', emoji: '🐟', precio: 75 },
  { id: 12, nombre: 'Unicornio', emoji: '🦄', precio: 300 },
  { id: 13, nombre: 'Mapache', emoji: '🦝', precio: 110 },
  { id: 14, nombre: 'Koala', emoji: '🐨', precio: 130 },
  { id: 15, nombre: 'Leoncito', emoji: '🦁', precio: 200 }
]

// ⏱️ Configuración de decaimiento con el tiempo
const CONFIG = {
  decaimientoCada: 2 * 60 * 60 * 1000, // 2 horas
  hambrePorIntervalo: 15,
  felicidadPorIntervalo: 10,
  saludPorIntervalo: 5,
  umbralEscape: 15, // Si baja de esto, se escapa
  recompensaDiaria: 30,
  recompensaMinSalud: 60
}

function actualizarEstadoMascota(user) {
  if (!user.mascota) return false
  const ahora = Date.now()
  const ultimo = user.mascota.ultimoDecaimiento || ahora
  const pasaron = ahora - ultimo

  if (pasaron >= CONFIG.decaimientoCada) {
    const veces = Math.floor(pasaron / CONFIG.decaimientoCada)
    user.mascota.hambre = Math.max(0, user.mascota.hambre - CONFIG.hambrePorIntervalo * veces)
    user.mascota.felicidad = Math.max(0, user.mascota.felicidad - CONFIG.felicidadPorIntervalo * veces)
    user.mascota.salud = Math.max(0, user.mascota.salud - CONFIG.saludPorIntervalo * veces)
    user.mascota.ultimoDecaimiento = ahora
    return true
  }
  return false
}

export default {
    nombre: 'mascota',
    categoria: 'Economia',
    alias: ['comprarmascota', 'alimentar', 'daramor', 'mascotas', 'recompensa'],
    descripcion: 'Compra y cuida tu mascota virtual. Se escapa si la descuidas!',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const chatId = msg.chat
            const chat = await db.getChat(chatId)
            const user = await db.getChatUser(chatId, msg.sender)

            const args = argumento? argumento.split(' ') : []
            const accion = args[0]?.toLowerCase() || ''

            if (chat.adminonly ||!chat.rpg) {
                await responder.texto(mess.comandooff)
                return
            }

            // 📋 Ver lista de mascotas
            if (['mascotas', 'lista', 'ver'].includes(accion)) {
                let lista = '🐾 *MASCOTAS DISPONIBLES:*\n\n'
                MASCOTAS_DISPONIBLES.forEach(m => {
                    lista += `${m.id}. ${m.emoji} ${m.nombre} — ¥${m.precio}\n`
                })
                lista += '\n> Para comprar: *.comprarmascota <numero>*'
                await responder.texto(lista)
                return
            }

            // 🛒 Comprar mascota
            if (['comprarmascota', 'comprar'].includes(accion)) {
                if (user.mascota) {
                    await responder.texto(`「✦」Ya tienes: ${user.mascota.emoji} ${user.mascota.nombre}\nCuídala bien con *.alimentar* y *.daramor*`)
                    return
                }

                const num = parseInt(args[1])
                if (!num || num < 1 || num > MASCOTAS_DISPONIBLES.length) {
                    await responder.texto('「✦」Escribe el número de la mascota:\nEjemplo: *.comprarmascota 1*\nUsa *.mascotas* para ver la lista')
                    return
                }

                const elegida = MASCOTAS_DISPONIBLES.find(m => m.id === num)
                if ((user.coins || 0) < elegida.precio) {
                    await responder.texto(`「✦」${elegida.emoji} ${elegida.nombre} cuesta ¥${elegida.precio} moras`)
                    return
                }

                user.coins -= elegida.precio
                user.mascota = {
                    id: elegida.id,
                    nombre: elegida.nombre,
                    emoji: elegida.emoji,
                    hambre: 100,
                    felicidad: 100,
                    salud: 100,
                    cuidados: 0,
                    ultimoDecaimiento: Date.now(),
                    ultimaRecompensa: 0
                }

                await db.updateChatUser(chatId, msg.sender, 'coins', user.coins)
                await db.updateChatUser(chatId, msg.sender, 'mascota', user.mascota)

                await responder.texto(`🎉 ¡Compraste a ${elegida.emoji} ${elegida.nombre}!\n\n⚠️ Atención:\n• Su hambre y felicidad bajan cada 2 horas\n• Si baja de ${CONFIG.umbralEscape}%, ¡se puede escapar!\n• Reclama tu bono diario con *.recompensa*`)
                return
            }

            // ⚠️ Sin mascota
            if (!user.mascota) {
                await responder.texto('「✦」No tienes mascota todavía.\nUsa *.mascotas* para ver las disponibles y *.comprarmascota <numero>* para adoptar una 🐾')
                return
            }

            // ⏱️ Actualizar estado
            actualizarEstadoMascota(user)
            await db.updateChatUser(chatId, msg.sender, 'mascota', user.mascota)

            // 😢 Verificar si se escapó
            if (user.mascota.hambre <= CONFIG.umbralEscape ||
                user.mascota.felicidad <= CONFIG.umbralEscape ||
                user.mascota.salud <= CONFIG.umbralEscape) {
                const escapada = {...user.mascota }
                user.mascota = null
                await db.updateChatUser(chatId, msg.sender, 'mascota', null)
                await responder.texto(`😢 ¡OH NO!\nTu ${escapada.emoji} ${escapada.nombre} se escapó de casa...\nLo descuidaste demasiado.\n\nVuelve a adoptar otra con *.comprarmascota* ¡y cuídala mejor!`)
                return
            }

            // 📊 Ver estado
            if (accion === '' || accion === 'estado') {
                let alerta = ''
                if (user.mascota.hambre < 35) alerta += '⚠️ ¡Tiene mucha hambre! 🍖\n'
                if (user.mascota.felicidad < 35) alerta += '⚠️ ¡Se siente sola! 💖\n'
                if (user.mascota.salud < 35) alerta += '⚠️ ¡No se siente bien! 💊\n'

                await responder.texto(`🐾 *TU MASCOTA:* ${user.mascota.emoji} ${user.mascota.nombre}\n\n🍖 Hambre: ${user.mascota.hambre}%\n💖 Felicidad: ${user.mascota.felicidad}%\n❤️ Salud: ${user.mascota.salud}%\n📈 Cuidados: ${user.mascota.cuidados}\n\n${alerta}> Aliméntala con *.alimentar* y dale amor con *.daramor*`)
                return
            }

            // 🍖 Alimentar
            if (accion === 'alimentar') {
                const costo = 10
                if ((user.coins || 0) < costo) {
                    await responder.texto(`「✦」Necesitas ¥${costo} moras para darle de comer`)
                    return
                }

                user.coins -= costo
                user.mascota.hambre = Math.min(100, user.mascota.hambre + 35)
                user.mascota.cuidados++
                await db.updateChatUser(chatId, msg.sender, 'coins', user.coins)
                await db.updateChatUser(chatId, msg.sender, 'mascota', user.mascota)

                await responder.texto(`🍖 Alimentaste a ${user.mascota.emoji} ${user.mascota.nombre}\nHambre: ${user.mascota.hambre}%\nCuidados: ${user.mascota.cuidados}`)
                return
            }

            // 💖 Dar amor
            if (accion === 'daramor') {
                const costo = 5
                if ((user.coins || 0) < costo) {
                    await responder.texto(`「✦」Necesitas ¥${costo} moras para darle amor`)
                    return
                }

                user.coins -= costo
                user.mascota.felicidad = Math.min(100, user.mascota.felicidad + 30)
                user.mascota.cuidados++
                await db.updateChatUser(chatId, msg.sender, 'coins', user.coins)
                await db.updateChatUser(chatId, msg.sender, 'mascota', user.mascota)

                await responder.texto(`💖 Le diste mucho amor a ${user.mascota.emoji} ${user.mascota.nombre}\nFelicidad: ${user.mascota.felicidad}%\nCuidados: ${user.mascota.cuidados}`)
                return
            }

            // 🎁 Recompensa diaria
            if (accion === 'recompensa') {
                const hoy = new Date().toDateString()
                const ultima = user.mascota.ultimaRecompensa
                const saludTotal = user.mascota.hambre + user.mascota.felicidad + user.mascota.salud

                if (ultima === hoy) {
                    await responder.texto(`「✦」Ya cobraste tu recompensa hoy.\nVuelve mañana! 📅`)
                    return
                }

                if (saludTotal < CONFIG.recompensaMinSalud * 3) {
                    await responder.texto(`「✦」Tu mascota necesita estar bien cuidada para cobrar.\nCuídala más y vuelve a intentarlo! 💪`)
                    return
                }

                user.coins = (user.coins || 0) + CONFIG.recompensaDiaria
                user.mascota.ultimaRecompensa = hoy
                await db.updateChatUser(chatId, msg.sender, 'coins', user.coins)
                await db.updateChatUser(chatId, msg.sender, 'mascota', user.mascota)

                await responder.texto(`🎁 *¡Recompensa Diaria!*\n\nRecibiste ¥${CONFIG.recompensaDiaria} moras por cuidar bien a ${user.mascota.emoji} ${user.mascota.nombre} 🎉\nSaldo: ¥${user.coins.toLocaleString()}`)
                return
            }

        } catch (error) {
            console.error('[MASCOTA] Error:', error)
            await responder.texto('❌ Error en el sistema de mascotas.')
        }
    }
  }
