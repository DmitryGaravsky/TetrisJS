import { Playfield } from './playfield.js';
import { Tetromino } from './tetromino.js';
import { Sound } from './sound.js';
import { HighScores } from './highscores.js';

// Entry point: initialize 12x24 playfield
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('playfield');
  // you can override sizes if needed: { cols: 12, rows: 24 }
  const pf = new Playfield(container, { cols: 12, rows: 24 });
  const sfx = new Sound();
  const highs = new HighScores({ containerSelector: '#highscoresList', max: 5 });
  let score = 0;
  let linesClearedTotal = 0;
  let level = 1;
  let paused = false;

  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const btnPause = document.getElementById('btnPause');
  const btnMute = document.getElementById('btnMute');
  const btnRestart = document.getElementById('btnRestart');
  const speedFill = document.getElementById('speedFill');
  const updateScore = (delta) => {
    if (delta) score += delta;
    if (scoreEl) scoreEl.textContent = String(score);
  };

  const updateLines = (delta) => {
    if (delta) linesClearedTotal += delta;
    if (linesEl) linesEl.textContent = String(linesClearedTotal);
  };

  const updateLevel = () => {
    // simple rule: new level each 10 lines; gravity speed increases
    const newLevel = Math.floor(linesClearedTotal / 10) + 1;
    if (newLevel !== level) {
      level = newLevel;
      if (levelEl) levelEl.textContent = String(level);
      resetGravity();
    } else {
      if (levelEl) levelEl.textContent = String(level);
    }
  };

  // spawn a piece at top-center
  let piece = Tetromino.random((pf.cols >> 1) - 2, -1);

  function redraw() {
    // first render frozen, then overlay live piece
    pf.renderFrozen();
  // ghost under live piece
  pf.drawGhostPiece(piece);
    pf.drawLivePiece(piece);
  }
  redraw();
  highs.render();

  function tryMove(dx, dy) {
    if (pf.canPlace(piece, dx, dy, 0)) {
      piece.move(dx, dy);
  if (dx !== 0) sfx.move();
      redraw();
      return true;
    }
    return false;
  }

  function tryRotate(delta) {
    if (pf.canPlace(piece, 0, 0, delta)) {
      if (delta === 1) piece.rotateCW(); else piece.rotateCCW();
  sfx.rotate();
      redraw();
      return true;
    }
    return false;
  }

  function lockAndSpawn() {
    // merge into field and spawn a new one
  pf.freezeAnimForPiece(piece);
    pf.mergePiece(piece);
    sfx.lock();
    // clear completed lines with animation and scoring
  const res = pf.clearFullLinesAnimated(({ count, rows }) => {
      if (count > 0) {
        // simple scoring: 100/300/500/800 for 1..4 lines
        const table = [0, 100, 300, 500, 800];
        const pts = table[count] || 0;
    updateScore(pts);
        updateLines(count);
        updateLevel();
        // floating score at actual cleared rows
        pf.spawnFloatingScore(rows, `+${pts}`);
        sfx.clear(count);
      }
  spawnNext();
    });
    if (res.count === 0) {
      // no lines cleared, spawn immediately
      spawnNext();
    }
  }

  function spawnNext() {
    redraw();
    piece = Tetromino.random((pf.cols >> 1) - 2, -1);
    // game over if we cannot place new piece at spawn
    if (!pf.canPlace(piece, 0, 0, 0)) {
      if (typeof gravityId !== 'undefined' && gravityId) clearInterval(gravityId);
  pf.animateClearAndShowGameOver();
      sfx.gameover();
      gameOver = true;
      // Save to highscores and render
      highs.add({ score, lines: linesClearedTotal, level });
      highs.render();
      return;
    }
    redraw();
  }

  function hardDrop() {
    // compute maximal drop without step-by-step redraw
    let dy = 0;
    while (pf.canPlace(piece, 0, dy + 1, 0)) dy++;
    if (dy > 0) piece.move(0, dy);
  sfx.drop();
    lockAndSpawn();
  }

  let gameOver = false;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      toggleMute();
      return;
    }
    if (gameOver) {
      if (e.key === 'Enter') {
        e.preventDefault();
        startNewGame();
      }
      return;
    }
    if (paused) return;
    switch (e.key) {
  case 'ArrowLeft':
  case 'a': case 'A':
        tryMove(-1, 0);
        break;
  case 'ArrowRight':
  case 'd': case 'D':
        tryMove(1, 0);
        break;
  case 'ArrowDown':
  case 's': case 'S':
        if (!tryMove(0, 1)) {
          // can't move down => lock
          lockAndSpawn();
        }
        break;
  case 'ArrowUp':
  case 'w': case 'W':
        tryRotate(1);
        break;
  case 'z': case 'Z':
  case 'q': case 'Q':
        tryRotate(-1);
        break;
      case ' ': // hard drop
      case 'Spacebar': // older browsers
        e.preventDefault();
        hardDrop();
        break;
      default:
        break;
    }
  });

  // gravity: drop one row each second
  function gravityIntervalMs() {
    // faster on higher levels; clamp to 120ms minimum
    const base = 1000; // ms
    const factor = Math.pow(0.85, level - 1);
    return Math.max(120, Math.floor(base * factor));
  }
  let gravityId = null;
  function resetGravity() {
    if (gravityId) clearInterval(gravityId);
    gravityId = setInterval(() => {
      if (!gameOver && !paused) {
        if (!tryMove(0, 1)) {
          lockAndSpawn();
        }
      }
    }, gravityIntervalMs());
    // update speed bar width: faster => fuller
    if (speedFill) {
      const ms = gravityIntervalMs();
      const pct = 100 - Math.min(100, ((ms - 120) / (1000 - 120)) * 100);
      speedFill.style.width = `${pct}%`;
    }
  }
  resetGravity();

  function startNewGame() {
    // reset state and restart gravity
    pf.reset();
  pf.hideOverlay();
    piece = Tetromino.random((pf.cols >> 1) - 2, -1);
    gameOver = false;
    score = 0; updateScore(0);
    linesClearedTotal = 0; updateLines(0);
    level = 1; updateLevel();
  paused = false; if (btnPause) { btnPause.setAttribute('aria-pressed', 'false'); btnPause.classList.remove('icon-play'); }
    redraw();
    resetGravity();
  }

  function togglePause() {
    paused = !paused;
    if (btnPause) btnPause.setAttribute('aria-pressed', paused ? 'true' : 'false');
  if (btnPause) btnPause.classList.toggle('icon-play', paused);
    if (paused) pf.showOverlayMessage('PAUSED'); else pf.hideOverlay();
  }
  function toggleMute() {
    sfx.toggleMute();
    if (btnMute) btnMute.setAttribute('aria-pressed', sfx.isMuted() ? 'true' : 'false');
  if (btnMute) btnMute.classList.toggle('icon-sound-off', sfx.isMuted());
  }

  if (btnPause) btnPause.addEventListener('click', togglePause);
  if (btnMute) btnMute.addEventListener('click', toggleMute);
  if (btnRestart) btnRestart.addEventListener('click', () => {
    if (gameOver) { startNewGame(); return; }
    // confirm-less restart during a game: just restart
    startNewGame();
  });

  // Touch controls: drag left/right to move, swipe down to hard drop, double-tap to rotate CW
  const wrapper = document.querySelector('.game-wrapper');
  if (wrapper) {
    let tStartX = 0, tStartY = 0, lastStepX = 0, moved = false;
    let lastTapTime = 0, lastTapX = 0, lastTapY = 0;
    const stepPx = 24; // pixels per horizontal cell move
    const swipeDownPx = 60; // threshold for hard drop
    const doubleTapMs = 300;

    function handleTouchStart(e) {
      if (paused || gameOver) return;
      const t = e.changedTouches[0];
      tStartX = t.clientX; tStartY = t.clientY;
      lastStepX = 0; moved = false;
      const now = performance.now();
      const dist = Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY);
      if (now - lastTapTime < doubleTapMs && dist < 20) {
        e.preventDefault();
        tryRotate(1);
        lastTapTime = 0; // consume
        return;
      }
      lastTapTime = now; lastTapX = t.clientX; lastTapY = t.clientY;
    }

    function handleTouchMove(e) {
      if (paused || gameOver) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - tStartX;
      const steps = Math.trunc(dx / stepPx);
      let delta = steps - lastStepX;
      if (delta !== 0) {
        e.preventDefault();
        moved = true;
        while (delta !== 0) {
          if (delta > 0) { if (!tryMove(1, 0)) break; lastStepX++; delta--; }
          else { if (!tryMove(-1, 0)) break; lastStepX--; delta++; }
        }
      }
    }

    function handleTouchEnd(e) {
      if (paused || gameOver) return;
      const t = e.changedTouches[0];
      const dy = t.clientY - tStartY;
      if (!moved && dy > swipeDownPx) {
        e.preventDefault();
        hardDrop();
      }
    }

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    wrapper.addEventListener('touchend', handleTouchEnd, { passive: false });
    wrapper.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }
});
