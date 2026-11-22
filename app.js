const STORAGE_KEY = 'david-nerea-christmas-roulette-v3';
const $ = id => document.getElementById(id);

const canvas = $('wheelCanvas');
const ctx = canvas.getContext('2d');

let state = loadState();
let currentRotation = 0;
let spinning = false;
let lastTickSlice = -1;
let toastTimer;

// Carpeta on has de posar les vostres fotos (per exemple: fotos/1.jpg, fotos/2.jpg, etc.)
const FOLDER_PHOTOS = [
  'fotos/1.jpg',
  'fotos/2.jpg',
  'fotos/3.jpg',
  'fotos/4.jpg',
  'fotos/5.jpg',
  'fotos/6.jpg',
  'fotos/foto1.jpg',
  'fotos/foto2.jpg',
  'fotos/foto3.jpg',
  'fotos/foto4.jpg'
];

function shuffleArray(list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function defaultState() {
  return { giftTotal: 10, missTotal: 2, remaining: [], history: [], totalSpins: 0 };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.remaining) && Array.isArray(saved.history)) return saved;
  } catch (e) {}
  const fresh = defaultState();
  fresh.remaining = buildSlots(fresh.giftTotal, fresh.missTotal);
  return fresh;
}

function buildSlots(gifts, misses) {
  const arr = [];
  for (let i = 1; i <= gifts; i++) arr.push({ type: 'gift', value: i });
  for (let i = 0; i < misses; i++) arr.push({ type: 'miss', value: '🚫' });
  // Ordre sempre aleatori (regals i "sense premi" barrejats)
  return shuffleArray(arr);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateStats();
}

function updateStats() {
  $('giftCount').textContent = state.remaining.filter(s => s.type === 'gift').length;
  $('missCount').textContent = state.remaining.filter(s => s.type === 'miss').length;
  $('spinCount').textContent = state.totalSpins;

  const disabled = spinning || state.remaining.length === 0;
  $('spinButton').disabled = disabled;
  $('hubSpinBtn').disabled = disabled;
  $('testButton').disabled = disabled;

  if (state.remaining.length === 0 && !spinning) {
    $('resultMain').textContent = '¡Has descobert tota la màgia! ♡';
    $('resultSub').textContent = 'Ja no queden caselles. Pots reiniciar la ruleta a Configuració.';
  }
}

function showToast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* =========================================================
   DIBUIX DE LA RULETA 2D (NÚMEROS MÉS GRANS I ICONA 🚫)
   ========================================================= */
