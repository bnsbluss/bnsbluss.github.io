(function () {
  const toggle = document.getElementById('afkAiToggle');
  const screen = document.getElementById('screen');
  if (!toggle || !screen) return;

  let mode = null;
  let gameStarted = false;
  let active = false;
  let timer = 0;
  let pressed = new Set();
  let turnKey = '';
  let turnUntil = 0;
  let nextTurnAt = 0;

  function sendKey(type, code) {
    const key = code === 'ArrowLeft' || code === 'ArrowRight' ? code : 'w';
    window.dispatchEvent(new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      code: code,
      key: key
    }));
  }

  function setKeys(next) {
    for (const code of pressed) {
      if (!next.has(code)) sendKey('keyup', code);
    }
    for (const code of next) {
      if (!pressed.has(code)) sendKey('keydown', code);
    }
    pressed = next;
  }

  function releaseKeys() {
    setKeys(new Set());
  }

  function stop() {
    if (!active) return;
    active = false;
    window.clearInterval(timer);
    timer = 0;
    releaseKeys();
    toggle.textContent = 'AI AFK: MATI';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.classList.remove('go');
  }

  function patrol() {
    if (!active) return;
    if (document.hidden) {
      releaseKeys();
      return;
    }

    const now = performance.now();
    if (now >= nextTurnAt) {
      turnKey = Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight';
      turnUntil = now + 350 + Math.random() * 350;
      nextTurnAt = now + 1800 + Math.random() * 1600;
    }

    const next = new Set(['KeyW']);
    if (now < turnUntil) next.add(turnKey);
    setKeys(next);
  }

  function start() {
    if (active || !gameStarted || !mode) return;
    active = true;
    nextTurnAt = 0;
    toggle.textContent = 'AI AFK: NYALA';
    toggle.setAttribute('aria-pressed', 'true');
    toggle.classList.add('go');
    timer = window.setInterval(patrol, 80);
    patrol();
  }

  function selectMode(nextMode) {
    mode = nextMode;
    gameStarted = false;
    stop();
    toggle.hidden = true;
  }

  function showToggle() {
    toggle.hidden = !(gameStarted && mode);
  }

  document.getElementById('mSolo').addEventListener('click', function () {
    selectMode('solo');
  });
  document.getElementById('mDef').addEventListener('click', function () {
    selectMode('defense');
  });

  for (const id of ['mCoop', 'mPvp', 'mBr', 'sBack', 'bCreate']) {
    const button = document.getElementById(id);
    if (button) {
      button.addEventListener('click', function () {
        selectMode(null);
      });
    }
  }

  const startButton = document.getElementById('sGo');
  if (startButton) {
    startButton.addEventListener('click', function () {
      if (!mode) return;
      gameStarted = true;
      window.setTimeout(showToggle, 0);
    });
  }

  const tabs = document.getElementById('tabs');
  if (tabs) {
    tabs.addEventListener('click', function () {
      selectMode(null);
    });
  }

  toggle.addEventListener('click', function () {
    if (active) stop();
    else start();
  });

  function stopForManualInput(event) {
    if (!active || !event.isTrusted) return;
    if (event.type === 'keydown') {
      if (toggle.contains(event.target) && (event.code === 'Enter' || event.code === 'Space')) return;
      stop();
      return;
    }
    if (toggle.contains(event.target)) return;
    if (event.target === screen || (event.target.closest && event.target.closest('#touch'))) {
      stop();
    }
  }

  document.addEventListener('keydown', stopForManualInput, true);
  document.addEventListener('pointerdown', stopForManualInput, true);
  document.addEventListener('touchstart', stopForManualInput, true);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) releaseKeys();
  });
  window.addEventListener('pagehide', stop);
})();
