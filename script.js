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
  let decryptionKey = '';
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
  let decryptedPrizeUrls = [];

  function decryptAllImages(key) {
    decryptedUrls.forEach(url => URL.revokeObjectURL(url));
    decryptedUrls = [];
    decryptedPrizeUrls.forEach(url => URL.revokeObjectURL(url));
    decryptedPrizeUrls = [];

    const promises = [];
    const cards = $$('.scratch-card');

    // Decrypt scratch card memory images
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
            decryptedUrls[i - 1] = url;

            const card = cards[i - 1];
            if (card) {
              const img = card.querySelector('img');
              if (img) img.src = url;
            }
          })
      );
    }

    // Decrypt fishing prize images
    for (let i = 1; i <= 9; i++) {
      promises.push(
        fetch(`images/prizes/prize_${i}.bin`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to load encrypted prize ${i}`);
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
            decryptedPrizeUrls[i] = url;
          })
          .catch(err => {
            console.warn(`Failed to decrypt prize ${i}, using fallback`, err);
            decryptedPrizeUrls[i] = createFallbackPrizeImage(i);
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
        const b3 = view[3] ^ keyBytes[3 % keyBytes.length];
        const b4 = view[4] ^ keyBytes[4 % keyBytes.length];
        const b5 = view[5] ^ keyBytes[5 % keyBytes.length];

        if (b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF && b3 === 0xE0 && b4 === 0x00 && b5 === 0x10) {
          lockError.textContent = "Unlocking surprise... 💚";
          lockShackle.classList.add('unlocked');
          launchFireworks(6);

          decryptionKey = entered;
          sessionStorage.setItem('decryption_key', entered);

          decryptAllImages(entered)
            .then(() => {
              loadCaughtPrizes();
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

  // (Session initialization moved to the bottom of the script to avoid race conditions with DOM creation)

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

      card.addEventListener('click', () => {
        if (state.revealed && img.src && img.src.indexOf('data:image/gif') === -1) {
          openImagePreview(img.src);
        }
      });

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

    if (type === 'fishing') {
      modalOverlay.classList.add('fishing-open');
      resetFishingLobby();
      showFishingPage('game');
      loadCaughtPrizes();
      startFishingGameLoop(); // Start drawing the idle state immediately
    }

    modalOverlay.classList.remove('hidden');
    requestAnimationFrame(() => {
      modalOverlay.classList.add('visible');
    });

    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('visible');
    modalOverlay.classList.remove('fishing-open');

    if (fishingGameLoopId) {
      cancelAnimationFrame(fishingGameLoopId);
      fishingGameLoopId = null;
    }

    // Hide reveal overlay in case it was left open
    const reveal = $('#fishing-reveal-overlay');
    if (reveal) reveal.classList.add('hidden');

    showFishingPage('game');

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
          compatMessage.textContent = 'Made for each other. Always and forever! 😍';
          launchConfetti(80);
          spawnFloatingHearts();
        } else {
          compatPercentage.classList.add('nope');
          compatMessage.textContent = "Who is that? 🔪";
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
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = btn.classList.contains('expanded');

      if (!isExpanded) {
        // Collapse all other notes
        $$('.wish-note').forEach(n => n.classList.remove('expanded'));
        // Expand this note
        btn.classList.add('expanded');
      } else {
        const idx = parseInt(btn.dataset.note, 10);
        openWishNote(idx);
        btn.classList.remove('expanded');
      }
    });
  });

  // Collapse notes when tapping outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.wish-note')) {
      $$('.wish-note').forEach(btn => btn.classList.remove('expanded'));
    }
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

  // STARDEW FISHING MINIGAME LOGIC
  let caughtPrizes = [];
  let fishingGameLoopId = null;
  let fishingProgress = 30;

  // Game states: 'idle', 'casting', 'waiting', 'bite', 'fishing'
  let fishingState = 'idle';
  let castPower = 0;
  let castDirection = 1;
  let castQuality = '';
  let waitingTimer = 0;
  let initialWaitingTimer = 120;
  let biteTimer = 0;

  // Animation constants for middle column lake canvas (scaled to 300x300)
  const ROD_TIP_X = 182;
  const ROD_TIP_Y = 105;
  const WATER_LEVEL_Y = 225;

  let currentBobberX = 55;
  let currentBobberY = WATER_LEVEL_Y;
  let splashRadius = 0;

  let fishY = 150;
  let fishTargetY = 150;
  let fishVelocity = 0;
  let fishSpeed = 0.02; // Slower fish speed

  let barY = 210;
  let barVelocity = 0;
  const barHeight = 80; // Larger green bar height
  const maxBarY = 300 - barHeight; // 220
  let isPressing = false;

  const btnStartFishing = $('#btn-start-fishing');
  const fishingCanvas = $('#fishing-canvas');
  const lakeAnimCanvas = $('#lake-anim-canvas');

  const fishingGallery = $('#fishing-gallery');
  const fishingRevealOverlay = $('#fishing-reveal-overlay');
  const btnRevealClose = $('#btn-reveal-close');
  const fishingRevealPrizeImg = $('#fishing-reveal-prize-img');
  const fishingRevealText = $('#fishing-reveal-text');

  // DOM references
  const btnBackpack = $('#btn-backpack');
  const fishingHudText = $('#fishing-hud-text');
  const fishingPowerWrap = $('#fishing-power-wrap');
  const fishingPowerBar = $('#fishing-power-bar');
  const imagePreviewOverlay = $('#image-preview-overlay');
  const imagePreviewImg = $('#image-preview-img');
  const btnPreviewClose = $('#btn-preview-close');

  function createFallbackPrizeImage(index) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 300, 300);
    grad.addColorStop(0, '#fbcfe8');
    grad.addColorStop(1, '#db2777');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 300, 300);

    // Heart decoration
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '120px "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💖', 150, 150);

    // Label text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Playfair Display", serif';
    ctx.fillText('Prize Card ' + index, 150, 130);
    ctx.font = '14px Inter';
    ctx.fillText('(Bin file placeholder)', 150, 170);

    return canvas.toDataURL('image/jpeg');
  }

  function loadCaughtPrizes() {
    try {
      caughtPrizes = JSON.parse(localStorage.getItem('caught_prizes') || '[]');
    } catch (e) {
      caughtPrizes = [];
    }

    const slots = $$('.fishing-slot');
    slots.forEach(slot => {
      const idx = parseInt(slot.dataset.index, 10);
      const inner = slot.querySelector('.slot-inner');
      let img = slot.querySelector('img');

      if (caughtPrizes.includes(idx)) {
        slot.classList.add('caught');
        if (inner) inner.style.display = 'none';
        if (!img) {
          img = document.createElement('img');
          slot.appendChild(img);
        }
        img.alt = `Prize ${idx}`;
        img.src = decryptedPrizeUrls[idx] || createFallbackPrizeImage(idx);
      } else {
        slot.classList.remove('caught');
        if (inner) inner.style.display = 'block';
        if (img) img.remove();
      }
    });

    $('#fishing-counter-val').textContent = `${caughtPrizes.length}/9`;
  }

  function updateFishingButtonText() {
    if (!btnStartFishing) return;
    if (fishingState === 'idle') {
      btnStartFishing.textContent = 'HOLD TO CAST';
      btnStartFishing.disabled = false;
    } else if (fishingState === 'casting') {
      btnStartFishing.textContent = 'RELEASE!';
      btnStartFishing.disabled = false;
    } else if (fishingState === 'waiting') {
      btnStartFishing.textContent = 'WAITING...';
      btnStartFishing.disabled = true;
    } else if (fishingState === 'bite') {
      btnStartFishing.textContent = 'TAP TO HOOK!';
      btnStartFishing.disabled = false;
    } else if (fishingState === 'fishing') {
      btnStartFishing.textContent = 'HOLD TO REEL';
      btnStartFishing.disabled = false;
    }
  }

  function handleFishingPressStart(e) {
    e.preventDefault();
    // Only register press if the caught reveal overlay is hidden
    if (fishingRevealOverlay && !fishingRevealOverlay.classList.contains('hidden')) return;

    if (fishingState === 'idle') {
      fishingState = 'casting';
      castPower = 0;
      castDirection = 1;
      isPressing = false;
      updateFishingButtonText();

      if (fishingHudText) {
        fishingHudText.textContent = 'Charging cast power...';
      }
      if (fishingPowerBar) {
        fishingPowerBar.style.width = '0%';
      }

      const banner = $('#fishing-noti-banner');
      if (banner) banner.textContent = 'Charging cast power...';
      if (!fishingGameLoopId) startFishingGameLoop();
    } else if (fishingState === 'bite') {
      fishingState = 'fishing';
      fishingProgress = 30;
      isPressing = true;
      
      // Choose a target and speed immediately to start the fish moving
      fishTargetY = 20 + Math.random() * 260;
      fishSpeed = 0.02 + Math.random() * 0.03;
      
      updateFishingButtonText();
      if (fishingHudText) {
        fishingHudText.textContent = "Reeling... keep fish in the bar!";
      }
      const banner = $('#fishing-noti-banner');
      if (banner) banner.textContent = 'Hooked! Keep the fish in the green bar!';
    } else if (fishingState === 'fishing') {
      isPressing = true;
    }
  }

  function handleFishingPressEnd(e) {
    if (fishingRevealOverlay && !fishingRevealOverlay.classList.contains('hidden')) return;

    if (fishingState === 'casting') {
      fishingState = 'waiting';
      initialWaitingTimer = 120 + Math.floor(Math.random() * 300); // 2 to 7 seconds at 60fps
      waitingTimer = initialWaitingTimer;
      splashRadius = 0;

      if (castPower >= 85) {
        castQuality = 'PERFECT CAST! 🌟';
      } else if (castPower >= 60) {
        castQuality = 'GOOD CAST! 👍';
      } else {
        castQuality = 'COOL CAST! 🙂';
      }

      if (fishingHudText) {
        fishingHudText.textContent = 'Cast thrown! Waiting for a bite...';
      }

      const banner = $('#fishing-noti-banner');
      if (banner) banner.textContent = `${castQuality} Waiting for a bite...`;
      updateFishingButtonText();
    } else if (fishingState === 'fishing') {
      isPressing = false;
    }
  }

  if (btnStartFishing) {
    btnStartFishing.addEventListener('mousedown', handleFishingPressStart);
    btnStartFishing.addEventListener('touchstart', handleFishingPressStart, { passive: false });
  }
  if (fishingCanvas) {
    fishingCanvas.addEventListener('mousedown', handleFishingPressStart);
    fishingCanvas.addEventListener('touchstart', handleFishingPressStart, { passive: false });
  }

  document.addEventListener('mouseup', handleFishingPressEnd);
  document.addEventListener('touchend', handleFishingPressEnd);

  if (btnRevealClose) {
    btnRevealClose.addEventListener('click', () => {
      if (fishingRevealOverlay) fishingRevealOverlay.classList.add('hidden');
      resetFishingLobby();
      loadCaughtPrizes();
      startFishingGameLoop(); // Resume rendering loop
    });
  }

  // Dual-page view toggle
  function showFishingPage(page) {
    const gameView = $('#fishing-game-view');
    const inventoryView = $('#fishing-inventory-view');
    if (!gameView || !inventoryView) return;

    if (page === 'game') {
      gameView.classList.remove('hidden');
      inventoryView.classList.add('hidden');
      if (btnBackpack) btnBackpack.textContent = '🎒';
      if (fishingState === 'idle') {
        startFishingGameLoop(); // Resume bobber float loop
      }
    } else if (page === 'inventory') {
      gameView.classList.add('hidden');
      inventoryView.classList.remove('hidden');
      if (btnBackpack) btnBackpack.textContent = '🎣';
      resetFishingLobby(); // Reset fishing state when opening inventory to prevent bugs
      loadCaughtPrizes();
    }
  }

  if (btnBackpack) {
    btnBackpack.addEventListener('click', (e) => {
      e.stopPropagation();
      const inventoryView = $('#fishing-inventory-view');
      if (inventoryView && inventoryView.classList.contains('hidden')) {
        showFishingPage('inventory');
      } else {
        showFishingPage('game');
      }
    });
  }

  const btnBackToLake = $('#btn-back-to-lake');
  if (btnBackToLake) {
    btnBackToLake.addEventListener('click', () => {
      showFishingPage('game');
    });
  }

  // Slot clicks for preview
  $$('.fishing-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const idx = parseInt(slot.dataset.index, 10);
      if (caughtPrizes.includes(idx)) {
        const img = slot.querySelector('img');
        if (img && img.src) {
          openImagePreview(img.src);
        }
      }
    });
  });

  function openImagePreview(src) {
    if (!imagePreviewOverlay || !imagePreviewImg) return;
    imagePreviewImg.src = src;
    imagePreviewOverlay.classList.remove('hidden');
  }

  function closeImagePreview() {
    if (!imagePreviewOverlay) return;
    imagePreviewOverlay.classList.add('hidden');
    if (imagePreviewImg) imagePreviewImg.src = '';
  }

  if (btnPreviewClose) {
    btnPreviewClose.addEventListener('click', closeImagePreview);
  }
  if (imagePreviewOverlay) {
    imagePreviewOverlay.addEventListener('click', (e) => {
      if (e.target === imagePreviewOverlay) closeImagePreview();
    });
  }

  function resetFishingLobby() {
    fishingState = 'idle';
    isPressing = false;
    castPower = 0;
    updateFishingButtonText();

    if (fishingHudText) {
      fishingHudText.textContent = 'Hold the cast button to throw line!';
    }
    if (fishingPowerBar) {
      fishingPowerBar.style.width = '0%';
    }

    const banner = $('#fishing-noti-banner');
    if (banner) banner.textContent = 'Hold the cast button to throw line!';
    if (fishingGameLoopId) {
      cancelAnimationFrame(fishingGameLoopId);
      fishingGameLoopId = null;
    }
  }

  const fCtx = fishingCanvas ? fishingCanvas.getContext('2d') : null;
  const laCtx = lakeAnimCanvas ? lakeAnimCanvas.getContext('2d') : null;

  function startFishingGameLoop() {
    if (fishingGameLoopId) cancelAnimationFrame(fishingGameLoopId);

    function loop() {
      updateFishingPhysics();
      drawFishingCanvas();
      drawLakeAnimation();

      if (fishingState === 'fishing' && fishingProgress >= 100) {
        onFishCaught();
      } else if (fishingState === 'fishing' && fishingProgress <= 0) {
        onFishEscaped();
      } else {
        fishingGameLoopId = requestAnimationFrame(loop);
      }
    }

    fishingGameLoopId = requestAnimationFrame(loop);
  }

  function updateFishingPhysics() {
    if (fishingState === 'casting') {
      castPower += castDirection * 1.5;
      if (castPower >= 100) {
        castPower = 100;
        castDirection = -1;
      } else if (castPower <= 0) {
        castPower = 0;
        castDirection = 1;
      }
      if (fishingPowerBar) {
        fishingPowerBar.style.width = castPower + '%';
      }
    } else if (fishingState === 'waiting') {
      waitingTimer -= 1;
      if (waitingTimer <= 0) {
        fishingState = 'bite';
        biteTimer = 90; // 1.5s
        updateFishingButtonText();
        if (fishingHudText) {
          fishingHudText.textContent = 'BITE! TAP TO HOOK! ❗';
        }
        const banner = $('#fishing-noti-banner');
        if (banner) banner.textContent = 'BITE! Tap the screen/button to hook!';
      }
    } else if (fishingState === 'bite') {
      biteTimer -= 1;
      if (biteTimer <= 0) {
        onFishEscaped();
      }
    } else if (fishingState === 'fishing') {
      // 1. Erratic fish movements (Slower target choosing)
      if (Math.random() < 0.012) {
        fishTargetY = 20 + Math.random() * 260;
        const rand = Math.random();
        if (rand < 0.2) {
          fishSpeed = 0.05; // Slower darting
        } else if (rand < 0.5) {
          fishSpeed = 0.01; // Slower floating
        } else {
          fishSpeed = 0.02; // Slower standard
        }
      }

      fishY += (fishTargetY - fishY) * fishSpeed;
      if (fishY < 20) fishY = 20;
      if (fishY > 280) fishY = 280;

      // 2. Bar physics
      if (isPressing) {
        barVelocity -= 0.45;
      } else {
        barVelocity += 0.22;
      }

      barVelocity *= 0.96;
      barY += barVelocity;

      if (barY > maxBarY) {
        barY = maxBarY;
        barVelocity = -barVelocity * 0.28;
      }
      if (barY < 10) {
        barY = 10;
        barVelocity = 0;
      }

      const fishInside = (fishY >= barY && fishY <= barY + barHeight);
      if (fishInside) {
        fishingProgress += 0.35;
      } else {
        fishingProgress -= 0.25;
      }

      if (fishingProgress < 0) fishingProgress = 0;
      if (fishingProgress > 100) fishingProgress = 100;
    }
  }

  function drawFishingCanvas() {
    if (!fCtx) return;
    fCtx.clearRect(0, 0, fishingCanvas.width, fishingCanvas.height);

    // Draw background track
    fCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    fCtx.fillRect(10, 10, 30, 290);
    fCtx.strokeStyle = 'rgba(26, 58, 42, 0.15)';
    fCtx.lineWidth = 1;
    fCtx.strokeRect(10, 10, 30, 290);

    if (fishingState === 'fishing') {
      const barGrad = fCtx.createLinearGradient(10, barY, 40, barY);
      barGrad.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
      barGrad.addColorStop(0.5, 'rgba(74, 222, 128, 0.65)');
      barGrad.addColorStop(1, 'rgba(34, 197, 94, 0.45)');
      fCtx.fillStyle = barGrad;

      fCtx.beginPath();
      if (fCtx.roundRect) {
        fCtx.roundRect(10, barY, 30, barHeight, 6);
      } else {
        fCtx.rect(10, barY, 30, barHeight);
      }
      fCtx.fill();
      fCtx.strokeStyle = '#16a34a';
      fCtx.lineWidth = 2;
      fCtx.stroke();

      fCtx.font = '24px sans-serif';
      fCtx.textAlign = 'center';
      fCtx.textBaseline = 'middle';
      fCtx.fillText('🐟', 25, fishY);

      fCtx.fillStyle = 'rgba(26, 58, 42, 0.08)';
      fCtx.beginPath();
      if (fCtx.roundRect) {
        fCtx.roundRect(50, 10, 10, 290, 3);
      } else {
        fCtx.rect(50, 10, 10, 290);
      }
      fCtx.fill();

      const fillHeight = (fishingProgress / 100) * 290;
      const fillY = 300 - fillHeight;
      if (fillHeight > 0) {
        const progressGrad = fCtx.createLinearGradient(50, fillY, 60, fillY);
        progressGrad.addColorStop(0, '#f59e0b');
        progressGrad.addColorStop(0.5, '#22c55e');
        progressGrad.addColorStop(1, '#16a34a');
        fCtx.fillStyle = progressGrad;
        fCtx.beginPath();
        if (fCtx.roundRect) {
          fCtx.roundRect(50, fillY, 10, fillHeight, 3);
        } else {
          fCtx.rect(50, fillY, 10, fillHeight);
        }
        fCtx.fill();
      }
    }
  }

  function drawLakeAnimation() {
    if (!laCtx) return;
    laCtx.clearRect(0, 0, lakeAnimCanvas.width, lakeAnimCanvas.height);

    let targetX = 55;
    if (fishingState === 'waiting' || fishingState === 'bite' || fishingState === 'fishing') {
      targetX = 150 - (castPower / 100) * 106;
    }

    // Bobber physics update
    if (fishingState === 'idle') {
      currentBobberX = 55;
      currentBobberY = WATER_LEVEL_Y + Math.sin(Date.now() / 250) * 2;
    } else if (fishingState === 'casting') {
      currentBobberX = ROD_TIP_X;
      currentBobberY = ROD_TIP_Y;
    } else if (fishingState === 'waiting') {
      const elapsedWaiting = initialWaitingTimer - waitingTimer;
      const t = elapsedWaiting / 40; // Progress from 0 to 1 over first 40 frames
      if (t < 1.0) {
        // Flying arc animation
        currentBobberX = ROD_TIP_X + (targetX - ROD_TIP_X) * t;
        const arcY = Math.sin(t * Math.PI) * 70; // arc height
        currentBobberY = ROD_TIP_Y + (WATER_LEVEL_Y - ROD_TIP_Y) * t - arcY;
      } else {
        // Plop in water! Draw splash circles
        currentBobberX = targetX;
        currentBobberY = WATER_LEVEL_Y + Math.sin(Date.now() / 150) * 1.5;
        splashRadius += 0.8;
      }
    } else if (fishingState === 'bite') {
      currentBobberX = targetX;
      currentBobberY = WATER_LEVEL_Y + Math.sin(Date.now() / 150) * 2;
    } else if (fishingState === 'fishing') {
      currentBobberX = targetX;
      currentBobberY = WATER_LEVEL_Y + Math.sin(Date.now() / 150) * 2;
      if (isPressing) {
        // Shake it slightly when pulling line
        currentBobberX += (Math.random() - 0.5) * 2;
      }
    }

    // Draw the Fishing Line (rod tip to bobber)
    if (fishingState !== 'casting') {
      laCtx.beginPath();
      laCtx.moveTo(ROD_TIP_X, ROD_TIP_Y);

      const elapsedWaiting = initialWaitingTimer - waitingTimer;
      if (fishingState === 'waiting' && (elapsedWaiting / 40) < 1.0) {
        // Curved line while flying
        const t = elapsedWaiting / 40;
        const midX = (ROD_TIP_X + currentBobberX) / 2;
        const midY = (ROD_TIP_Y + currentBobberY) / 2 - 15;
        laCtx.quadraticCurveTo(midX, midY, currentBobberX, currentBobberY);
      } else {
        // Straight line
        laCtx.lineTo(currentBobberX, currentBobberY);
      }

      laCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      laCtx.lineWidth = 1;
      laCtx.stroke();
    }

    // Draw Splash circles if landing
    const elapsedWaiting = initialWaitingTimer - waitingTimer;
    if (fishingState === 'waiting' && (elapsedWaiting / 40) >= 1.0 && splashRadius < 35) {
      laCtx.beginPath();
      laCtx.ellipse(currentBobberX, WATER_LEVEL_Y + 5, splashRadius, splashRadius * 0.4, 0, 0, Math.PI * 2);
      laCtx.strokeStyle = `rgba(255, 255, 255, ${1 - splashRadius / 35})`;
      laCtx.lineWidth = 1.5;
      laCtx.stroke();
    }

    // Draw Exclamation Mark and concentric splash rings during bite
    if (fishingState === 'bite') {
      // Draw exclamation mark above currentBobberX, currentBobberY - 15
      laCtx.fillStyle = '#ef4444';
      laCtx.font = 'bold 24px "Segoe UI", sans-serif';
      laCtx.textAlign = 'center';
      laCtx.textBaseline = 'bottom';
      laCtx.fillText('!', currentBobberX, currentBobberY - 15);

      // Draw concentric red/white splash rings to indicate bite
      const biteRippleRadius = (Date.now() / 4) % 40;
      laCtx.beginPath();
      laCtx.ellipse(currentBobberX, WATER_LEVEL_Y + 5, biteRippleRadius, biteRippleRadius * 0.4, 0, 0, Math.PI * 2);
      laCtx.strokeStyle = `rgba(239, 68, 68, ${1 - biteRippleRadius / 40})`;
      laCtx.lineWidth = 1.5;
      laCtx.stroke();
    }

    // Draw Bobber (Red/White float)
    if (fishingState !== 'casting') {
      // Red top half
      laCtx.beginPath();
      laCtx.arc(currentBobberX, currentBobberY, 6, Math.PI, 0);
      laCtx.fillStyle = '#ef4444';
      laCtx.fill();

      // White bottom half
      laCtx.beginPath();
      laCtx.arc(currentBobberX, currentBobberY, 6, 0, Math.PI);
      laCtx.fillStyle = '#ffffff';
      laCtx.fill();

      // Black center divider line
      laCtx.beginPath();
      laCtx.moveTo(currentBobberX - 6, currentBobberY);
      laCtx.lineTo(currentBobberX + 6, currentBobberY);
      laCtx.strokeStyle = '#000000';
      laCtx.lineWidth = 0.8;
      laCtx.stroke();
    }
  }

  function onFishCaught() {
    if (fishingGameLoopId) cancelAnimationFrame(fishingGameLoopId);

    const prizeIdx = Math.floor(Math.random() * 9) + 1;

    if (fishingRevealOverlay) fishingRevealOverlay.classList.remove('hidden');

    fishingRevealPrizeImg.src = decryptedPrizeUrls[prizeIdx] || createFallbackPrizeImage(prizeIdx);

    let originallyFull = caughtPrizes.length >= 9;
    if (!caughtPrizes.includes(prizeIdx)) {
      caughtPrizes.push(prizeIdx);
      caughtPrizes.sort((a, b) => a - b);
      localStorage.setItem('caught_prizes', JSON.stringify(caughtPrizes));
    }

    const currentCount = caughtPrizes.length;

    launchFireworks(3);
    launchConfetti(50);

    if (currentCount >= 9 && !originallyFull) {
      fishingRevealText.textContent = `FINALLY! You caught Card #${prizeIdx}! You collected all 9 secret cards! 💚🎉`;
      setTimeout(() => {
        launchFireworks(8);
        launchConfetti(120);
        spawnFloatingHearts();
      }, 500);
    } else if (currentCount >= 9) {
      fishingRevealText.textContent = `Haha! You caught Card #${prizeIdx} again! (Total collected: 9/9)`;
    } else {
      fishingRevealText.textContent = `Wow so pro! You caught Card #${prizeIdx}! (${currentCount}/9 collected)`;
    }

    const banner = $('#fishing-noti-banner');
    if (banner) banner.textContent = `Caught Card #${prizeIdx}!`;
  }

  function onFishEscaped() {
    if (fishingGameLoopId) cancelAnimationFrame(fishingGameLoopId);

    const banner = $('#fishing-noti-banner');
    if (banner) banner.textContent = "The fish got away! 😭 Try casting again.";

    if (fishingHudText) {
      fishingHudText.textContent = "The fish got away! 😭 Try casting again.";
    }

    fishingState = 'idle';
    isPressing = false;
    updateFishingButtonText();

    setTimeout(() => {
      if (fishingState === 'idle') {
        if (fishingHudText) {
          fishingHudText.textContent = 'Hold the cast button to throw line!';
        }
        const banner = $('#fishing-noti-banner');
        if (banner) banner.textContent = 'Hold the cast button to throw line!';
        startFishingGameLoop(); // Resume bobber float draw loop
      }
    }, 1500);
  }

  // Initialize lock or load from session at the bottom to ensure DOM elements (scratch cards, etc.) are ready
  const sessionKey = sessionStorage.getItem('decryption_key');
  if (sessionKey) {
    decryptionKey = sessionKey;
    decryptAllImages(sessionKey).then(() => {
      loadCaughtPrizes();
    });
    lockSection.classList.add('hidden');
    mainContent.classList.remove('hidden');
    mainContent.classList.add('visible');
    startTimer();
    spawnFloatingHearts();
  } else {
    initLock();
  }

  // END
})();