function drawWheel() {
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 18;
  ctx.clearRect(0, 0, size, size);

  const slots = state.remaining;
  const count = Math.max(slots.length, 1);
  const sliceAngle = (Math.PI * 2) / count;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(currentRotation);

  for (let i = 0; i < count; i++) {
    const startAngle = -Math.PI / 2 + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    const slot = slots[i];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    if (!slot) {
      ctx.fillStyle = '#fde2ea';
    } else if (slot.type === 'miss') {
      ctx.fillStyle = i % 2 === 0 ? '#f3e5e9' : '#efe3df';
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#f8c6d8' : '#fff7ee';
    }
    ctx.fill();

    ctx.strokeStyle = '#cfa042';
    ctx.lineWidth = 4;
    ctx.stroke();

    if (slot) {
      ctx.save();
      ctx.rotate(midAngle);

      const isPink = slot.type !== 'miss' && i % 2 === 0;
      const badgeR = Math.max(30, Math.min(46, 330 / count));
      const badgeDist = radius * 0.66;

      ctx.beginPath();
      ctx.arc(badgeDist, 0, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = slot.type === 'miss' ? '#c95b7c' : (isPink ? '#d44d7a' : '#cfa042');
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.save();
      ctx.translate(badgeDist, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(badgeR * 1.18)}px 'Quicksand', sans-serif`;
      ctx.fillText(slot.type === 'miss' ? '🚫' : String(slot.value), 0, 1);
      ctx.restore();

      ctx.restore();
    }
  }

  // Vora exterior daurada doble
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#cfa042';
  ctx.lineWidth = 14;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius - 9, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff6df';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

/* =========================================================
   MATEMÀTICA EXACTA DE GIR SINCRONITZADA AMB EL PUNTER
   ========================================================= */
function spinWheel(isTest) {
  if (spinning || state.remaining.length === 0) return;

  const count = state.remaining.length;
  const targetIndex = Math.floor(Math.random() * count);
  const sliceAngle = (Math.PI * 2) / count;

  spinning = true;
  updateStats();
  $('result').classList.remove('pop');
  $('resultMain').textContent = 'Girant amb amor…';
  $('resultSub').textContent = '';

  const TWO_PI = Math.PI * 2;
  const targetBaseAngle = -(targetIndex + 0.5) * sliceAngle;

  const currentMod = ((currentRotation % TWO_PI) + TWO_PI) % TWO_PI;
  const targetMod = ((targetBaseAngle % TWO_PI) + TWO_PI) % TWO_PI;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += TWO_PI;

  const jitter = (Math.random() - 0.5) * (sliceAngle * 0.45);
  const totalDelta = delta + TWO_PI * 6 + jitter;

  const startRotation = currentRotation;
  const endRotation = startRotation + totalDelta;
  const duration = 5000;
  const startTime = performance.now();

  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    currentRotation = startRotation + (endRotation - startRotation) * easeOutQuint(t);

    const normalized = (((-currentRotation) % TWO_PI) + TWO_PI) % TWO_PI;
    const currentSlice = Math.floor(normalized / sliceAngle);
    if (currentSlice !== lastTickSlice) {
      lastTickSlice = currentSlice;
      const ptr = document.querySelector('.pointer');
      ptr.classList.remove('tick');
      void ptr.offsetWidth;
      ptr.classList.add('tick');
    }

    drawWheel();

    if (t < 1) {
      requestAnimationFrame(animate);
      return;
    }

    currentRotation = endRotation;
    drawWheel();
    spinning = false;

    const finalNorm = (((-currentRotation) % TWO_PI) + TWO_PI) % TWO_PI;
    const landedIndex = Math.floor(finalNorm / sliceAngle) % count;
    const landedSlot = state.remaining[landedIndex];

    if (!isTest) {
      state.remaining.splice(landedIndex, 1);
      state.history.push({ type: landedSlot.type, value: landedSlot.value, at: new Date().toISOString() });
      state.totalSpins++;
      persist();
      currentRotation = 0;
      drawWheel();
    }

    showResult(landedSlot, isTest);
    updateStats();
  }

  requestAnimationFrame(animate);
}

function showResult(slot, isTest) {
  const resultBox = $('result');
  resultBox.classList.remove('pop');
  void resultBox.offsetWidth;
  resultBox.classList.add('pop');

  if (slot.type === 'miss') {
    $('resultMain').textContent = '🚫 ¡Ups! Esta vegada no ha pogut ser...';
    $('resultSub').textContent = isTest
      ? 'Tirada de prova · La casella continua disponible'
      : '';
  } else {
    $('resultMain').textContent = `🎁 ¡Regal Nº ${slot.value}!`;
    $('resultSub').textContent = isTest
      ? 'Tirada de prova · La casella continua disponible'
      : '';
    if (!isTest) launchConfetti();
  }
}

/* =========================================================
   CONFETI DE CORS I ESTRELLES EN GUANYAR
   ========================================================= */
function launchConfetti() {
  const symbols = ['♡', '✦', '✨', '♥', '🎁'];
  const colors = ['#d44d7a', '#cfa042', '#ee769d', '#e5b84b'];

  for (let i = 0; i < 42; i++) {
    const el = document.createElement('span');
    el.textContent = symbols[i % symbols.length];
    el.style.cssText = `
      position: fixed;
      z-index: 25;
      left: ${42 + Math.random() * 16}%;
      top: 44%;
      font-size: ${14 + Math.random() * 14}px;
      color: ${colors[i % colors.length]};
      pointer-events: none;
    `;
    document.body.appendChild(el);

    const dx = (Math.random() - 0.5) * 480;
    const dy = -120 + (Math.random() - 0.3) * 420;
    const rot = (Math.random() - 0.5) * 540;

    el.animate([
      { transform: 'translate(0, 0) scale(0.5) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.2) rotate(${rot}deg)`, opacity: 0 }
    ], {
      duration: 1300 + Math.random() * 900,
      easing: 'cubic-bezier(0.16, 0.85, 0.3, 1)'
    }).onfinish = () => el.remove();
  }
}

