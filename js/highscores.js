export class HighScores {
  constructor({ storageKey = 'tetris.highscores', max = 5, containerSelector = '#highscoresList' } = {}) {
    this.storageKey = storageKey;
    this.max = max;
    this.containerSelector = containerSelector;
    this.container = null;
    // lazily bind container on first render to ensure DOM exists
  }

  _ensureContainer() {
    if (!this.container) {
      this.container = document.querySelector(this.containerSelector);
      if (this.container && !this._delegated) {
        this.container.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-action="delete-score"]');
          if (btn) {
            const id = btn.getAttribute('data-id');
            if (id) {
              this.delete(id);
              this.render();
            }
          }
        });
        this._delegated = true;
      }
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  }

  save(list) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch {
      // ignore quota errors
    }
  }

  getTop() {
    const list = this.load();
    list.sort((a, b) => (b.score || 0) - (a.score || 0));
    return list.slice(0, this.max);
  }

  add({ score, lines = 0, level = 1, timestamp = Date.now() }) {
    const id = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = { id, score: Number(score) || 0, lines: Number(lines) || 0, level: Number(level) || 1, timestamp };
    const list = this.load();
    list.push(entry);
    list.sort((a, b) => (b.score || 0) - (a.score || 0));
    const trimmed = list.slice(0, this.max);
    this.save(trimmed);
    return entry;
  }

  delete(id) {
    const list = this.load();
    const next = list.filter((e) => e.id !== id);
    this.save(next);
  }

  _formatDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  render() {
    this._ensureContainer();
    if (!this.container) return;
    const top = this.getTop();
    if (top.length === 0) {
      this.container.innerHTML = '<div class="score-empty">No scores yet</div>';
      return;
    }
    const rows = top.map((e) => {
      const date = this._formatDate(e.timestamp);
      const score = Number(e.score) || 0;
      const details = `${date}${e.lines ? ` • ${e.lines} lines` : ''}`;
      return `
        <div class="score-row" role="listitem" data-id="${e.id}">
          <div class="meta">
            <div class="score">${score}</div>
            <div class="sub">${details}</div>
          </div>
          <button type="button" class="icon-btn small icon-trash" title="Delete" data-action="delete-score" data-id="${e.id}"></button>
        </div>
      `;
    });
    this.container.innerHTML = rows.join('');
  }
}
