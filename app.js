const STORAGE_KEY = 'david-nerea-christmas-roulette-v6';
const $ = id => document.getElementById(id);

const canvas = $('wheelCanvas');
const ctx = canvas.getContext('2d');

let state = loadState();
let currentRotation = 0;
let spinning = false;
let lastTickSlice = -1;
let toastTimer;

// Carpeta de fotos de fons caient (ja existent)
const FOLDER_PHOTOS = [
  'fotos/1.png',
  'fotos/2.png',
  'fotos/3.png',
  'fotos/4.png',
  'fotos/5.png',
  'fotos/6.png',
  'fotos/foto1.png',
  'fotos/foto2.png',
  'fotos/foto3.png',
  'fotos/foto4.png'
];

// Carpeta independent per a les fotos que ixen dins del llibre / postal d'entrada
const POSTAL_FOLDER_PHOTOS = [
  'postal_fotos/1.png',
  'postal_fotos/2.png',
  'postal_fotos/3.png',
  'postal_fotos/4.png',
  'postal_fotos/5.png',
  'postal_fotos/6.png',
  'postal_fotos/7.png',
  'postal_fotos/8.png'
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
   LLIBRE / POSTAL D'ENTRADA AMB PASSADA DE FULLA NETA
   ========================================================= */
let bookPages = [];
let currentPageIdx = 0;
let turningPage = false;
let flipTimeoutId = null;

function buildPageHtml(pageData) {
  if (!pageData) {
    return `<div class="book-photo-frame" style="background:#fff"></div>`;
  }
  const photoBlock = pageData.imgSrc
    ? `<img src="${pageData.imgSrc}" alt="Record nadalenc">`
    : `<div style="font-size:48px;color:#d44d7a">🎄♡✦</div>`;

  return `
    <div class="book-kicker">${pageData.kicker}</div>
    <div class="book-title">${pageData.title}</div>
    <div class="book-photo-frame">${photoBlock}</div>
    <div class="book-caption">${pageData.caption}</div>
  `;
}

function renderBookPages() {
  const active = bookPages[currentPageIdx];

  $('pageFront').innerHTML = buildPageHtml(active);
  $('pageBack').innerHTML = '';
  $('pageUnder').innerHTML = '';
}

function openBook() {
  clearTimeout(flipTimeoutId);
  const intro = $('bookIntro');
  intro.hidden = false;
  intro.classList.remove('dismissed');
  currentPageIdx = 0;
  turningPage = false;

  const flipEl = $('pageFlip');
  flipEl.style.transition = 'none';
  flipEl.classList.remove('turning');
  renderBookPages();
  void flipEl.offsetWidth;
  flipEl.style.transition = '';
}

function closeBookToWheel() {
  clearTimeout(flipTimeoutId);
  turningPage = false;
  const intro = $('bookIntro');
  intro.classList.add('dismissed');
  setTimeout(() => {
    intro.hidden = true;
  }, 450);
}

function flipNextPage() {
  if (turningPage) return;

  if (currentPageIdx >= bookPages.length - 1) {
    closeBookToWheel();
    return;
  }

  turningPage = true;
  const flipEl = $('pageFlip');
  const underEl = $('pageUnder');
  const nextIndex = currentPageIdx + 1;

  underEl.innerHTML = buildPageHtml(bookPages[nextIndex]);
  $('pageBack').innerHTML = '';

  flipEl.style.transition = 'transform 0.32s ease, opacity 0.24s ease';
  void flipEl.offsetWidth;
  flipEl.classList.add('turning');

  flipTimeoutId = setTimeout(() => {
    currentPageIdx = nextIndex;
    flipEl.style.transition = 'none';
    flipEl.style.opacity = '0';
    flipEl.classList.remove('turning');
    $('pageFront').innerHTML = buildPageHtml(bookPages[currentPageIdx]);
    underEl.innerHTML = '';
    void flipEl.offsetWidth;
    flipEl.style.opacity = '1';
    void flipEl.offsetWidth;
    flipEl.style.opacity = '';
    flipEl.style.transition = 'transform 0.32s ease, opacity 0.24s ease';
    turningPage = false;
  }, 270);
}

function initBookIntro() {
  bookPages = [
    {
      kicker: 'FELICITACIÓ DE NADAL ♡',
      title: 'Per a tu, Nerea',
      imgSrc: 'postal_fotos/1.png',
      caption: 'Gracies per un Nadalet més, al meu costaet. De part del teu amorcito, David.'
    },
    {
      kicker: 'RECORD 2 ♡',
      title: 'Junts en Nadal',
      imgSrc: 'postal_fotos/2.png',
      caption: 'El millor regal és poder formar una familia amb tu ♡'
    },
    {
      kicker: 'RECORD 3 ♡',
      title: 'Junts en Nadal',
      imgSrc: 'postal_fotos/3.png',
      caption: "T'estime molt amor ♡"
    },
    {
      kicker: 'A PUNT DE COMENÇAR ♡',
      title: 'La teua ruleta',
      imgSrc: null,
      caption: 'Sols una tirada per dia · Un beset per al teu amoret ♡'
    }
  ];

  renderBookPages();
  $('pageUnder').innerHTML = bookPages[1] ? buildPageHtml(bookPages[1]) : '';

  const extraPhotos = [];
  const candidates = POSTAL_FOLDER_PHOTOS.slice(3);
  if (candidates.length === 0) return;

  let checked = 0;
  candidates.forEach(src => {
    const img = new Image();
    img.onload = () => {
      extraPhotos.push(src);
      checked++;
      if (checked === candidates.length && extraPhotos.length > 0) {
        const closingPage = bookPages[bookPages.length - 1];
        const basePages = bookPages.slice(0, -1);
        extraPhotos.forEach((foundSrc, idx) => {
          basePages.push({
            kicker: `RECORD ${idx + 4} ♡`,
            title: 'Junts en Nadal',
            imgSrc: foundSrc,
            caption: "T'estime molt amor ♡"
          });
        });
        basePages.push(closingPage);
        bookPages = basePages;
      }
    };
    img.onerror = () => {
      checked++;
    };
    img.src = src;
  });
}

/* =========================================================
   DIBUIX I LÒGICA EXACTA DE LA RULETA
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

function getSlotUnderPointer(rotationRad, count) {
  const TWO_PI = Math.PI * 2;
  const sliceAngle = TWO_PI / count;
  const offset = (((-rotationRad) % TWO_PI) + TWO_PI) % TWO_PI;
  return Math.floor(offset / sliceAngle) % count;
}

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
  const desiredMod = (((-(targetIndex + 0.5) * sliceAngle) % TWO_PI) + TWO_PI) % TWO_PI;
  const currentMod = ((currentRotation % TWO_PI) + TWO_PI) % TWO_PI;
  let delta = desiredMod - currentMod;
  if (delta <= 0) delta += TWO_PI;

  const totalDelta = delta + TWO_PI * 6;
  const startRotation = currentRotation;
  const endRotation = startRotation + totalDelta;
  const duration = 3800;
  const startTime = performance.now();

  const easeOutQuint = t => 1 - Math.pow(1 - t, 5);

  function animate(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / duration);
    currentRotation = startRotation + (endRotation - startRotation) * easeOutQuint(t);

    const currentSlice = getSlotUnderPointer(currentRotation, count);
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

    const landedIndex = getSlotUnderPointer(currentRotation, count);
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

function launchConfetti() {
  const symbols = ['♡', '✦', '✨', '♥', '🎁'];
  const colors = ['#d44d7a', '#cfa042', '#ee769d', '#e5b84b'];

  for (let i = 0; i < 36; i++) {
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

function initFallingBackground() {
  const container = $('particles');
  container.innerHTML = '';

  const icons = ['✦', '♡', '❄', '·'];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = icons[i % icons.length];
    p.style.left = `${Math.random() * 100}%`;
    p.style.fontSize = `${11 + Math.random() * 12}px`;
    p.style.color = i % 2 === 0 ? '#cfa042' : '#e68aa8';
    p.style.animationDuration = `${11 + Math.random() * 14}s`;
    p.style.animationDelay = `${-Math.random() * 15}s`;
    container.appendChild(p);
  }

  FOLDER_PHOTOS.forEach((src, index) => {
    const probe = new Image();
    probe.onload = () => {
      for (let copy = 0; copy < 2; copy++) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.className = 'photo-particle';
        img.style.left = `${6 + Math.random() * 86}%`;
        img.style.animationDuration = `${15 + Math.random() * 11}s`;
        img.style.animationDelay = `${-(index * 3 + copy * 6 + Math.random() * 3)}s`;
        container.appendChild(img);
      }
    };
    probe.src = src;
  });
}

$('bookStage').addEventListener('click', flipNextPage);
$('reopenBookBtn').addEventListener('click', openBook);

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

persist();
drawWheel();
initFallingBackground();
initBookIntro();
