class Bytes {
  constructor() { this.a = new Uint8Array(1 << 16); this.n = 0; }
  grow(k) {
    if (this.n + k <= this.a.length) return;
    const b = new Uint8Array(Math.max(this.a.length * 2, this.n + k));
    b.set(this.a);
    this.a = b;
  }
  byte(v) { this.grow(1); this.a[this.n++] = v; }
  u16(v) { this.byte(v & 255); this.byte(v >> 8 & 255); }
  str(s) { for (const ch of s) this.byte(ch.charCodeAt(0)); }
  bytes(src, from, len) { this.grow(len); this.a.set(src.subarray(from, from + len), this.n); this.n += len; }
  result() { return this.a.slice(0, this.n); }
}

function lzw(idx, table, genRef) {
  const out = new Bytes();
  let gen = ++genRef.gen, size = 9, next = 258, acc = 0, bits = 0;
  const put = code => {
    acc |= code << bits;
    bits += size;
    while (bits >= 8) { out.byte(acc & 255); acc >>>= 8; bits -= 8; }
  };
  put(256);
  let prefix = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = prefix << 8 | k, e = table[key];
    if (e >>> 12 === gen) { prefix = e & 4095; continue; }
    put(prefix);
    if (next === 4096) {
      put(256);
      gen = ++genRef.gen;
      size = 9;
      next = 258;
    } else {
      if (next >= 1 << size) size++;
      table[key] = gen << 12 | next++;
    }
    prefix = k;
  }
  put(prefix);
  put(257);
  if (bits) out.byte(acc & 255);
  return out.result();
}

function medianCut(cnt, sr, sg, sb, max) {
  const bins = [];
  for (let k = 0; k < cnt.length; k++) {
    if (cnt[k]) bins.push({ n: cnt[k], r: sr[k] / cnt[k], g: sg[k] / cnt[k], b: sb[k] / cnt[k] });
  }
  if (!bins.length) return [[0, 0, 0]];
  const box = list => {
    let n = 0, r0 = 255, r1 = 0, g0 = 255, g1 = 0, b0 = 255, b1 = 0;
    for (const c of list) {
      n += c.n;
      if (c.r < r0) r0 = c.r; if (c.r > r1) r1 = c.r;
      if (c.g < g0) g0 = c.g; if (c.g > g1) g1 = c.g;
      if (c.b < b0) b0 = c.b; if (c.b > b1) b1 = c.b;
    }
    const rr = r1 - r0, gr = g1 - g0, br = b1 - b0;
    return { list, n, range: Math.max(rr, gr, br), ch: rr >= gr && rr >= br ? 'r' : gr >= br ? 'g' : 'b' };
  };
  const boxes = [box(bins)];
  while (boxes.length < max) {
    let bi = -1, best = 0;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.list.length < 2) continue;
      const score = b.range * Math.sqrt(b.n);
      if (score > best) { best = score; bi = i; }
    }
    if (bi < 0) break;
    const { list, n, ch } = boxes[bi];
    list.sort((a, b) => a[ch] - b[ch]);
    let acc = 0, cut = list.length - 1;
    for (let i = 0; i < list.length - 1; i++) {
      acc += list[i].n;
      if (acc >= n / 2) { cut = i + 1; break; }
    }
    boxes.splice(bi, 1, box(list.slice(0, cut)), box(list.slice(cut)));
  }
  return boxes.map(b => {
    let n = 0, r = 0, g = 0, bl = 0;
    for (const c of b.list) { n += c.n; r += c.r * c.n; g += c.g * c.n; bl += c.b * c.n; }
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
  });
}

const DISPOSE_KEEP = 1, DISPOSE_RESTORE_BACKGROUND = 2;

function encodeGif(frames, w, h, delayCs) {
  const N = 32768;
  const cnt = new Float64Array(N), sr = new Float64Array(N), sg = new Float64Array(N), sb = new Float64Array(N);
  const keyOf = (d, p) => (d[p] >> 3) << 10 | (d[p + 1] >> 3) << 5 | d[p + 2] >> 3;
  let transparent = false;
  for (const d of frames) {
    for (let p = 0; p < d.length; p += 4) {
      if (d[p + 3] < 128) { transparent = true; continue; }
      const k = keyOf(d, p);
      cnt[k]++; sr[k] += d[p]; sg[k] += d[p + 1]; sb[k] += d[p + 2];
    }
  }
  const palette = medianCut(cnt, sr, sg, sb, transparent ? 255 : 256);
  const tIndex = transparent ? palette.length : 0;
  const lut = new Int16Array(N).fill(-1);
  const nearest = k => {
    const r = sr[k] / cnt[k], g = sg[k] / cnt[k], b = sb[k] / cnt[k];
    let best = 0, bd = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const c = palette[i], dr = r - c[0], dg = g - c[1], db = b - c[2];
      const dd = 3 * dr * dr + 4 * dg * dg + 2 * db * db;
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  };

  const out = new Bytes();
  out.str('GIF89a');
  out.u16(w); out.u16(h);
  out.byte(0xf7); out.byte(tIndex); out.byte(0);
  for (let i = 0; i < 256; i++) {
    const c = palette[i] || [0, 0, 0];
    out.byte(c[0]); out.byte(c[1]); out.byte(c[2]);
  }
  out.byte(0x21); out.byte(0xff); out.byte(11); out.str('NETSCAPE2.0');
  out.byte(3); out.byte(1); out.u16(0); out.byte(0);

  const idx = new Uint8Array(w * h), table = new Int32Array(1 << 20), genRef = { gen: 0 };
  for (const d of frames) {
    for (let p = 0, i = 0; i < idx.length; p += 4, i++) {
      if (d[p + 3] < 128) { idx[i] = tIndex; continue; }
      const k = keyOf(d, p);
      let v = lut[k];
      if (v < 0) v = lut[k] = nearest(k);
      idx[i] = v;
    }
    out.byte(0x21); out.byte(0xf9); out.byte(4);
    out.byte(transparent ? DISPOSE_RESTORE_BACKGROUND << 2 | 1 : DISPOSE_KEEP << 2);
    out.u16(delayCs); out.byte(tIndex); out.byte(0);
    out.byte(0x2c); out.u16(0); out.u16(0); out.u16(w); out.u16(h); out.byte(0);
    out.byte(8);
    const data = lzw(idx, table, genRef);
    for (let i = 0; i < data.length; i += 255) {
      const n = Math.min(255, data.length - i);
      out.byte(n);
      out.bytes(data, i, n);
    }
    out.byte(0);
  }
  out.byte(0x3b);
  return out.result();
}

