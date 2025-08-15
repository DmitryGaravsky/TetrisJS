// Tetromino: 4x4 bitmask-based piece with 4 rotations and movement API

const THEME_BY_TYPE = {
  I: 'theme-cyan',
  J: 'theme-blue',
  L: 'theme-orange',
  O: 'theme-yellow',
  S: 'theme-green',
  T: 'theme-purple',
  Z: 'theme-red',
};

// Base 4x4 grids; '1' means filled cell
const BASE_GRIDS = {
  I: [
    '0000',
    '1111',
    '0000',
    '0000',
  ],
  O: [
    '0000',
    '0110',
    '0110',
    '0000',
  ],
  T: [
    '0000',
    '0100',
    '1110',
    '0000',
  ],
  S: [
    '0000',
    '0110',
    '1100',
    '0000',
  ],
  Z: [
    '0000',
    '1100',
    '0110',
    '0000',
  ],
  J: [
    '0000',
    '1000',
    '1110',
    '0000',
  ],
  L: [
    '0000',
    '0010',
    '1110',
    '0000',
  ],
};

function bitIndex(row, column) {
  return 15 - (row * 4 + column);
}

function gridToMask(lines) {
  let mask = 0;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      if (lines[row][column] === '1') {
        mask |= (1 << bitIndex(row, column));
      }
    }
  }
  return mask >>> 0; // ensure unsigned
}

function rotateMaskCW(mask) {
  let out = 0;
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      const srcBit = (mask >>> bitIndex(row, column)) & 1;
      if (srcBit) {
        const rotatedRow = column;           // rotated row
        const rotatedColumn = 3 - row;       // rotated column
        out |= (1 << bitIndex(rotatedRow, rotatedColumn));
      }
    }
  }
  return out >>> 0;
}

function buildRotationsFromGrid(gridLines) {
  const r0 = gridToMask(gridLines);
  const r1 = rotateMaskCW(r0);
  const r2 = rotateMaskCW(r1);
  const r3 = rotateMaskCW(r2);
  return [r0, r1, r2, r3];
}

const ROTATIONS = Object.fromEntries(
  Object.entries(BASE_GRIDS).map(([k, v]) => [k, buildRotationsFromGrid(v)])
);

export class Tetromino {
  /**
   * @param {keyof typeof ROTATIONS} type
   * @param {{x?: number, y?: number, rotation?: number}} [opts]
   */
  constructor(type, opts = {}) {
    if (!ROTATIONS[type]) throw new Error(`Unknown tetromino type: ${type}`);
    this.type = type;
    this.rotations = ROTATIONS[type]; // number[4]
    this.rotation = opts.rotation ? (opts.rotation % 4 + 4) % 4 : 0;
    this.x = opts.x ?? 0; // left column on playfield
    this.y = opts.y ?? 0; // top row on playfield
    this.theme = THEME_BY_TYPE[type];
  }

  get mask() {
    return this.rotations[this.rotation];
  }

  rotateCW() {
    this.rotation = (this.rotation + 1) % 4;
    return this;
  }

  rotateCCW() {
    this.rotation = (this.rotation + 3) % 4;
    return this;
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
    return this;
  }

  /** Iterate over absolute playfield cells occupied by this piece */
  forEachCell(cb) {
    const m = this.mask;
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 4; column++) {
        if ((m >>> bitIndex(row, column)) & 1) {
          cb(this.x + column, this.y + row);
        }
      }
    }
  }

  /** Returns an array of occupied cells as {x, y} */
  cells() {
    const out = [];
    this.forEachCell((x, y) => out.push({ x, y }));
    return out;
  }

  /** Create a random tetromino at given position */
  static random(x = 0, y = 0) {
    const keys = Object.keys(ROTATIONS);
    const type = keys[(Math.random() * keys.length) | 0];
    return new Tetromino(type, { x, y });
  }
}

// Small helpers in case you need them elsewhere
export const Bitmask4x4 = { gridToMask, rotateMaskCW, bitIndex };
