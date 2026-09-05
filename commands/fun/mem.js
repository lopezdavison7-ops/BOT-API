// commands/juegos/mem.js
export default {
    nombre: 'mem',
    categoria: 'fun',
    alias: ['memoria', 'memory', 'juego'],
    descripcion: 'Juega al memorama contra la IA',
    ejecutar: async ({ msg, responder, sock }) => {
        try {
            const from = msg.key.remoteJid;
            
            // Aquí va el HTML del juego (copiado de tu amigo pero adaptado al juego de memoria)
            const htmlPayload = `<style>
* { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; box-sizing: border-box; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #eee; touch-action: manipulation; }
.mem-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.mem-card { background: rgba(15, 18, 28, 0.88); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(0, 243, 255, 0.25); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 243, 255, 0.15), 0 0 15px rgba(157, 78, 221, 0.2); }
.mem-header { padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(0,243,255,0.05), rgba(157,78,221,0.05)); }
.mem-title { font-size: 19px; font-weight: 900; color: #fff; text-shadow: 0 0 10px rgba(0, 243, 255, 0.6); letter-spacing: 1px; }
.mem-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; }
.mem-body { padding: 20px; }
.mem-dif { display: flex; justify-content: space-between; margin-bottom: 15px; }
.btn-dif { padding: 8px 15px; border: none; border-radius: 20px; cursor: pointer; font-weight: bold; font-size: 12px; color: #fff; }
.facil { background: #22c55e; }
.normal { background: #eab308; }
.dificil { background: #ef4444; }
.mem-scores { display: flex; justify-content: space-around; margin-bottom: 15px; }
.mem-box { background: #1e293b; padding: 10px; border-radius: 10px; width: 40%; text-align: center; }
.mem-box h3 { margin: 0; font-size: 12px; color: #00f3ff; }
.mem-box h1 { margin: 5px 0; font-size: 24px; }
.mem-board { display: grid; gap: 5px; margin: 0 auto; width: fit-content; background: #1e293b; padding: 10px; border-radius: 10px; }
.mem-card { width: 40px; height: 40px; background: #334155; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; border: 2px solid #475569; }
.mem-card.flip { background: #f8fafc; border-color: #94a3b8; }
#memStatus { margin: 15px 0; font-size: 16px; text-align: center; }
#memNewGame { padding: 10px 20px; background: #22c55e; border: none; border-radius: 10px; color: white; font-size: 16px; cursor: pointer; display: none; margin: 10px auto; text-align: center; width: fit-content; }
</style>

<div class="mem-wrap">
  <div class="mem-card">
    <div class="mem-header">
      <div>
        <div class="mem-sub">MEMORIA PvAI</div>
        <div class="mem-title">Encuentra las parejas</div>
      </div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%;box-shadow:0 0 8px #00ff87;animation:pulse 1.5s infinite;"></div>
    </div>
    <div class="mem-body">
      <div class="mem-dif">
        <button class="btn-dif facil" onclick="startGame(4,4)">Fácil</button>
        <button class="btn-dif normal" onclick="startGame(4,5)">Normal</button>
        <button class="btn-dif dificil" onclick="startGame(6,4)">Difícil</button>
      </div>
      <div class="mem-scores">
        <div class="mem-box"><h3>TÚ</h3><h1 id="pScore">0</h1></div>
        <div class="mem-box"><h3>IA</h3><h1 id="aiScore">0</h1></div>
      </div>
      <div id="memStatus">¡Tu turno! Encuentra una pareja.</div>
      <div class="mem-board" id="memBoard"></div>
      <button id="memNewGame" onclick="startGame(4,4)">🔄 Nuevo juego</button>
    </div>
  </div>
</div>

<style>
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>

<script>
(function() {
  const board = document.getElementById('memBoard');
  const pScoreEl = document.getElementById('pScore');
  const aiScoreEl = document.getElementById('aiScore');
  const statusEl = document.getElementById('memStatus');
  const newGameBtn = document.getElementById('memNewGame');
  const emojis = ['🎯','👽','⚽','🦊','🍎','🎸','🦄','🚗','🏀','🚀','🌍','💎','🐸','🎩','🍕','🎁','👑','🔥','🎲','💡','🐱','🌸','🎃','⭐'];
  
  let cards = [], flipped = [], pScore = 0, aiScore = 0, turn = 'p', pairs = 0, totalPairs = 0;

  function startGame(rows, cols) {
    totalPairs = (rows * cols) / 2;
    pairs = 0; pScore = 0; aiScore = 0; turn = 'p';
    updateScores(); statusEl.innerText = "¡Tu turno! Encuentra una pareja.";
    const usedEmojis = emojis.slice(0, totalPairs);
    cards = [...usedEmojis, ...usedEmojis].sort(() => Math.random() - 0.5);
    board.innerHTML = ''; board.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    
    cards.forEach((emoji, index) => {
      const card = document.createElement('div');
      card.classList.add('mem-card'); card.dataset.index = index; card.dataset.emoji = emoji;
      card.onclick = () => flipCard(card, 'p');
      board.appendChild(card);
    });
    newGameBtn.style.display = 'none';
  }

  function updateScores() {
    pScoreEl.innerText = pScore; aiScoreEl.innerText = aiScore;
  }

  function flipCard(card, player) {
    if (turn !== player || card.classList.contains('flip') || flipped.length === 2) return;
    card.classList.add('flip'); card.innerText = card.dataset.emoji; flipped.push(card);
    if (flipped.length === 2) checkMatch(player);
  }

  function checkMatch(player) {
    const [c1, c2] = flipped;
    if (c1.dataset.emoji === c2.dataset.emoji) {
      c1.style.visibility = 'hidden'; c2.style.visibility = 'hidden'; flipped = []; pairs++;
      if (player === 'p') pScore++; else aiScore++;
      updateScores();
      if (pairs === totalPairs) {
        statusEl.innerText = `¡Fin! Tú: ${pScore} | IA: ${aiScore}`;
        newGameBtn.style.display = 'block'; return;
      }
      if (player === 'p') turn = 'p'; else turn = 'ai';
      setTimeout(() => aiTurn(), 800);
    } else {
      setTimeout(() => {
        c1.classList.remove('flip'); c2.classList.remove('flip'); c1.innerText = ''; c2.innerText = '';
        flipped = []; turn = (player === 'p') ? 'ai' : 'p';
        if (turn === 'ai') setTimeout(() => aiTurn(), 500);
        else statusEl.innerText = "¡Tu turno! Encuentra una pareja.";
      }, 1000);
    }
  }

  function aiTurn() {
    statusEl.innerText = "Turno de la IA...";
    const available = Array.from(board.children).filter(c => !c.classList.contains('flip') && c.style.visibility !== 'hidden');
    if (available.length < 2) return;
    let knownPairs = [];
    for(let i=0; i<available.length; i++) { for(let j=i+1; j<available.length; j++) { if(available[i].dataset.emoji === available[j].dataset.emoji) knownPairs.push([available[i], available[j]]); } }
    let choice;
    if (knownPairs.length > 0) choice = knownPairs[0];
    else { choice = [available[Math.floor(Math.random() * available.length)], available[Math.floor(Math.random() * available.length)]]; if(choice[0] === choice[1]) choice[1] = available[(available.indexOf(choice[0]) + 1) % available.length]; }
    setTimeout(() => { flipCard(choice[0], 'ai'); setTimeout(() => flipCard(choice[1], 'ai'), 300); }, 500);
  }

  startGame(4, 4);
})();
</script>`;

            // Este método es el de tu amigo. Si tu bot no tiene las firmas, NO funcionará.
            await sock.relayMessage(from, {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                    botMetadata: {
                        messageDisclaimerText: '',
                        botResponseId: 'b2e40280-433c-45d8-9c1a-270bec558860',
                        verificationMetadata: {
                            proofs: [{
                                version: 1, useCase: 1,
                                signature: 'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YeN55YRyad2+ZA==',
                                certificateChain: [
                                    'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg6Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg',
                                    'TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0cT2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=='
                                ]
                            }]
                        }
                    }
                },
                botForwardedMessage: {
                    message: {
                        richResponseMessage: {
                            messageType: 1,
                            submessages: [{ messageType: 2, messageText: '@MEMORIA' }],
                            unifiedResponse: {
                                data: Buffer.from(JSON.stringify({
                                    response_id: 'mem-' + Date.now(),
                                    sections: [{
                                        view_model: {
                                            primitive: {
                                                __typename: 'GenAIaeacdsnwHtmlPrimitive',
                                                payload: htmlPayload,
                                                trusted_sources: ['nixel.dev']
                                            },
                                            __typename: 'GenAISingleLayoutViewModel'
                                        }
                                    }]
                                })).toString('base64')
                            },
                            contextInfo: {
                                forwardingScore: 1, isForwarded: true,
                                forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' },
                                forwardOrigin: 4
                            }
                        }
                    }
                }
            }, {});

        } catch (error) {
            console.error('[MEM] Error:', error);
            await responder.texto('❌ Error al iniciar el juego.');
        }
    }
};