import { Bitmask4x4 } from './tetromino.js';
// Playfield: handles board layout and state (for now, layout only)
export class Playfield {
  /**
   * @param {HTMLElement} rootEl - board container (e.g., div#playfield)
   * @param {{ cols?: number, rows?: number, cellSize?: number }} [opts]
   */
  constructor(rootEl, opts = {}) {
    if (!rootEl) throw new Error('Playfield: root element is required');
    this.rootEl = rootEl;
    this.cols = opts.cols ?? 12;
    this.rows = opts.rows ?? 24;
    this.cellSize = opts.cellSize; // optional: override CSS variable

  this.#applyCssVars();
  this.#renderGrid();

  // row bitmasks: each row is a number where bit x means occupied at column x
  this.rowState = new Array(this.rows).fill(0);
  }

  // Set CSS variables on the container
  #applyCssVars() {
    this.rootEl.style.setProperty('--cols', String(this.cols));
    this.rootEl.style.setProperty('--rows', String(this.rows));
    if (this.cellSize) {
      this.rootEl.style.setProperty('--cell-size', typeof this.cellSize === 'number' ? `${this.cellSize}px` : String(this.cellSize));
    }
  }

  // Generate DOM cells
  #renderGrid() {
    const frag = document.createDocumentFragment();
    const total = this.cols * this.rows;
    for (let i = 0; i < total; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Cell ${i + 1}`);
      frag.appendChild(cell);
    }
    this.rootEl.innerHTML = '';
    this.rootEl.appendChild(frag);
  }

  // Helpers
  #index(x, y) { return y * this.cols + x; }
  #inside(x, y) { return x >= 0 && x < this.cols && y < this.rows; }
  isOccupied(x, y) {
    if (y < 0 || y >= this.rows) return false;
    const rowMask = this.rowState[y];
    return ((rowMask >>> x) & 1) === 1;
  }
  setOccupied(x, y, occupied) {
    if (!this.#inside(x, y)) return;
    if (occupied) {
      this.rowState[y] |= (1 << x);
    } else {
      this.rowState[y] &= ~(1 << x);
    }
  }

  // Visual: render frozen cells from rowState; keeps them white, clears others
  renderFrozen() {
    const cells = this.rootEl.querySelectorAll('.cell');
    const total = this.cols * this.rows;
    for (let i = 0; i < total; i++) {
      const el = cells[i];
      if (!el) continue;
      el.className = 'cell';
    }
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (((this.rowState[y] >>> x) & 1) === 1) {
          const idx = this.#index(x, y);
          const el = cells[idx];
          if (el) el.classList.add('frozen');
        }
      }
    }
  }

  // Animate and remove completely filled lines; returns { count, rows }
  clearFullLinesAnimated(callbackAfter = null) {
    const fullMask = (this.cols >= 31) ? 0x7fffffff : ((1 << this.cols) - 1);
    const fullRows = [];
    for (let y = 0; y < this.rows; y++) {
      if (this.rowState[y] === fullMask) fullRows.push(y);
    }
    if (fullRows.length === 0) return { count: 0, rows: [] };

    // flash effect
    const cells = this.rootEl.querySelectorAll('.cell');
    for (const y of fullRows) {
      for (let x = 0; x < this.cols; x++) {
        const idx = this.#index(x, y);
        const el = cells[idx];
        if (el) el.classList.add('flash');
      }
    }

    // after short delay, actually remove the lines
    setTimeout(() => {
      const kept = [];
      for (let y = 0; y < this.rows; y++) {
        if (!fullRows.includes(y)) kept.push(this.rowState[y]);
      }
      const cleared = this.rows - kept.length;
      if (cleared > 0) {
        const newRows = new Array(cleared).fill(0).concat(kept);
        this.rowState = newRows;
        this.renderFrozen();
      }
      if (callbackAfter) callbackAfter({ count: fullRows.length, rows: fullRows.slice() });
    }, 220);

    return { count: fullRows.length, rows: fullRows };
  }

  // Reset the field to empty state and clear visuals
  reset() {
    this.rowState.fill(0);
    this.renderFrozen();
  }

  // Animate clearing all cells, then show overlay message "GAME OVER"
  animateClearAndShowGameOver() {
    const cells = this.rootEl.querySelectorAll('.cell');
    cells.forEach((el) => el.classList.add('fade-out'));
    setTimeout(() => {
      this.reset();
      this.showOverlayMessage('GAME OVER');
    }, 450);
  }

  showOverlayMessage(text) {
    const overlay = document.getElementById('overlay');
    const msg = document.getElementById('overlayMessage');
    if (!overlay || !msg) return;
    msg.textContent = text;
    overlay.classList.add('show');
  }

  hideOverlay() {
    const overlay = document.getElementById('overlay');
    const msg = document.getElementById('overlayMessage');
    if (!overlay || !msg) return;
    overlay.classList.remove('show');
    msg.textContent = '';
  }

  // Add a quick freeze animation on cells where the piece merged
  freezeAnimForPiece(piece) {
    const cells = this.rootEl.querySelectorAll('.cell');
    piece.cells().forEach(({ x, y }) => {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
      const idx = this.#index(x, y);
      const el = cells[idx];
      if (el) el.classList.add('freeze-anim');
    });
    // remove animation class after it runs
    setTimeout(() => {
      piece.cells().forEach(({ x, y }) => {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
        const idx = this.#index(x, y);
        const el = cells[idx];
        if (el) el.classList.remove('freeze-anim');
      });
    }, 600);
  }

  // Spawn floating score sprites near the center of cleared rows
  spawnFloatingScore(rowsCleared, points) {
    const overlay = document.getElementById('overlay');
    if (!overlay || rowsCleared.length === 0) return;
    const centerX = this.rootEl.getBoundingClientRect().left + this.rootEl.clientWidth / 2;
    rowsCleared.forEach((y, i) => {
      const fx = document.createElement('div');
      fx.className = 'fx-score';
      // sprite selection (placeholder colors via gradient); you can swap to sprite URLs
      const spriteUrl = i % 2 === 0 ?
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="gold"/><stop offset="70%" stop-color="orange"/><stop offset="100%" stop-color="red"/></radialGradient></defs><circle cx="32" cy="32" r="28" fill="url(%23g)"/><text x="32" y="40" font-size="20" font-family="Arial" text-anchor="middle" fill="white">+'+points+'</text></svg>'
        : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="aqua"/><stop offset="70%" stop-color="deepskyblue"/><stop offset="100%" stop-color="blue"/></radialGradient></defs><polygon points="32,4 60,32 32,60 4,32" fill="url(%23g)"/><text x="32" y="40" font-size="20" font-family="Arial" text-anchor="middle" fill="white">+'+points+'</text></svg>';
      fx.style.backgroundImage = `url("${spriteUrl}")`;
      const rowY = this.rootEl.getBoundingClientRect().top + (y + 0.5) * (this.rootEl.clientHeight / this.rows);
      fx.style.left = `${centerX}px`;
      fx.style.top = `${rowY}px`;
      overlay.appendChild(fx);
      setTimeout(() => fx.remove(), 800);
    });
  }

  // Collision check for a piece with optional offsets and rotation delta
  canPlace(piece, dx = 0, dy = 0, rotationDelta = 0) {
    const rotationIndex = (piece.rotation + rotationDelta + 4) % 4;
    const mask = piece.rotations[rotationIndex];
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        if ((mask >>> Bitmask4x4.bitIndex(row, column)) & 1) {
          const x = piece.x + column + dx;
          const y = piece.y + row + dy;
          // walls / floor
          if (x < 0 || x >= this.cols || y >= this.rows) return false;
          // allow above-the-top cells
          if (y < 0) continue;
          if (this.isOccupied(x, y)) return false;
        }
      }
    }
    return true;
  }

  // Merge current piece into frozen state
  mergePiece(piece) {
    piece.forEachCell((x, y) => {
      if (y >= 0 && x >= 0 && x < this.cols && y < this.rows) {
        this.setOccupied(x, y, true);
      }
    });
  }

  // Draw a live (moving) piece with its theme on top of frozen render
  drawLivePiece(piece) {
    const cells = this.rootEl.querySelectorAll('.cell');
    const theme = piece.theme || '';
    piece.cells().forEach(({ x, y }) => {
      if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return;
      const idx = this.#index(x, y);
      const el = cells[idx];
      if (el) {
        if (theme) el.classList.add(theme);
      }
    });
  }

  // Draw a ghost piece where the current piece would land on hard drop
  drawGhostPiece(piece) {
    // find maximal dy where piece can be placed
    let dy = 0;
    while (this.canPlace(piece, 0, dy + 1, 0)) dy++;
    if (dy < 0) return;
    const cells = this.rootEl.querySelectorAll('.cell');
    piece.cells().forEach(({ x, y }) => {
      const gy = y + dy;
      if (x < 0 || x >= this.cols || gy < 0 || gy >= this.rows) return;
      const idx = this.#index(x, gy);
      const el = cells[idx];
      if (el) el.classList.add('ghost');
    });
  }

  /**
   * Draw a tetromino on the playfield by applying a theme class to target cells.
   * This method doesn't check collisions or bounds; it's a visual helper.
   * @param {{ cells: () => Array<{x:number,y:number}>, theme?: string }} piece
   */
  drawPiece(piece) { this.drawLivePiece(piece); }
}