/* =========================================================
   PARTÍCULES CAIGUENT DE FONS (CORS, ESTRELLES, NEU I FOTOS)
   ========================================================= */
function initFallingBackground() {
  const container = $('particles');
  container.innerHTML = '';

  const icons = ['✦', '♡', '❄', '·'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = icons[i % icons.length];
    p.style.left = `${Math.random() * 100}%`;
    p.style.fontSize = `${10 + Math.random() * 12}px`;
    p.style.color = i % 2 === 0 ? '#cfa042' : '#e68aa8';
    p.style.animationDuration = `${11 + Math.random() * 14}s`;
    p.style.animationDelay = `${-Math.random() * 15}s`;
    container.appendChild(p);
  }

  // Carrega les imatges que existisquen dins de la carpeta fotos/
  FOLDER_PHOTOS.forEach((src, index) => {
    const probe = new Image();
    probe.onload = () => {
      for (let copy = 0; copy < 2; copy++) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.className = 'photo-particle';
        img.style.left = `${6 + Math.random() * 86}%`;
        img.style.animationDuration = `${16 + Math.random() * 12}s`;
        img.style.animationDelay = `${-(index * 3 + copy * 7 + Math.random() * 4)}s`;
        container.appendChild(img);
      }
    };
    probe.src = src;
  });
}

/* =========================================================
   ESDEVENIMENTS DE BOTONS I MODAL
   ========================================================= */
$('spinButton').addEventListener('click', () => spinWheel(false));
$('hubSpinBtn').addEventListener('click', () => spinWheel(false));
$('testButton').addEventListener('click', () => spinWheel(true));

$('openSettings').addEventListener('click', () => {
  $('numberCount').value = state.giftTotal;
  $('missCountInput').value = state.missTotal;
  $('settingsModal').hidden = false;
});

$('closeSettings').addEventListener('click', () => $('settingsModal').hidden = true);
$('settingsModal').addEventListener('click', e => {
  if (e.target === $('settingsModal')) $('settingsModal').hidden = true;
});

$('applySettings').addEventListener('click', () => {
  const gifts = Math.max(0, Math.min(50, parseInt($('numberCount').value, 10) || 0));
  const misses = Math.max(0, Math.min(30, parseInt($('missCountInput').value, 10) || 0));
  if (gifts + misses === 0) {
    showToast('Afig almenys una casella.');
    return;
  }
  state.giftTotal = gifts;
  state.missTotal = misses;
  state.remaining = buildSlots(gifts, misses);
  state.history = [];
  state.totalSpins = 0;
  currentRotation = 0;
  persist();
  drawWheel();
  $('resultMain').textContent = '¿Ja has donat el beset?';
  $('resultSub').textContent = '';
  $('settingsModal').hidden = true;
  showToast('¡Ruleta actualitzada i barrejada! ♡');
});

$('resetProgress').addEventListener('click', () => {
  if (!confirm('¿Segur que vols recuperar totes les caselles i reiniciar el progrés?')) return;
  state.remaining = buildSlots(state.giftTotal, state.missTotal);
  state.history = [];
  state.totalSpins = 0;
  currentRotation = 0;
  persist();
  drawWheel();
  $('resultMain').textContent = '¿Ja has donat el beset?';
  $('resultSub').textContent = '';
  $('settingsModal').hidden = true;
  showToast('Progrés restablit.');
});

// Inicialitzar tot
persist();
drawWheel();
initFallingBackground();
