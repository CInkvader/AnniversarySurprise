// Pure vanilla JS, no frameworks

(function () {
  'use strict';

  // CONFIG
  const START_DATE = new Date('2022-06-12T00:00:00');

  const SCRATCH_IMAGES = [];
  for (let n = 1; n <= 9; n++) {
    SCRATCH_IMAGES.push('images/image_' + n + '.jpg');
  }

  const REWARDS = [
    'Long Hug 🤗',
    '$100,000 USD Dollars',
    'Forehead kiss 🥰',
    'iPhone 17 Pro Max',
    'Flying Kiss 😘',
    'RTX 5090 32GB'
  ];

  const WHEEL_COLORS = [
    '#dcfce7', '#fce7f3', '#fef9e7',
    '#bbf7d0', '#fbcfe8', '#e0f2fe'
  ];

  // DOM REFERENCES
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const lockSection = $('#lock-section');
  const comboLock = $('#combo-lock');
  const lockError = $('#lock-error');

  const scratchSection = $('#scratch-section');
  const scratchGrid = $('#scratch-grid');
  const scratchProgressBar = $('#scratch-progress-bar');
  const revealSection = $('#reveal-section');
  const revealText = $('#reveal-text');
  const mainContent = $('#main-content');
  const siteHeader = $('#site-header');

  const modalOverlay = $('#modal-overlay');
  const modalContent = $('#modal-content');
  const modalClose = $('#modal-close');

  const particleCanvas = $('#particle-canvas');
  const fireworksCanvas = $('#fireworks-canvas');
  const confettiCanvas = $('#confetti-canvas');

  // COMBINATION LOCK LOGIC
  let currentLockState = [0, 0, 0, 0, 0, 0];
  const lockShackle = $('#lock-shackle');

  function initLock() {
    if (!comboLock) return;

    for (let i = 0; i < 6; i++) {
      currentLockState[i] = Math.floor(Math.random() * 10);
    }

    const wheels = $$('.digit-wheel');
    wheels.forEach((wheel, index) => {
      const btnUp = wheel.querySelector('.btn-up');
      const btnDown = wheel.querySelector('.btn-down');
      const display = wheel.querySelector('.digit-display');

      display.textContent = currentLockState[index];

      btnUp.addEventListener('click', () => {
        animateDigit(display, index, 1);
      });

      btnDown.addEventListener('click', () => {
        animateDigit(display, index, -1);
      });
    });

    function animateDigit(display, index, direction) {
      const outClass = direction === 1 ? 'slide-up-out' : 'slide-down-out';
      const inClass = direction === 1 ? 'slide-up-in' : 'slide-down-in';

      display.classList.add(outClass);

      setTimeout(() => {
        if (direction === 1) {
          currentLockState[index] = (currentLockState[index] + 1) % 10;
        } else {
          currentLockState[index] = (currentLockState[index] - 1 + 10) % 10;
        }
        display.textContent = currentLockState[index];

        display.classList.remove(outClass);
        display.classList.add(inClass);

        void display.offsetWidth;

        display.classList.remove(inClass);
      }, 50);
    }

    if (lockShackle) {
      lockShackle.addEventListener('click', attemptUnlock);
    }
  }

  let decryptedUrls = [];

  function decryptAllImages(key) {
    decryptedUrls.forEach(url => URL.revokeObjectURL(url));
    decryptedUrls = [];

    const promises = [];
    const cards = $$('.scratch-card');

    for (let i = 1; i <= 9; i++) {
      promises.push(
        fetch(`images/image_${i}.bin`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to load encrypted image ${i}`);
            return res.arrayBuffer();
          })
          .then(buffer => {
            const view = new Uint8Array(buffer);
            const keyBytes = new TextEncoder().encode(key);
            for (let j = 0; j < view.length; j++) {
              view[j] ^= keyBytes[j % keyBytes.length];
            }
            const blob = new Blob([view], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);
            decryptedUrls.push(url);

            const card = cards[i - 1];
            if (card) {
              const img = card.querySelector('img');
              if (img) img.src = url;
            }
          })
      );
    }
    return Promise.all(promises);
  }

  function attemptUnlock() {
    const entered = currentLockState.join('');
    lockError.textContent = "Verifying code... 🔒";
    lockError.style.color = "var(--green-600)";
    lockError.classList.remove('hidden');

    fetch('images/image_1.bin')
      .then(res => {
        if (!res.ok) throw new Error("Could not load validation image");
        return res.arrayBuffer();
      })
      .then(buffer => {
        const view = new Uint8Array(buffer);
        const keyBytes = new TextEncoder().encode(entered);

        const b0 = view[0] ^ keyBytes[0 % keyBytes.length];
        const b1 = view[1] ^ keyBytes[1 % keyBytes.length];
        const b2 = view[2] ^ keyBytes[2 % keyBytes.length];

        if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF) {
          lockError.textContent = "Decrypting memories... 💚";
          lockShackle.classList.add('unlocked');
          launchFireworks(6);

          decryptAllImages(entered)
            .then(() => {
              setTimeout(() => {
                lockSection.classList.add('fade-out');
                setTimeout(() => {
                  lockSection.classList.add('hidden');
                  showReveal();
                }, 800);
              }, 1000);
            });
        } else {
          throw new Error("Invalid JPEG header");
        }
      })
      .catch(err => {
        console.warn(err);
        lockError.textContent = "Wrong code! Try again.";
        lockError.style.color = "var(--pink-500)";
        lockShackle.classList.remove('shake');
        void lockShackle.offsetWidth;
        lockShackle.classList.add('shake');
        lockError.classList.remove('hidden');

        setTimeout(() => {
          lockShackle.classList.remove('shake');
        }, 400);
      });
  }

  initLock();

  // PARTICLE BACKGROUND
  const pCtx = particleCanvas.getContext('2d');
  let particles = [];

  function resizeParticleCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
  }

  function createParticles(count = 40) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        r: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.1,
        hue: Math.random() > 0.5 ? 142 : 330,
      });
    }
  }

  function animateParticles() {
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = particleCanvas.width;
      if (p.x > particleCanvas.width) p.x = 0;
      if (p.y < 0) p.y = particleCanvas.height;
      if (p.y > particleCanvas.height) p.y = 0;

      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      pCtx.fillStyle = `hsla(${p.hue}, 60%, 70%, ${p.opacity})`;
      pCtx.fill();
    });
    requestAnimationFrame(animateParticles);
  }

  resizeParticleCanvas();
  createParticles();
  animateParticles();
  window.addEventListener('resize', () => {
    resizeParticleCanvas();
    createParticles();
  });

  // FIREWORKS SYSTEM
  const fwCtx = fireworksCanvas.getContext('2d');
  let fireworks = [];
  let fwParticles = [];
  let fwRunning = false;

  function resizeFWCanvas() {
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
  }
  resizeFWCanvas();
  window.addEventListener('resize', resizeFWCanvas);

  class Firework {
    constructor(x, y, targetY) {
      this.x = x;
      this.y = y;
      this.targetY = targetY;
      this.speed = 4 + Math.random() * 3;
      this.alive = true;
      this.hue = Math.random() > 0.5 ? 142 : 330;
    }
    update() {
      this.y -= this.speed;
      if (this.y <= this.targetY) {
        this.alive = false;
        for (let i = 0; i < 40; i++) {
          const angle = (Math.PI * 2 / 40) * i;
          const vel = 2 + Math.random() * 3;
          fwParticles.push({
            x: this.x,
            y: this.y,
            vx: Math.cos(angle) * vel,
            vy: Math.sin(angle) * vel,
            life: 1,
            decay: 0.015 + Math.random() * 0.015,
            hue: this.hue,
            r: 2 + Math.random() * 2,
          });
        }
      }
    }
    draw(ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, 1)`;
      ctx.fill();
    }
  }

  function launchFireworks(count = 5) {
    fwRunning = true;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        fireworks.push(new Firework(
          Math.random() * fireworksCanvas.width,
          fireworksCanvas.height,
          fireworksCanvas.height * (0.15 + Math.random() * 0.35)
        ));
      }, i * 300);
    }
    setTimeout(() => { fwRunning = false; }, count * 300 + 3000);
  }

  function animateFireworks() {
    fwCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

    fireworks = fireworks.filter(fw => {
      fw.update();
      if (fw.alive) fw.draw(fwCtx);
      return fw.alive;
    });

    fwParticles = fwParticles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= p.decay;
      if (p.life <= 0) return false;
      fwCtx.beginPath();
      fwCtx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      fwCtx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.life})`;
      fwCtx.fill();
      return true;
    });

    requestAnimationFrame(animateFireworks);
  }
  animateFireworks();

  // CONFETTI SYSTEM
  const cfCtx = confettiCanvas.getContext('2d');
  let confettiPieces = [];

  function resizeCFCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  resizeCFCanvas();
  window.addEventListener('resize', resizeCFCanvas);

  function launchConfetti(amount = 120) {
    for (let i = 0; i < amount; i++) {
      confettiPieces.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 200,
        y: confettiCanvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        w: 6 + Math.random() * 6,
        h: 4 + Math.random() * 4,
        color: ['#4ade80', '#f472b6', '#fbbf24', '#60a5fa', '#a78bfa', '#fb923c', '#22c55e', '#ec4899'][Math.floor(Math.random() * 8)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        life: 1,
        decay: 0.005 + Math.random() * 0.005,
      });
    }
  }

  function animateConfetti() {
    cfCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiPieces = confettiPieces.filter(c => {
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.18;
      c.vx *= 0.99;
      c.rotation += c.rotationSpeed;
      c.life -= c.decay;
      if (c.life <= 0 || c.y > confettiCanvas.height + 20) return false;

      cfCtx.save();
      cfCtx.translate(c.x, c.y);
      cfCtx.rotate((c.rotation * Math.PI) / 180);
      cfCtx.globalAlpha = c.life;
      cfCtx.fillStyle = c.color;
      cfCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      cfCtx.restore();
      return true;
    });
    requestAnimationFrame(animateConfetti);
  }
  animateConfetti();

  // SCRATCH CARD SYSTEM
  let scratchCardsRevealed = 0;
  const totalCards = 9;
  const scratchCanvases = [];

  function buildScratchCards() {
    scratchGrid.innerHTML = '';
    for (let i = 0; i < totalCards; i++) {
      const card = document.createElement('div');
      card.className = 'scratch-card';
      card.dataset.index = i;

      // Background image
      const img = document.createElement('img');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      img.alt = 'Hidden photo ' + (i + 1);
      img.draggable = false;
      card.appendChild(img);

      // Scratch canvas
      const cvs = document.createElement('canvas');
      cvs.width = 300;
      cvs.height = 300;
      card.appendChild(cvs);

      scratchGrid.appendChild(card);

      const ctx = cvs.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 300, 300);
      grad.addColorStop(0, '#86efac');
      grad.addColorStop(0.5, '#f9a8d4');
      grad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 300, 300);

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 72px "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 150, 150);

      const state = { isScratching: false, revealed: false, lastPos: null };

      scratchCanvases.push({ cvs, ctx, state, card });

      const BRUSH_RADIUS = 28;

      function getPos(e) {
        const rect = cvs.getBoundingClientRect();
        const scaleX = cvs.width / rect.width;
        const scaleY = cvs.height / rect.height;
        if (e.touches) {
          return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY,
          };
        }
        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        };
      }

      function spawnScratchDebris(canvas, pos) {
        if (Math.random() > 0.3) return;

        const rect = canvas.getBoundingClientRect();
        const screenX = rect.left + pos.x * (rect.width / canvas.width);
        const screenY = rect.top + pos.y * (rect.height / canvas.height);

        const count = Math.floor(Math.random() * 2) + 1;
        for (let j = 0; j < count; j++) {
          const debris = document.createElement('div');
          debris.className = 'scratch-debris';
          debris.style.left = screenX + 'px';
          debris.style.top = screenY + 'px';

          const dx = (Math.random() - 0.5) * 80 + 'px';
          const dy = (Math.random() * 100 + 40) + 'px';
          debris.style.setProperty('--dx', dx);
          debris.style.setProperty('--dy', dy);

          document.body.appendChild(debris);
          setTimeout(() => {
            if (debris.parentNode) debris.remove();
          }, 800);
        }
      }

      function scratch(pos) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = BRUSH_RADIUS * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (state.lastPos) {
          ctx.beginPath();
          ctx.moveTo(state.lastPos.x, state.lastPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, BRUSH_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }

        state.lastPos = { x: pos.x, y: pos.y };
        ctx.globalCompositeOperation = 'source-over';
        spawnScratchDebris(cvs, pos);
        checkRevealed(i);
      }

      function stopScratching() {
        state.isScratching = false;
        state.lastPos = null;
      }

      cvs.addEventListener('mousedown', (e) => {
        e.preventDefault();
        state.isScratching = true;
        state.lastPos = null;
        scratch(getPos(e));
      });
      cvs.addEventListener('mousemove', (e) => {
        if (state.isScratching) scratch(getPos(e));
      });
      document.addEventListener('mouseup', stopScratching);

      cvs.addEventListener('touchstart', (e) => {
        e.preventDefault();
        state.isScratching = true;
        state.lastPos = null;
        scratch(getPos(e));
      }, { passive: false });
      cvs.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (state.isScratching) scratch(getPos(e));
      }, { passive: false });
      cvs.addEventListener('touchend', stopScratching);
    }
  }

  function checkRevealed(index) {
    const { cvs, ctx, state, card } = scratchCanvases[index];
    if (state.revealed) return;

    const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height);
    const pixels = imageData.data;
    let transparent = 0;
    const total = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    const percent = transparent / total;
    if (percent > 0.85) {
      state.revealed = true;
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      card.classList.add('revealed');
      scratchCardsRevealed++;
      updateProgress();

      launchFireworks(3);
      spawnFloatingHearts();

      if (scratchCardsRevealed >= totalCards) {
        onAllCardsRevealed();
      }
    }
  }

  function updateProgress() {
    if (scratchProgressBar) {
      const pct = (scratchCardsRevealed / totalCards) * 100;
      scratchProgressBar.style.width = pct + '%';
    }
  }

  function onAllCardsRevealed() {
    launchFireworks(8);
    spawnFloatingHearts();
  }

  buildScratchCards();

  // REVEAL ANIMATION
  function showReveal() {
    revealSection.classList.remove('hidden');
    setTimeout(() => {
      revealText.classList.add('move-up');
      setTimeout(() => {
        revealSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        requestAnimationFrame(() => {
          mainContent.classList.add('visible');
        });
        startTimer();
        triggerSecretReveal();
        spawnFloatingHearts();
      }, 1200);
    }, 2500);
  }

  // RELATIONSHIP TIMER
  function startTimer() {
    function update() {
      const now = new Date();
      let diff = now - START_DATE;

      let years = now.getFullYear() - START_DATE.getFullYear();
      let months = now.getMonth() - START_DATE.getMonth();
      let days = now.getDate() - START_DATE.getDate();
      let hours = now.getHours() - START_DATE.getHours();
      let minutes = now.getMinutes() - START_DATE.getMinutes();
      let seconds = now.getSeconds() - START_DATE.getSeconds();

      if (seconds < 0) { seconds += 60; minutes--; }
      if (minutes < 0) { minutes += 60; hours--; }
      if (hours < 0) { hours += 24; days--; }
      if (days < 0) {
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      if (months < 0) { months += 12; years--; }

      $('#timer-years').textContent = years;
      $('#timer-months').textContent = months;
      $('#timer-days').textContent = days;
      $('#timer-hours').textContent = String(hours).padStart(2, '0');
      $('#timer-minutes').textContent = String(minutes).padStart(2, '0');
      $('#timer-seconds').textContent = String(seconds).padStart(2, '0');
    }
    update();
    setInterval(update, 1000);
  }

  // CARD FLIP & MODAL SYSTEM
  const flipCards = $$('.flip-card');

  flipCards.forEach(card => {
    card.addEventListener('click', () => {
      const cardType = card.dataset.card;
      openModal(cardType);
    });
  });

  function openModal(type) {
    $$('.modal-inner').forEach(el => el.classList.add('hidden'));
    $(`#modal-${type}`).classList.remove('hidden');

    modalOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      modalOverlay.classList.add('visible');
    });

    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('visible');
    setTimeout(() => {
      modalOverlay.classList.add('hidden');
      document.body.style.overflow = '';
    }, 400);
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // SPIN WHEEL
  const wheelCanvas = $('#spin-wheel-canvas');
  const wheelCtx = wheelCanvas.getContext('2d');
  const btnSpin = $('#btn-spin');
  const spinResult = $('#spin-result');
  const spinResultText = $('#spin-result-text');
  const btnPlayAgain = $('#btn-play-again');

  let wheelAngle = 0;
  let wheelSpinning = false;

  function drawWheel(angle) {
    const cx = wheelCanvas.width / 2;
    const cy = wheelCanvas.height / 2;
    const r = cx - 10;
    const segmentAngle = (Math.PI * 2) / REWARDS.length;

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

    REWARDS.forEach((reward, i) => {
      const startA = angle + i * segmentAngle;
      const endA = startA + segmentAngle;

      wheelCtx.beginPath();
      wheelCtx.moveTo(cx, cy);
      wheelCtx.arc(cx, cy, r, startA, endA);
      wheelCtx.closePath();
      wheelCtx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      wheelCtx.fill();
      wheelCtx.strokeStyle = 'rgba(255,255,255,0.8)';
      wheelCtx.lineWidth = 2;
      wheelCtx.stroke();

      // Text
      wheelCtx.save();
      wheelCtx.translate(cx, cy);
      wheelCtx.rotate(startA + segmentAngle / 2);
      wheelCtx.textAlign = 'right';
      wheelCtx.fillStyle = '#1a3a2a';
      wheelCtx.font = '600 13px Inter, sans-serif';

      // Word wrap for long texts
      const text = reward.replace(/ /g, '\u00A0');
      wheelCtx.fillText(text, r - 20, 4);
      wheelCtx.restore();
    });

    // Center circle
    wheelCtx.beginPath();
    wheelCtx.arc(cx, cy, 22, 0, Math.PI * 2);
    wheelCtx.fillStyle = '#ffffff';
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#86efac';
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();

    wheelCtx.fillStyle = '#22c55e';
    wheelCtx.font = '700 14px Inter';
    wheelCtx.textAlign = 'center';
    wheelCtx.textBaseline = 'middle';
    wheelCtx.fillText('GO', cx, cy);
  }

  drawWheel(0);

  btnSpin.addEventListener('click', () => {
    if (wheelSpinning) return;
    wheelSpinning = true;
    btnSpin.disabled = true;
    spinResult.classList.add('hidden');

    const realIndices = [0, 2, 4];
    const resultIndex = realIndices[Math.floor(Math.random() * realIndices.length)];
    const segmentAngle = (Math.PI * 2) / REWARDS.length;

    const targetSegmentCenter = resultIndex * segmentAngle + segmentAngle / 2;
    const targetAngle = -Math.PI / 2 - targetSegmentCenter;

    const extraRotations = 5 + Math.floor(Math.random() * 3);
    const totalRotation = extraRotations * Math.PI * 2 + (targetAngle - wheelAngle % (Math.PI * 2));

    const startAngle = wheelAngle;
    const endAngle = startAngle + totalRotation;
    const duration = 4000;
    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const eased = 1 - Math.pow(1 - progress, 3);
      wheelAngle = startAngle + totalRotation * eased;
      drawWheel(wheelAngle);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        wheelSpinning = false;
        btnSpin.disabled = false;

        spinResultText.textContent = REWARDS[resultIndex];
        spinResult.classList.remove('hidden');
        btnSpin.classList.add('hidden');
        launchConfetti(100);
      }
    }

    requestAnimationFrame(animate);
  });

  btnPlayAgain.addEventListener('click', () => {
    spinResult.classList.add('hidden');
    btnSpin.classList.remove('hidden');
  });

  // COMPATIBILITY CALCULATOR
  const compatInput = $('#compat-input');
  const btnCompat = $('#btn-compat');
  const compatResult = $('#compat-result');
  const compatPercentage = $('#compat-percentage');
  const compatMessage = $('#compat-message');

  const ACCEPTED_NAMES = [
    'celeste diane',
    'diane celeste',
    'celeste',
    'diane',
  ];

  btnCompat.addEventListener('click', calculateCompat);
  compatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') calculateCompat();
  });

  function calculateCompat() {
    const name = compatInput.value.trim().toLowerCase();
    if (!name) return;

    const isMatch = ACCEPTED_NAMES.includes(name);
    const targetPct = isMatch ? 100 : 0;

    compatResult.classList.remove('hidden');
    compatPercentage.className = 'compat-percentage';

    let current = 0;
    const increment = isMatch ? 2 : 1;
    const interval = setInterval(() => {
      current += increment;
      if (current >= targetPct) {
        current = targetPct;
        clearInterval(interval);

        if (isMatch) {
          compatPercentage.classList.add('love');
          compatMessage.textContent = 'Made for each other. Always and forever. 💚';
          launchConfetti(80);
          spawnFloatingHearts();
        } else {
          compatPercentage.classList.add('nope');
          compatMessage.textContent = "Hmm… sorry, there's only one match for me 💚";
          compatInput.value = '';
        }
      }
      compatPercentage.textContent = current + '%';
    }, 20);
  }

  function spawnFloatingHearts() {
    const hearts = ['💚', '💕', '💘', '❤️', '💗', '💖'];
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        heart.style.left = Math.random() * window.innerWidth + 'px';
        heart.style.top = (window.innerHeight * 0.5 + Math.random() * 200) + 'px';
        heart.style.fontSize = (1 + Math.random() * 1.5) + 'rem';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 3200);
      }, i * 150);
    }
  }

  // WISHING TREE — NOTE CLICK / POPUP
  const WISH_NOTES = [
    { icon: '💌', title: 'D-Day', text: 'March 13, 2022 — the day I confessed to you' },
    { icon: '🌹', title: 'The Actual Start', text: 'June 13, 2022 — the day we actually truly became "us"' },
    { icon: '✨', title: 'The First Kiss', text: 'June 13, 2022 — the absolute cinema first kiss' },
    { icon: '💚', title: 'First "I Love You"', text: 'May 8, 5:37 AM — we were still up and we kept telling each other "I love you"' },
  ];

  const wishPopup = $('#wish-popup');
  const wishPopupClose = $('#wish-popup-close');
  const wishPopupIcon = $('#wish-popup-icon');
  const wishPopupTitle = $('#wish-popup-title');
  const wishPopupText = $('#wish-popup-text');

  $$('.wish-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.note, 10);
      openWishNote(idx);
    });
  });

  function openWishNote(idx) {
    const note = WISH_NOTES[idx];
    if (!note) return;

    wishPopupIcon.textContent = note.icon;
    wishPopupTitle.textContent = note.title;
    wishPopupText.textContent = '';

    wishPopup.classList.remove('hidden');

    typewriterEffect(wishPopupText, note.text);
  }

  function closeWishPopup() {
    wishPopup.classList.add('hidden');
    wishPopupText.textContent = '';
  }

  wishPopupClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeWishPopup();
  });

  wishPopup.addEventListener('click', (e) => {
    if (e.target === wishPopup) closeWishPopup();
  });

  function triggerSecretReveal() {
    closeWishPopup();

    $$('.wish-note').forEach(note => {
      note.style.animation = 'none';
      note.offsetHeight;
      note.style.animation = '';
    });
  }

  function typewriterEffect(element, text, speed = 25) {
    let i = 0;
    element.textContent = '';

    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    element.appendChild(cursor);

    function type() {
      if (i < text.length) {
        element.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(type, speed);
      } else {
        setTimeout(() => cursor.remove(), 1500);
      }
    }
    type();
  }

  // END
})();