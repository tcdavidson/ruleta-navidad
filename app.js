const STORAGE_KEY = 'david-nerea-christmas-roulette-v2';
const PHOTOS_STORAGE_KEY = 'david-nerea-photos-v1';
const $ = id => document.getElementById(id);

const canvas = $('wheelCanvas');
const ctx = canvas.getContext('2d');

let state = loadState();
let userPhotos = loadPhotos();
let currentRotation = 0; // En radianes (sentido horario)
let spinning = false;
let lastTickSlice = -1;
let toastTimer;

// Rutas por defecto si el usuario coloca fotos en la carpeta fotos/
const DEFAULT_FOLDER_PHOTOS = [
  'fotos/foto1.jpg',
  'fotos/foto2.jpg',
  'fotos/foto3.jpg',
  'fotos/foto4.jpg'
];

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
  for (let i = 0; i < misses; i++) arr.push({ type: 'miss', value: '—' });
  return arr;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateStats();
}

function updateStats() {
  $('remainingLabel').textContent = `${state.remaining.length} casillas disponibles`;
  $('giftCount').textContent = state.remaining.filter(s => s.type === 'gift').length;
  $('missCount').textContent = state.remaining.filter(s => s.type === 'miss').length;
  $('spinCount').textContent = state.totalSpins;

  const disabled = spinning || state.remaining.length === 0;
  $('spinButton').disabled = disabled;
  $('hubSpinBtn').disabled = disabled;
  $('testButton').disabled = disabled;

  if (state.remaining.length === 0 && !spinning) {
    $('resultMain').textContent = '¡Has descubierto toda la magia! ♡';
    $('resultSub').textContent = 'No quedan casillas. Puedes reiniciar la ruleta en Personalizar.';
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
   DIBUJO DE LA RULETA 2D ESTILO PASTEL ROSA, CREMA Y DORADO
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
    // Empezamos en -Math.PI / 2 (las 12 en punto) en sentido horario
    const startAngle = -Math.PI / 2 + i * sliceAngle;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    const slot = slots[i];

    // Sector
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();

    // Alternar rosa pastel y crema cálido (estilo cartel navideño)
    if (!slot) {
      ctx.fillStyle = '#fde2ea';
    } else if (slot.type === 'miss') {
      ctx.fillStyle = i % 2 === 0 ? '#f3e5e9' : '#efe3df';
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#f8c6d8' : '#fff7ee';
    }
    ctx.fill();

    // Línea divisoria dorada
    ctx.strokeStyle = '#cfa042';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Contenido del sector
    if (slot) {
      ctx.save();
      ctx.rotate(midAngle);

      const isPink = slot.type !== 'miss' && i % 2 === 0;
      const badgeR = Math.max(22, Math.min(34, 240 / count));
      const badgeDist = radius * 0.72;

      // Círculo numerado superior estilo insignia
      ctx.beginPath();
      ctx.arc(badgeDist, 0, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = slot.type === 'miss' ? '#b3959e' : (isPink ? '#d44d7a' : '#cfa042');
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Número o símbolo dentro de la insignia
      ctx.save();
      ctx.translate(badgeDist, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(badgeR * 1.05)}px 'Quicksand', sans-serif`;
      ctx.fillText(slot.type === 'miss' ? '🍀' : String(slot.value), 0, 1);
      ctx.restore();

      // Texto descriptivo debajo de la insignia
      if (count <= 18) {
        ctx.save();
        ctx.translate(radius * 0.45, 0);
        ctx.rotate(Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = slot.type === 'miss' ? '#7a636a' : '#7b3950';
        const subFontSize = Math.max(15, Math.min(24, 230 / count));
        ctx.font = `700 ${subFontSize}px 'Quicksand', sans-serif`;
        ctx.fillText(slot.type === 'miss' ? 'SIN PREMIO' : 'REGALO', 0, 0);

        // Pequeño corazón decorativo
        ctx.fillStyle = '#cfa042';
        ctx.font = `${Math.round(subFontSize * 0.85)}px sans-serif`;
        ctx.fillText('♡', 0, subFontSize + 6);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  // Borde exterior dorado doble
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
   MATEMÁTICA EXACTA DE GIRO (100% SINCRONIZADA CON EL PUNTERO)
   ========================================================= */
function spinWheel(isTest) {
  if (spinning || state.remaining.length === 0) return;

  const count = state.remaining.length;
  const targetIndex = Math.floor(Math.random() * count);
  const sliceAngle = (Math.PI * 2) / count;

  spinning = true;
  updateStats();
  $('result').classList.remove('pop');
  $('resultMain').textContent = 'Girando con amor…';
  $('resultSub').textContent = 'Un deseo, un giro y un poquito de magia ♡';

  // El puntero está arriba (-Math.PI / 2).
  // El sector i ocupa [ -PI/2 + i*sliceAngle, -PI/2 + (i+1)*sliceAngle ] cuando currentRotation = 0.
  // Al rotar en sentido horario por `R`, el centro del sector `targetIndex` llega a -PI/2 cuando:
  // (targetIndex + 0.5) * sliceAngle + R ≡ 0 (mod 2*PI)
  // => R_target = - (targetIndex + 0.5) * sliceAngle
  const TWO_PI = Math.PI * 2;
  const targetBaseAngle = - (targetIndex + 0.5) * sliceAngle;

  // Normalizar ángulo actual y calcular cuánto falta en sentido horario positivo
  const currentMod = ((currentRotation % TWO_PI) + TWO_PI) % TWO_PI;
  const targetMod = ((targetBaseAngle % TWO_PI) + TWO_PI) % TWO_PI;
  let delta = targetMod - currentMod;
  if (delta <= 0) delta += TWO_PI;

  // Añadir 6 vueltas completas extra + pequeña variación natural dentro del sector (sin salirse)
  const jitter = (Math.random() - 0.5) * (sliceAngle * 0.45);
  const totalDelta = delta + TWO_PI * 6 + jitter;

  const startRotation = currentRotation;
  const endRotation = startRotation + totalDelta;
  const duration = 5000;
  const startTime = performance.now();

  // Ease-out suave tipo ruleta física
  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    currentRotation = startRotation + (endRotation - startRotation) * easeOutQuint(t);

    // Efecto rebote del puntero al pasar por cada división
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

    // Fijar exactamente el ángulo final
    currentRotation = endRotation;
    drawWheel();
    spinning = false;

    // Verificar matemáticamente qué sector quedó debajo del puntero (-PI/2)
    const finalNorm = (((-currentRotation) % TWO_PI) + TWO_PI) % TWO_PI;
    const landedIndex = Math.floor(finalNorm / sliceAngle) % count;
    const landedSlot = state.remaining[landedIndex];

    if (!isTest) {
      state.remaining.splice(landedIndex, 1);
      state.history.push({ type: landedSlot.type, value: landedSlot.value, at: new Date().toISOString() });
      state.totalSpins++;
      persist();
      // Resetear rotación suavemente para que los nuevos sectores encajen limpios
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
    $('resultMain').textContent = '🍀 ¡Ups! Esta vez no toca';
    $('resultSub').textContent = isTest
      ? 'Tirada de prueba · No se ha gastado esta casilla'
      : '¡No pasa nada, mi vida! En la próxima seguro que sí ♡';
  } else {
    $('resultMain').textContent = `🎁 ¡Regalo Nº ${slot.value}!`;
    $('resultSub').textContent = isTest
      ? 'Tirada de prueba · La casilla sigue disponible'
      : '¡Enhorabuena, mi amorcito! Te has ganado este regalito ♥';
    if (!isTest) launchConfetti();
  }
}

/* =========================================================
   CONFETI DE CORAZONES Y ESTRELLAS AL GANAR
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
   PARTÍCULAS AMBIENTALES SUAVES (CORAZONES Y DESTELLOS)
   ========================================================= */
function initParticles() {
  const container = $('particles');
  const icons = ['✦', '♡', '❄', '·'];
  for (let i = 0; i < 24; i++) {
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
}

/* =========================================================
   FOTOS DE FONDO EN MOVIMIENTO (CARRUSEL KEN BURNS)
   ========================================================= */
function loadPhotos() {
  try {
    const saved = JSON.parse(localStorage.getItem(PHOTOS_STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return [];
}

function savePhotos() {
  try {
    localStorage.setItem(PHOTOS_STORAGE_KEY, JSON.stringify(userPhotos));
  } catch (e) {
    showToast('Las fotos pesan demasiado para guardarlas. Prueba con menos fotos.');
  }
}

let slideTimer;
function initSlideshow() {
  const container = $('bgSlideshow');
  container.innerHTML = '';
  clearInterval(slideTimer);

  const sources = userPhotos.length > 0 ? userPhotos : DEFAULT_FOLDER_PHOTOS;
  const validSlides = [];

  sources.forEach((src, idx) => {
    const img = new Image();
    img.onload = () => {
      const div = document.createElement('div');
      div.className = 'bg-slide';
      div.style.backgroundImage = `url("${src}")`;
      container.appendChild(div);
      validSlides.push(div);
      if (validSlides.length === 1) div.classList.add('active');
    };
    img.src = src;
  });

  let currentIdx = 0;
  slideTimer = setInterval(() => {
    if (validSlides.length <= 1) return;
    validSlides[currentIdx].classList.remove('active');
    currentIdx = (currentIdx + 1) % validSlides.length;
    validSlides[currentIdx].classList.add('active');
  }, 6000);
}

function renderPhotoPreviews() {
  const list = $('photoPreviewList');
  list.innerHTML = '';
  userPhotos.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'photo-thumb';
    item.innerHTML = `<img src="${src}" alt="Foto ${idx + 1}"><button title="Eliminar" data-idx="${idx}">×</button>`;
    item.querySelector('button').addEventListener('click', () => {
      userPhotos.splice(idx, 1);
      savePhotos();
      renderPhotoPreviews();
      initSlideshow();
    });
    list.appendChild(item);
  });
}

// Redimensionar foto subida para que quepa sin problema en localStorage
function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1000;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

$('photoUpload').addEventListener('change', async e => {
  const files = Array.from(e.target.files || []).slice(0, 8);
  if (!files.length) return;
  for (const file of files) {
    const dataUrl = await compressImage(file);
    userPhotos.push(dataUrl);
  }
  savePhotos();
  renderPhotoPreviews();
  initSlideshow();
  showToast('¡Fotos añadidas al fondo con amor! ♡');
  e.target.value = '';
});

/* =========================================================
   EVENTOS DE BOTONES Y MODAL
   ========================================================= */
$('spinButton').addEventListener('click', () => spinWheel(false));
$('hubSpinBtn').addEventListener('click', () => spinWheel(false));
$('testButton').addEventListener('click', () => spinWheel(true));

$('openSettings').addEventListener('click', () => {
  $('numberCount').value = state.giftTotal;
  $('missCountInput').value = state.missTotal;
  renderPhotoPreviews();
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
    showToast('Añade al menos una casilla.');
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
  $('resultMain').textContent = '¿Preparada, mi amorcito?';
  $('resultSub').textContent = 'Pulsa el botón rosa y deja que la magia suceda ♡';
  $('settingsModal').hidden = true;
  showToast('¡Ruleta actualizada! ♡');
});

$('resetProgress').addEventListener('click', () => {
  if (!confirm('¿Seguro que quieres recuperar todas las casillas y reiniciar el progreso?')) return;
  state.remaining = buildSlots(state.giftTotal, state.missTotal);
  state.history = [];
  state.totalSpins = 0;
  currentRotation = 0;
  persist();
  drawWheel();
  $('resultMain').textContent = '¡Todo listo para volver a jugar!';
  $('resultSub').textContent = 'La ruleta vuelve a estar completa ♡';
  $('settingsModal').hidden = true;
  showToast('Progreso restablecido.');
});

// Inicializar todo
persist();
drawWheel();
initParticles();
initSlideshow();
