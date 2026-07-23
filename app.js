// TensorLib Dtype Universe Visualization
// Fetches data.json and renders an interactive force-directed graph

const COLORS = {
  bool: '#66bb6a',
  integer: '#4fc3f7',
  float: '#ab47bc',
  theorem: '#ffd54f'
};

function nodeColor(d) {
  return d.color || COLORS[d.category];
}

let isMobile = window.innerWidth <= 768;

function computeRadius() {
  return {
    bool: isMobile ? 14 : 28,
    integer: isMobile ? 16 : 34,
    float: isMobile ? 18 : 38,
    theorem: isMobile ? 20 : 44
  };
}

let RADIUS = computeRadius();

async function init() {
  const data = await d3.json('data.json');
  createParticles();
  renderStats(data);
  renderGraph(data);
}

function createParticles() {
  const container = document.body;
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDuration = (15 + Math.random() * 25) + 's';
    p.style.animationDelay = Math.random() * 20 + 's';
    p.style.width = (0.5 + Math.random() * 1.5) + 'px';
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}

const BIT_LAYOUTS = {
  bool:    { bits: 8,  layout: [{label: 'value', bits: 8, color: '#66bb6a'}] },
  int8:    { bits: 8,  layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'magnitude', bits: 7, color: '#4fc3f7'}] },
  uint8:   { bits: 8,  layout: [{label: 'value', bits: 8, color: '#4fc3f7'}] },
  int16:   { bits: 16, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'magnitude', bits: 15, color: '#4fc3f7'}] },
  uint16:  { bits: 16, layout: [{label: 'value', bits: 16, color: '#4fc3f7'}] },
  int32:   { bits: 32, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'magnitude', bits: 31, color: '#4fc3f7'}] },
  uint32:  { bits: 32, layout: [{label: 'value', bits: 32, color: '#4fc3f7'}] },
  int64:   { bits: 64, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'magnitude', bits: 63, color: '#4fc3f7'}] },
  uint64:  { bits: 64, layout: [{label: 'value', bits: 64, color: '#4fc3f7'}] },
  float16: { bits: 16, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 5, color: '#ffa726'}, {label: 'mantissa', bits: 10, color: '#ab47bc'}] },
  bfloat16:{ bits: 16, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 8, color: '#ffa726'}, {label: 'mantissa', bits: 7, color: '#ab47bc'}] },
  float32: { bits: 32, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 8, color: '#ffa726'}, {label: 'mantissa', bits: 23, color: '#ab47bc'}] },
  float64: { bits: 64, layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 11, color: '#ffa726'}, {label: 'mantissa', bits: 52, color: '#ab47bc'}] },
  float8:  { bits: 8,  layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 4, color: '#ffa726'}, {label: 'mantissa', bits: 3, color: '#ab47bc'}] },
  fp8_e4m3:{ bits: 8,  layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 4, color: '#ffa726'}, {label: 'mantissa', bits: 3, color: '#ab47bc'}] },
  fp8_e5m2:{ bits: 8,  layout: [{label: 'sign', bits: 1, color: '#ef5350'}, {label: 'exp', bits: 5, color: '#ffa726'}, {label: 'mantissa', bits: 2, color: '#ab47bc'}] },
};

const PR_TIMELINE = [
  { pr: 92, title: "Float16 support", date: "2026-06" },
  { pr: 94, title: "BFloat16 support", date: "2026-07" },
  { pr: 96, title: "FP8 E5M2 support", date: "2026-07" },
];

const CITATIONS = {
  float16: [
    { id: 1, short: "Boldo+2015", title: "Innocuous Double Rounding (HAL)", url: "https://hal.science/hal-01091186v1/document", note: "Proves fp32 arithmetic on fp16 operands = fp16 arithmetic (Theorem 20)" },
    { id: 2, short: "IEEE 754-2019", title: "IEEE 754-2019 Standard for Floating-Point Arithmetic", url: "https://ieeexplore.ieee.org/document/8766229", note: "Defines fp16 format, rounding modes, and special values" }
  ],
  bfloat16: [
    { id: 1, short: "Boldo+2015", title: "Innocuous Double Rounding (HAL)", url: "https://hal.science/hal-01091186v1/document", note: "Proves fp32 arithmetic on bf16 operands = bf16 arithmetic (Theorem 20)" },
    { id: 2, short: "IEEE 754-2019", title: "IEEE 754-2019 Standard for Floating-Point Arithmetic", url: "https://ieeexplore.ieee.org/document/8766229", note: "Defines floating-point semantics used by bf16's exponent/mantissa split" }
  ],
  add_commutative: [
    { id: 1, short: "Boldo+2015", title: "Innocuous Double Rounding (HAL)", url: "https://hal.science/hal-01091186v1/document", note: "Guarantees upcast→compute→downcast matches native precision" }
  ],
  fp16_add_identity: [
    { id: 2, short: "IEEE 754-2019", title: "IEEE 754-2019 Standard for Floating-Point Arithmetic", url: "https://ieeexplore.ieee.org/document/8766229", note: "Defines additive identity and NaN behavior" }
  ]
};

const THEOREM_DESCRIPTIONS = {
  lossless_antisymmetric: "If type A casts losslessly to B, then B cannot cast losslessly back to A.",
  cast_roundtrip: "Integer values within range survive casting to another dtype and back (checked via plausible; not yet a completed proof).",
  bf16_roundtrip: "Encoding a UInt16 as BF16, decoding to Float32, and re-encoding gives the same bits (checked via plausible; not yet a completed proof).",
  fp16_roundtrip: "Encoding a UInt16 as FP16, decoding to Float32, and re-encoding gives the same bits (checked via plausible; not yet a completed proof).",
  add_commutative: "a + b == b + a for FP16/BF16 bit patterns, NaN included (checked via plausible; not yet a completed proof).",
  fp16_add_identity: "a + 0 == a for non-NaN FP16 values, ±0 excluded (checked via plausible; not yet a completed proof).",
  self_cast_roundtrip: "Integer values within range survive casting to their own dtype and back (checked via plausible; not yet a completed proof).",
  lossless_cast_roundtrip: "If lossless(from, to) holds, integer values within range survive cast(from→to→from) (checked via plausible; not yet a completed proof).",
  cast_zero_one: "0 and 1 round-trip correctly between any two dtype pairs (checked via plausible; not yet a completed proof).",
  join_commutative: "Type promotion is order-independent: join(A,B) == join(B,A).",
  mixed_precision_bound: "Mechanized error bounds for upcast→compute→downcast mixed-precision pipelines."
};

const EDGE_CASES = {
  float16: [
    { input: '65504.0', result: '65504.0', status: 'pass', note: 'Max representable value' },
    { input: '0.1', result: '≈0.1 (±0.002)', status: 'pass', note: 'Inexact — rounds to nearest' },
    { input: '-0.0', result: '0.0', status: 'pass', note: 'IEEE 754: -0.0 == 0.0' },
    { input: '+∞', result: '+∞', status: 'pass', note: 'Positive infinity preserved' },
    { input: '-∞', result: '-∞', status: 'pass', note: 'Negative infinity preserved' },
    { input: 'NaN', result: 'NaN ≠ NaN', status: 'pass', note: 'NaN is never equal to itself' },
    { input: '2048.5', result: '2048', status: 'pass', note: 'Step size is 2 at this range — rounds down' },
    { input: '100.5', result: '100.5', status: 'pass', note: 'Exact — fits in mantissa' },
    { input: '0.00005', result: '≈0.00005', status: 'pass', note: 'Subnormal — near min precision' },
    { input: '1.16e-10', result: '0.0', status: 'pass', note: 'Below min subnormal → flushes to zero' },
    { input: '1e-20', result: '0.0', status: 'pass', note: 'Way below min subnormal → zero' },
    { input: '-1e-20', result: '-0.0', status: 'pass', note: 'Negative underflow → negative zero' },
    { input: '1e-40', result: '0.0', status: 'pass', note: 'Extreme underflow → zero' },
  ],
  bfloat16: [
    { input: '256.0', result: '256.0', status: 'pass', note: 'Exact power of 2' },
    { input: '0.1', result: '≈0.1 (±0.01)', status: 'pass', note: 'Inexact — less precision than FP16' },
    { input: '-0.0', result: '0.0', status: 'pass', note: 'IEEE 754: -0.0 == 0.0' },
    { input: '+∞', result: '+∞', status: 'pass', note: 'Positive infinity preserved' },
    { input: '-∞', result: '-∞', status: 'pass', note: 'Negative infinity preserved' },
    { input: 'NaN', result: 'NaN ≠ NaN', status: 'pass', note: 'NaN is never equal to itself' },
    { input: '3.39e38', result: '> 3.0e38', status: 'pass', note: 'Near max BF16 value' },
  ],
  fp8_e4m3: [
    { input: '448.0', result: '448.0', status: 'pass', note: 'Max representable — no infinity in E4M3FN' },
    { input: '0.1', result: '≈0.1015625', status: 'pass', note: 'Inexact — only 3 mantissa bits' },
    { input: '-0.0', result: '0.0', status: 'pass', note: '-0 encodes to bits 128, compares equal to +0' },
    { input: '0.001953125', result: '0.001953125', status: 'pass', note: 'Smallest subnormal (2⁻⁹)' },
    { input: '1.5', result: '1.5', status: 'pass', note: 'Exact — fits in 3-bit mantissa' },
    { input: '16.0', result: '16.0', status: 'pass', note: 'maxSafeNat — largest consecutive integer' },
    { input: '256.0', result: '256.0', status: 'pass', note: 'Exact — 2⁸ (near top of range)' },
    { input: '460.0', result: '448.0', status: 'pass', note: 'Saturates to max (matches ml_dtypes)' },
    { input: '465.0', result: 'NaN', status: 'pass', note: 'Overflow → NaN (E4M3FN has no infinity)' },
    { input: '+∞', result: 'NaN', status: 'pass', note: 'No +∞ encoding — collapses to NaN' },
    { input: 'NaN', result: 'NaN', status: 'pass', note: 'Bits 127 / 255 are the only NaN patterns' },
  ],
  fp8_e5m2: [
    { input: '57344.0', result: '57344.0', status: 'pass', note: 'Max finite value (exp=30, mantissa=3)' },
    { input: '0.1', result: '≈0.09375', status: 'pass', note: 'Inexact — only 2 mantissa bits' },
    { input: '-0.0', result: '0.0', status: 'pass', note: 'IEEE 754: -0.0 == 0.0' },
    { input: '1.526e-5', result: '1.526e-5', status: 'pass', note: 'Smallest subnormal (2⁻¹⁶)' },
    { input: '1.5', result: '1.5', status: 'pass', note: 'Exact' },
    { input: '2.0', result: '2.0', status: 'pass', note: 'Exact power of 2' },
    { input: '8.0', result: '8.0', status: 'pass', note: 'maxSafeNat — largest consecutive integer' },
    { input: '60000.0', result: '57344.0', status: 'pass', note: 'Saturates to max (< 65535 threshold)' },
    { input: '65536.0', result: '+∞', status: 'pass', note: 'Overflow → +∞ (unlike E4M3, E5M2 has infinity)' },
    { input: '+∞', result: '+∞', status: 'pass', note: 'Positive infinity preserved' },
    { input: '-∞', result: '-∞', status: 'pass', note: 'Negative infinity preserved' },
    { input: 'NaN', result: 'NaN', status: 'pass', note: 'NaN preserved' },
  ],
};

const PROOF_REPLAYS = {
  add_commutative: {
    title: 'Add Commutative: a + b == b + a',
    example: { a: 1.5, b: 2.75, dtype: 'float16' },
    steps: [
      {
        label: 'Pick two FP16 values',
        bits: [
          { label: 'a', value: 1.5, dtype: 'float16' },
          { label: 'b', value: 2.75, dtype: 'float16' },
        ],
        explanation: 'We choose <code>a = 1.5</code> and <code>b = 2.75</code> as FP16 bit patterns. The property is checked across bit patterns, including NaN (no counterexample found).'
      },
      {
        label: 'Compute a + b',
        bits: [
          { label: 'a', value: 1.5, dtype: 'float16' },
          { label: 'b', value: 2.75, dtype: 'float16' },
          { label: 'a+b', value: 4.25, dtype: 'float16' },
        ],
        explanation: '<code>1.5 + 2.75 = 4.25</code> — the addition is performed at FP16 precision and the result is rounded to the nearest representable value.'
      },
      {
        label: 'Compute b + a',
        bits: [
          { label: 'b', value: 2.75, dtype: 'float16' },
          { label: 'a', value: 1.5, dtype: 'float16' },
          { label: 'b+a', value: 4.25, dtype: 'float16' },
        ],
        explanation: '<code>2.75 + 1.5 = 4.25</code> — same operands, reversed order. Produces an identical bit pattern.'
      },
      {
        label: 'Compare results',
        bits: [
          { label: 'a+b', value: 4.25, dtype: 'float16', highlight: true },
          { label: 'b+a', value: 4.25, dtype: 'float16', highlight: true },
        ],
        explanation: 'The bit patterns are identical. TensorLib checks this via <code>plausible</code> (randomized property testing over UInt16 pairs) — no counterexample found — but it is not yet a completed formal proof (the declaration uses <code>sorry</code>). NaN+NaN also commutes: both orders produce the same quiet NaN bits.'
      },
    ]
  },
  bf16_roundtrip: {
    title: 'BF16 Round-Trip: encode → decode → re-encode = identity',
    example: { value: 42, dtype: 'bfloat16' },
    steps: [
      {
        label: 'Start with raw UInt16 bits',
        bits: [
          { label: 'raw', value: 16928, dtype: 'uint16' },
        ],
        explanation: 'Take any 16-bit integer — here <code>16928</code> (0x4220). Interpret these bits as a BFloat16 pattern.'
      },
      {
        label: 'Interpret as BF16 → decode to FP32',
        bits: [
          { label: 'bf16', value: 40.5, dtype: 'bfloat16' },
          { label: 'fp32', value: 40.5, dtype: 'float32' },
        ],
        explanation: 'The bits <code>0x4220</code> decode to BF16 value <code>40.5</code>. Widening to FP32 is lossless — BF16 is just the top 16 bits of FP32.'
      },
      {
        label: 'Re-encode FP32 → BF16',
        bits: [
          { label: 'fp32', value: 40.5, dtype: 'float32' },
          { label: 'bf16', value: 40.5, dtype: 'bfloat16' },
        ],
        explanation: 'Truncating FP32 back to 16 bits gives the exact same BF16 pattern, because no information was added during widening.'
      },
      {
        label: 'Compare: original bits = re-encoded bits',
        bits: [
          { label: 'orig', value: 16928, dtype: 'uint16', highlight: true },
          { label: 'result', value: 40.5, dtype: 'bfloat16', highlight: true },
        ],
        explanation: 'The round-trip is exact for the tested inputs. TensorLib checks this via <code>plausible</code> randomized testing over UInt16 (2¹⁶ = 65536 possible patterns) — no counterexample found — but it is not yet a completed formal proof (the declaration uses <code>sorry</code>). NaN is explicitly excluded, since Lean normalizes all NaN bits and they cannot round-trip.'
      },
    ]
  },
  fp16_roundtrip: {
    title: 'FP16 Round-Trip: encode → decode → re-encode = identity',
    example: { value: 1.5, dtype: 'float16' },
    steps: [
      {
        label: 'Start with raw UInt16 bits',
        bits: [
          { label: 'raw', value: 15872, dtype: 'uint16' },
        ],
        explanation: 'Take any 16-bit integer — here <code>15872</code> (0x3E00). Interpret these bits as an FP16 pattern.'
      },
      {
        label: 'Interpret as FP16 → decode to FP32',
        bits: [
          { label: 'fp16', value: 1.5, dtype: 'float16' },
          { label: 'fp32', value: 1.5, dtype: 'float32' },
        ],
        explanation: 'The bits decode to FP16 value <code>1.5</code>. Widening to FP32 preserves the value exactly — FP32 has a superset of FP16\'s representable values.'
      },
      {
        label: 'Re-encode FP32 → FP16',
        bits: [
          { label: 'fp32', value: 1.5, dtype: 'float32' },
          { label: 'fp16', value: 1.5, dtype: 'float16' },
        ],
        explanation: 'Narrowing back to FP16 produces the exact same bit pattern — <code>1.5</code> is representable in both formats.'
      },
      {
        label: 'Bits match: round-trip is identity',
        bits: [
          { label: 'orig', value: 15872, dtype: 'uint16', highlight: true },
          { label: 'result', value: 1.5, dtype: 'float16', highlight: true },
        ],
        explanation: 'TensorLib checks this via <code>plausible</code> randomized testing over UInt16 (2¹⁶ = 65536 possible patterns) — no counterexample found — but it is not yet a completed formal proof (the declaration uses <code>sorry</code>). NaN is explicitly excluded, since Lean normalizes all NaN bits and they cannot round-trip.'
      },
    ]
  },
  lossless_antisymmetric: {
    title: 'Lossless Antisymmetric: lossless(A,B) → ¬lossless(B,A)',
    example: {},
    steps: [
      {
        label: 'Assume lossless(Int8, FP32)',
        bits: [
          { label: 'int8', value: 127, dtype: 'int8' },
          { label: 'fp32', value: 127, dtype: 'float32' },
        ],
        explanation: 'Int8→FP32 is lossless: every 8-bit integer fits exactly in a 23-bit mantissa. <code>127</code> → <code>127.0</code> with no information lost.'
      },
      {
        label: 'Try the reverse: FP32 → Int8',
        bits: [
          { label: 'fp32', value: 0.5, dtype: 'float32' },
          { label: 'int8', value: 0, dtype: 'int8' },
        ],
        explanation: 'But FP32→Int8 cannot be lossless. <code>0.5</code> has no Int8 representation — it must truncate to <code>0</code>. Information is destroyed.'
      },
      {
        label: 'The contrapositive',
        bits: [
          { label: 'fp32', value: 256, dtype: 'float32' },
          { label: 'int8', value: 0, dtype: 'int8' },
        ],
        explanation: 'Even integers fail: <code>256</code> overflows Int8 (max 127). FP32 has values that simply don\'t fit in Int8 — so the reverse cast is necessarily lossy.'
      },
      {
        label: 'Therefore: antisymmetric',
        bits: [],
        explanation: 'If type A can losslessly represent all values of type B, then B must have values A cannot represent (otherwise they\'d be the same type). TensorLib proves this structurally for all dtype pairs in the cast lattice.'
      },
    ]
  },
  fp16_add_identity: {
    title: 'FP16 Add Identity: a + 0 == a',
    example: { a: 3.14, dtype: 'float16' },
    steps: [
      {
        label: 'Pick an FP16 value',
        bits: [
          { label: 'a', value: 3.14, dtype: 'float16' },
        ],
        explanation: 'Choose any non-NaN FP16 value. Here: <code>3.14</code> (rounded to nearest FP16 representable value).'
      },
      {
        label: 'Add zero',
        bits: [
          { label: 'a', value: 3.14, dtype: 'float16' },
          { label: '0', value: 0, dtype: 'float16' },
          { label: 'a+0', value: 3.14, dtype: 'float16' },
        ],
        explanation: 'Adding <code>+0.0</code> to any FP16 value. IEEE 754 guarantees the result equals the input.'
      },
      {
        label: 'Verify bit-exact equality',
        bits: [
          { label: 'a', value: 3.14, dtype: 'float16', highlight: true },
          { label: 'a+0', value: 3.14, dtype: 'float16', highlight: true },
        ],
        explanation: 'Byte-for-byte identical. Checked via <code>plausible</code> randomized testing over UInt16 — no counterexample found — but it is not yet a completed formal proof (the declaration uses <code>sorry</code>). The property excludes NaN (where <code>f ≠ f</code>) and ±0 (where <code>-0 + 0 = +0 ≠ -0</code> by byte equality).'
      },
    ]
  },
};

function numberToBits(value, dtype) {
  const buf = new ArrayBuffer(8);
  const f64 = new Float64Array(buf);
  const f32 = new Float32Array(buf);
  const u32 = new Uint32Array(buf);
  const u8 = new Uint8Array(buf);
  const i8 = new Int8Array(buf);
  const i16 = new Int16Array(buf);
  const u16 = new Uint16Array(buf);
  const i32 = new Int32Array(buf);

  switch (dtype) {
    case 'float64': {
      f64[0] = value;
      const lo = u32[0], hi = u32[1];
      return (BigInt(hi) << 32n | BigInt(lo >>> 0)).toString(2).padStart(64, '0');
    }
    case 'float32': {
      f32[0] = value;
      return (u32[0] >>> 0).toString(2).padStart(32, '0');
    }
    case 'float16': {
      f32[0] = value;
      const bits = u32[0] >>> 0;
      const sign = (bits >> 31) & 1;
      let exp = (bits >> 23) & 0xFF;
      let mant = bits & 0x7FFFFF;
      let fp16Exp, fp16Mant;
      if (exp === 0xFF) {
        fp16Exp = 0x1F;
        fp16Mant = mant ? (mant >> 13) | 1 : 0;
      } else if (exp === 0) {
        fp16Exp = 0;
        fp16Mant = 0;
      } else {
        const newExp = exp - 127 + 15;
        if (newExp >= 0x1F) {
          fp16Exp = 0x1F;
          fp16Mant = 0;
        } else if (newExp <= 0) {
          const shift = 14 - (exp - 127);
          fp16Mant = shift < 24 ? ((mant | 0x800000) >> shift) >> 13 : 0;
          fp16Exp = 0;
        } else {
          fp16Exp = newExp;
          fp16Mant = mant >> 13;
        }
      }
      const fp16 = (sign << 15) | (fp16Exp << 10) | fp16Mant;
      return fp16.toString(2).padStart(16, '0');
    }
    case 'bfloat16': {
      f32[0] = value;
      const bf16 = (u32[0] >>> 16) & 0xFFFF;
      return bf16.toString(2).padStart(16, '0');
    }
    case 'fp8_e5m2': {
      // E5M2: 1 sign + 5 exp (bias 15) + 2 mantissa. Has inf and NaN.
      f32[0] = value;
      const bits = u32[0] >>> 0;
      const sign = (bits >> 31) & 1;
      const exp = (bits >> 23) & 0xFF;
      const mant = bits & 0x7FFFFF;
      let e5m2Exp, e5m2Mant;
      if (exp === 0xFF) {
        e5m2Exp = 0x1F;
        e5m2Mant = mant ? 1 : 0;
      } else if (exp === 0) {
        e5m2Exp = 0;
        e5m2Mant = 0;
      } else {
        const newExp = exp - 127 + 15;
        if (newExp >= 0x1F) {
          if (isFinite(value) && Math.abs(value) < 65535) {
            e5m2Exp = 0x1E;
            e5m2Mant = 0x3;
          } else {
            e5m2Exp = 0x1F;
            e5m2Mant = 0;
          }
        } else if (newExp <= 0) {
          const shift = 14 - (exp - 127);
          e5m2Mant = shift < 24 ? ((mant | 0x800000) >> shift) >> 21 : 0;
          e5m2Exp = 0;
        } else {
          e5m2Exp = newExp;
          e5m2Mant = mant >> 21;
        }
      }
      const fp8 = ((sign << 7) | (e5m2Exp << 2) | e5m2Mant) & 0xFF;
      return fp8.toString(2).padStart(8, '0');
    }
    case 'fp8_e4m3': {
      // E4M3FN: 1 sign + 4 exp (bias 7) + 3 mantissa. No inf; bits 127/255 = NaN. Max = 448.
      f32[0] = value;
      const bits = u32[0] >>> 0;
      const sign = (bits >> 31) & 1;
      const exp = (bits >> 23) & 0xFF;
      const mant = bits & 0x7FFFFF;
      let e4m3Exp, e4m3Mant;
      if (isNaN(value)) {
        return ((sign << 7) | 0x7F).toString(2).padStart(8, '0');
      }
      if (!isFinite(value) || Math.abs(value) >= 465) {
        return ((sign << 7) | 0x7F).toString(2).padStart(8, '0');
      }
      if (Math.abs(value) > 448) {
        e4m3Exp = 0xF;
        e4m3Mant = 0x6;
      } else if (exp === 0) {
        e4m3Exp = 0;
        e4m3Mant = 0;
      } else {
        const newExp = exp - 127 + 7;
        if (newExp >= 0xF) {
          const m = mant >> 20;
          if (newExp === 0xF && m < 7) {
            e4m3Exp = 0xF;
            e4m3Mant = m;
          } else {
            e4m3Exp = 0xF;
            e4m3Mant = 0x6;
          }
        } else if (newExp <= 0) {
          const shift = 6 - (exp - 127);
          e4m3Mant = shift < 24 ? ((mant | 0x800000) >> shift) >> 20 : 0;
          e4m3Exp = 0;
        } else {
          e4m3Exp = newExp;
          e4m3Mant = mant >> 20;
        }
      }
      const fp8 = ((sign << 7) | (e4m3Exp << 3) | e4m3Mant) & 0xFF;
      return fp8.toString(2).padStart(8, '0');
    }
    case 'int8': {
      i8[0] = Math.max(-128, Math.min(127, Math.round(value)));
      return u8[0].toString(2).padStart(8, '0');
    }
    case 'uint8': {
      u8[0] = Math.max(0, Math.min(255, Math.round(value)));
      return u8[0].toString(2).padStart(8, '0');
    }
    case 'int16': {
      i16[0] = Math.max(-32768, Math.min(32767, Math.round(value)));
      return u16[0].toString(2).padStart(16, '0');
    }
    case 'uint16': {
      u16[0] = Math.max(0, Math.min(65535, Math.round(value)));
      return u16[0].toString(2).padStart(16, '0');
    }
    case 'int32': {
      i32[0] = Math.round(value);
      return (u32[0] >>> 0).toString(2).padStart(32, '0');
    }
    case 'uint32': {
      u32[0] = Math.max(0, Math.round(value));
      return (u32[0] >>> 0).toString(2).padStart(32, '0');
    }
    case 'int64': {
      const n = BigInt(Math.round(value));
      const bits = BigInt.asUintN(64, n);
      return bits.toString(2).padStart(64, '0');
    }
    case 'uint64': {
      const n = BigInt(Math.max(0, Math.round(value)));
      return BigInt.asUintN(64, n).toString(2).padStart(64, '0');
    }
    case 'bool': {
      return (value ? 1 : 0).toString(2).padStart(8, '0');
    }
    default:
      return '';
  }
}

function renderBitPattern(bitsStr, layout, container) {
  container.innerHTML = '';
  let bitIndex = 0;
  layout.forEach((seg, segIdx) => {
    for (let i = 0; i < seg.bits; i++) {
      const span = document.createElement('span');
      span.className = 'bit-char';
      span.style.background = seg.color + '33';
      span.style.color = seg.color;
      span.textContent = bitsStr[bitIndex] || '0';
      container.appendChild(span);
      bitIndex++;
    }
    if (segIdx < layout.length - 1) {
      const spacer = document.createElement('span');
      spacer.className = 'bit-char spacer';
      container.appendChild(spacer);
    }
  });
}

function getDecodedValue(bitsStr, dtype) {
  if (dtype === 'float16') {
    const val = parseInt(bitsStr, 2);
    const sign = (val >> 15) & 1;
    const exp = (val >> 10) & 0x1F;
    const mant = val & 0x3FF;
    if (exp === 0x1F) return mant ? 'NaN' : (sign ? '-∞' : '+∞');
    if (exp === 0) {
      if (mant === 0) return sign ? '-0' : '0';
      return (sign ? -1 : 1) * (mant / 1024) * Math.pow(2, -14);
    }
    return (sign ? -1 : 1) * (1 + mant / 1024) * Math.pow(2, exp - 15);
  }
  if (dtype === 'bfloat16') {
    const val = parseInt(bitsStr, 2);
    const sign = (val >> 15) & 1;
    const exp = (val >> 7) & 0xFF;
    const mant = val & 0x7F;
    if (exp === 0xFF) return mant ? 'NaN' : (sign ? '-∞' : '+∞');
    if (exp === 0) {
      if (mant === 0) return sign ? '-0' : '0';
      return (sign ? -1 : 1) * (mant / 128) * Math.pow(2, -126);
    }
    return (sign ? -1 : 1) * (1 + mant / 128) * Math.pow(2, exp - 127);
  }
  if (dtype === 'fp8_e5m2') {
    const val = parseInt(bitsStr, 2);
    const sign = (val >> 7) & 1;
    const exp = (val >> 2) & 0x1F;
    const mant = val & 0x3;
    if (exp === 0x1F) return mant ? 'NaN' : (sign ? '-∞' : '+∞');
    if (exp === 0) {
      if (mant === 0) return sign ? '-0' : '0';
      return (sign ? -1 : 1) * (mant / 4) * Math.pow(2, -14);
    }
    return (sign ? -1 : 1) * (1 + mant / 4) * Math.pow(2, exp - 15);
  }
  if (dtype === 'fp8_e4m3') {
    const val = parseInt(bitsStr, 2);
    const sign = (val >> 7) & 1;
    const exp = (val >> 3) & 0xF;
    const mant = val & 0x7;
    // E4M3FN: only NaN encodings are 0x7F and 0xFF (exp=15, mant=7), no infinity
    if (exp === 0xF && mant === 0x7) return 'NaN';
    if (exp === 0) {
      if (mant === 0) return sign ? '-0' : '0';
      return (sign ? -1 : 1) * (mant / 8) * Math.pow(2, -6);
    }
    return (sign ? -1 : 1) * (1 + mant / 8) * Math.pow(2, exp - 7);
  }
  return null;
}

function showProofReplay(theoremId) {
  const replay = PROOF_REPLAYS[theoremId];
  if (!replay) return;

  const modal = document.getElementById('proof-replay');
  const titleEl = document.getElementById('proof-replay-title');
  const stepEl = document.getElementById('proof-replay-step');
  const bitsEl = document.getElementById('proof-replay-bits');
  const explEl = document.getElementById('proof-replay-explanation');
  const counterEl = document.getElementById('proof-replay-counter');
  const prevBtn = document.getElementById('proof-replay-prev');
  const nextBtn = document.getElementById('proof-replay-next');

  titleEl.textContent = replay.title;
  let currentStep = 0;

  function renderStep(idx) {
    const step = replay.steps[idx];
    stepEl.textContent = step.label;
    explEl.innerHTML = step.explanation;
    counterEl.textContent = `${idx + 1} / ${replay.steps.length}`;
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === replay.steps.length - 1;

    bitsEl.innerHTML = '';
    step.bits.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'proof-bits-row';

      const labelEl = document.createElement('span');
      labelEl.className = 'proof-bits-label';
      labelEl.textContent = row.label;
      rowEl.appendChild(labelEl);

      const valueEl = document.createElement('div');
      valueEl.className = 'proof-bits-value';

      const bitsStr = numberToBits(row.value, row.dtype);
      const layoutDef = BIT_LAYOUTS[row.dtype];
      if (layoutDef && bitsStr) {
        let bitIdx = 0;
        layoutDef.layout.forEach((seg, segIdx) => {
          for (let i = 0; i < seg.bits; i++) {
            const span = document.createElement('span');
            span.className = 'proof-bit' + (row.highlight ? ' highlight' : '');
            span.style.background = seg.color + '33';
            span.style.color = seg.color;
            span.textContent = bitsStr[bitIdx] || '0';
            valueEl.appendChild(span);
            bitIdx++;
          }
          if (segIdx < layoutDef.layout.length - 1) {
            const spacer = document.createElement('span');
            spacer.className = 'proof-bit spacer';
            valueEl.appendChild(spacer);
          }
        });
      }

      rowEl.appendChild(valueEl);
      bitsEl.appendChild(rowEl);
    });
  }

  prevBtn.onclick = () => {
    if (currentStep > 0) {
      currentStep--;
      renderStep(currentStep);
    }
  };

  nextBtn.onclick = () => {
    if (currentStep < replay.steps.length - 1) {
      currentStep++;
      renderStep(currentStep);
    }
  };

  document.getElementById('proof-replay-close').onclick = () => {
    modal.classList.remove('visible');
  };

  function handleKey(e) {
    if (!modal.classList.contains('visible')) return;
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      nextBtn.click();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevBtn.click();
    } else if (e.key === 'Escape') {
      modal.classList.remove('visible');
    }
  }
  window.removeEventListener('keydown', modal._keyHandler);
  modal._keyHandler = handleKey;
  window.addEventListener('keydown', handleKey);

  renderStep(0);
  modal.classList.add('visible');
}

function getBarOffsets() {
  const bar = document.getElementById('progress-bar');
  if (bar) {
    const style = getComputedStyle(bar);
    const top = parseFloat(style.top) || 60;
    const bottom = parseFloat(style.bottom) || 60;
    return { top, bottom };
  }
  return { top: 60, bottom: 60 };
}

function getBarHeight() {
  const offsets = getBarOffsets();
  return window.innerHeight - offsets.top - offsets.bottom;
}

function renderStats(data) {
  const total = data.nodes.length;
  const complete = data.nodes.filter(n => n.status === 'complete').length;
  const theorems = data.nodes.filter(n => n.category === 'theorem');
  const provenTheorems = theorems.filter(n => n.status === 'complete').length;
  const statsEl = document.getElementById('stats');
  statsEl.innerHTML = `${complete}/${total} milestones complete &middot; ${provenTheorems}/${theorems.length} theorems verified &middot; <a href="https://github.com/leanprover/TensorLib" target="_blank" style="color:#64b5f6;text-decoration:none;">github.com/leanprover/TensorLib</a>`;

  const pct = (complete / total) * 100;
  const fill = document.getElementById('progress-fill');
  fill.style.height = pct + '%';

  const offsets = getBarOffsets();
  const lambda = document.getElementById('progress-lambda');
  const barH = getBarHeight();
  lambda.style.top = (offsets.top + pct / 100 * barH) + 'px';
}

function renderGraph(data) {
  const svg = d3.select('#graph');
  const width = window.innerWidth;
  const height = window.innerHeight;

  svg.attr('width', width).attr('height', height);

  // Arrow markers
  const defs = svg.append('defs');
  ['lossless', 'lossy', 'proves', 'depends'].forEach(type => {
    defs.append('marker')
      .attr('id', `arrow-${type}`)
      .attr('viewBox', '0 -3 6 6')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-3L6,0L0,3')
      .attr('fill', type === 'lossless' ? '#4caf50' :
                     type === 'lossy' ? '#ff7043' :
                     type === 'proves' ? '#ffd54f' : '#78909c')
      .attr('opacity', 0.6);
  });

  // Glow filter
  const filter = defs.append('filter').attr('id', 'glow');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
  filter.append('feMerge').selectAll('feMergeNode')
    .data(['blur', 'SourceGraphic'])
    .enter().append('feMergeNode')
    .attr('in', d => d);

  // Vertical layout: position nodes by category tier
  const yTiers = {
    bool: 0.25,
    integer: 0.37,
    float: 0.52,
    theorem: 0.75
  };

  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges).id(d => d.id).distance(d => {
      const base = isMobile ? 50 : 115;
      const short = isMobile ? 40 : 90;
      return (d.type === 'proves' || d.type === 'depends') ? base : short;
    }))
    .force('charge', d3.forceManyBody().strength(isMobile ? -80 : -320))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => RADIUS[d.category] + (isMobile ? 6 : 16)))
    .force('x', d3.forceX(width / 2).strength(isMobile ? 0.12 : 0.04))
    .force('y', d3.forceY(d => yTiers[d.category] * height).strength(isMobile ? 0.25 : 0.14));

  // Edges
  const link = svg.append('g')
    .selectAll('line')
    .data(data.edges)
    .enter().append('line')
    .attr('class', d => `edge-${d.type}`)
    .attr('marker-end', d => `url(#arrow-${d.type})`);

  // Node groups
  const node = svg.append('g')
    .selectAll('g')
    .data(data.nodes)
    .enter().append('g')
    .attr('class', d => `node-group ${d.pr ? 'node-recent' : ''}`)
    .call(d3.drag()
      .on('start', dragStart)
      .on('drag', dragging)
      .on('end', dragEnd));

  // Shape helpers
  function hexagonPath(r) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      points.push(`${r * Math.cos(angle)},${r * Math.sin(angle)}`);
    }
    return `M ${points.join(' L ')} Z`;
  }

  // Background shape (track)
  node.each(function(d) {
    const g = d3.select(this);
    const r = RADIUS[d.category];
    if (d.category === 'theorem') {
      g.append('path')
        .attr('class', 'node-fill-bg')
        .attr('d', hexagonPath(r))
        .attr('fill', nodeColor(d));
    } else {
      g.append('circle')
        .attr('class', 'node-fill-bg')
        .attr('r', r)
        .attr('fill', nodeColor(d));
    }
  });

  // Progress fill
  node.each(function(d) {
    const g = d3.select(this);
    const r = RADIUS[d.category];
    const progress = typeof d.progress === 'number' ? d.progress :
                     d.status === 'complete' ? 1 :
                     d.status === 'in_progress' ? 0.6 : 0;
    if (progress === 0) return;

    if (d.category === 'theorem') {
      // For hexagons, use clip-path with a rising rectangle
      const clipId = `clip-${d.id}`;
      const clipRect = g.append('clipPath').attr('id', clipId)
        .append('rect')
        .attr('x', -r)
        .attr('width', r * 2)
        .attr('y', r - progress * 2 * r)
        .attr('height', r * 2);
      g.append('path')
        .attr('class', 'node-fill-progress')
        .attr('d', hexagonPath(r))
        .attr('fill', nodeColor(d))
        .attr('clip-path', `url(#${clipId})`);
    } else {
      // Circular progress arc
      let pathD;
      if (progress === 1) {
        pathD = `M 0 ${-r} A ${r} ${r} 0 1 1 -0.001 ${-r} Z`;
      } else {
        const angle = progress * 2 * Math.PI - Math.PI / 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const largeArc = progress > 0.5 ? 1 : 0;
        pathD = `M 0 ${-r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y} L 0 0 Z`;
      }
      g.append('path')
        .attr('class', 'node-fill-progress')
        .attr('fill', nodeColor(d))
        .attr('d', pathD);
    }
  });

  // Ring / outline
  node.each(function(d) {
    const g = d3.select(this);
    const r = RADIUS[d.category];
    if (d.category === 'theorem') {
      g.append('path')
        .attr('class', 'node-ring')
        .attr('d', hexagonPath(r))
        .attr('stroke', nodeColor(d))
        .style('color', nodeColor(d));
    } else {
      g.append('circle')
        .attr('class', 'node-ring')
        .attr('r', r)
        .attr('stroke', nodeColor(d))
        .style('color', nodeColor(d));
    }
  });

  // Label
  node.each(function(d) {
    const lines = d.label.split('\n');
    const g = d3.select(this);
    lines.forEach((line, i) => {
      g.append('text')
        .attr('class', 'node-label')
        .attr('dy', (i - (lines.length - 1) / 2) * 11 + 3)
        .text(line);
    });
  });

  // Citation badges
  node.each(function(d) {
    const cites = CITATIONS[d.id];
    if (!cites || cites.length === 0) return;
    const g = d3.select(this);
    const r = RADIUS[d.category];
    g.append('circle')
      .attr('class', 'cite-badge')
      .attr('cx', r - 4)
      .attr('cy', -r + 4)
      .attr('r', 8)
      .attr('fill', '#ff8a65')
      .attr('stroke', '#0a0e1a')
      .attr('stroke-width', 1.5);
    g.append('text')
      .attr('class', 'cite-badge-text')
      .attr('x', r - 4)
      .attr('y', -r + 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('fill', '#fff')
      .attr('pointer-events', 'none')
      .text(cites.length);
  });

  // Tooltip
  const tooltip = document.getElementById('tooltip');

  node.on('mouseenter', (event, d) => {
    const statusLabel = d.status.replace('_', ' ');
    let html = `<div class="tt-title">${d.label.replace('\n', ' ')}</div>`;
    html += `<span class="tt-status ${d.status}">${statusLabel}</span>`;
    if (d.category === 'theorem' && THEOREM_DESCRIPTIONS[d.id]) {
      html += `<div style="margin-top:8px;font-style:italic;opacity:0.85;">${THEOREM_DESCRIPTIONS[d.id]}</div>`;
    } else {
      html += `<div style="margin-top:6px;opacity:0.7;">Category: ${d.category}</div>`;
    }
    if (d.pr) {
      html += `<div class="tt-pr">PR: <a href="https://github.com/leanprover/TensorLib/pull/${d.pr}" target="_blank">#${d.pr}</a></div>`;
    }
    const cites = CITATIONS[d.id];
    if (cites && cites.length > 0) {
      html += `<div class="tt-cites">`;
      cites.forEach(c => {
        html += `<div class="tt-cite"><a href="${c.url}" target="_blank">[${c.id}]</a> ${c.short} — <span style="opacity:0.7">${c.note}</span></div>`;
      });
      html += `</div>`;
    }
    tooltip.innerHTML = html;
    tooltip.classList.add('visible');

    // Highlight connected nodes and edges, dim the rest
    const connectedIds = new Set([d.id]);
    data.edges.forEach(e => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      if (sid === d.id) connectedIds.add(tid);
      if (tid === d.id) connectedIds.add(sid);
    });

    node.classed('highlighted', n => connectedIds.has(n.id));
    node.classed('dimmed', n => !connectedIds.has(n.id));

    link.classed('highlighted', e => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      return sid === d.id || tid === d.id;
    });
    link.classed('dimmed', e => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      return sid !== d.id && tid !== d.id;
    });
  })
  .on('mousemove', (event) => {
    tooltip.style.left = (event.clientX + 14) + 'px';
    tooltip.style.top = (event.clientY - 10) + 'px';
  })
  .on('mouseleave', () => {
    tooltip.classList.remove('visible');
    // Reset all highlights
    node.classed('highlighted', false);
    node.classed('dimmed', false);
    link.classed('highlighted', false);
    link.classed('dimmed', false);
  })
  .on('click', (event, d) => {
    const panel = document.getElementById('bit-panel');
    const layout = BIT_LAYOUTS[d.id];

    if (layout) {
      // Show bit layout panel
      document.getElementById('bit-panel-title').textContent = `${d.label.replace('\n', ' ')} — ${layout.bits} bits`;

      const layoutEl = document.getElementById('bit-panel-layout');
      layoutEl.innerHTML = '';
      layout.layout.forEach(seg => {
        const div = document.createElement('div');
        div.className = 'bit-segment';
        div.style.flex = seg.bits;
        div.style.background = seg.color;
        div.textContent = seg.bits;
        const lbl = document.createElement('span');
        lbl.className = 'bit-segment-label';
        lbl.textContent = seg.label;
        div.appendChild(lbl);
        layoutEl.appendChild(div);
      });

      let details = '';
      if (d.category === 'float') {
        const expBits = layout.layout.find(s => s.label === 'exp');
        const manBits = layout.layout.find(s => s.label === 'mantissa');
        if (expBits && manBits) {
          const precision = manBits.bits + 1;
          const maxExp = Math.pow(2, expBits.bits - 1) - 1;
          details = `Precision: ${precision} bits (${Math.floor(precision * Math.log10(2))} decimal digits) · Exponent range: ±${maxExp}`;
        }
      } else if (d.category === 'integer') {
        const signed = d.id.startsWith('int');
        const bits = layout.bits;
        if (signed) {
          details = `Range: -${Math.pow(2, bits-1)} to ${Math.pow(2, bits-1) - 1}`;
        } else {
          details = `Range: 0 to ${Math.pow(2, bits) - 1}`;
        }
      } else if (d.category === 'bool') {
        details = 'Values: 0 (false) or 1 (true)';
      }
      if (d.pr) {
        details += ` · <a href="https://github.com/leanprover/TensorLib/pull/${d.pr}" target="_blank" style="color:#64b5f6;">PR #${d.pr}</a>`;
      }
      document.getElementById('bit-panel-details').innerHTML = details;

      // Edge cases button
      const ecBtn = document.getElementById('bit-panel-edge-cases');
      const ecList = document.getElementById('edge-cases-list');
      ecList.classList.remove('visible');
      ecList.innerHTML = '';
      if (EDGE_CASES[d.id]) {
        ecBtn.classList.add('visible');
        ecBtn.onclick = () => {
          if (ecList.classList.contains('visible')) {
            ecList.classList.remove('visible');
            return;
          }
          ecList.innerHTML = '';
          EDGE_CASES[d.id].forEach(ec => {
            const row = document.createElement('div');
            row.className = 'edge-case-row';
            row.innerHTML = `
              <span class="edge-case-status ${ec.status}"></span>
              <span class="edge-case-input">${ec.input}</span>
              <span class="edge-case-arrow">→</span>
              <span class="edge-case-result">${ec.result}</span>
              <span class="edge-case-note">${ec.note}</span>
            `;
            ecList.appendChild(row);
          });
          ecList.classList.add('visible');
        };
      } else {
        ecBtn.classList.remove('visible');
      }

      // Live converter
      const converter = document.getElementById('bit-converter');
      const converterInput = document.getElementById('bit-converter-input');
      const converterBits = document.getElementById('bit-converter-bits');
      const converterInfo = document.getElementById('bit-converter-info');
      converter.classList.add('visible');
      converterInput.value = '';
      converterBits.innerHTML = '';
      converterInfo.textContent = '';
      converterInput.oninput = () => {
        const raw = converterInput.value.trim();
        if (!raw) {
          converterBits.innerHTML = '';
          converterInfo.textContent = '';
          return;
        }
        let num;
        if (raw.toLowerCase() === 'nan') num = NaN;
        else if (raw.toLowerCase() === 'inf' || raw.toLowerCase() === '+inf') num = Infinity;
        else if (raw.toLowerCase() === '-inf') num = -Infinity;
        else num = parseFloat(raw);

        if (raw !== '-' && raw !== '.' && isNaN(num) && raw.toLowerCase() !== 'nan') {
          converterBits.innerHTML = '';
          converterInfo.textContent = 'Enter a number, NaN, inf, or -inf';
          return;
        }
        const bitsStr = numberToBits(num, d.id);
        if (!bitsStr) return;
        renderBitPattern(bitsStr, layout.layout, converterBits);

        const decoded = getDecodedValue(bitsStr, d.id);
        if (decoded !== null) {
          const displayVal = typeof decoded === 'number' ? decoded.toPrecision(6) : decoded;
          converterInfo.textContent = `Stored as: ${displayVal}`;
        } else {
          converterInfo.textContent = '';
        }
      };

      panel.classList.add('visible');
    } else if (PROOF_REPLAYS[d.id]) {
      showProofReplay(d.id);
    } else if (d.pr) {
      window.open(`https://github.com/leanprover/TensorLib/pull/${d.pr}`, '_blank');
    }
  });

  // Simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = RADIUS[d.target.category] || 22;
        return d.target.x - (dx / dist) * r;
      })
      .attr('y2', d => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const r = RADIUS[d.target.category] || 22;
        return d.target.y - (dy / dist) * r;
      });

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Drag handlers
  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragging(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // Bit panel close
  document.getElementById('bit-panel-close').addEventListener('click', () => {
    document.getElementById('bit-panel').classList.remove('visible');
    document.getElementById('edge-cases-list').classList.remove('visible');
    document.getElementById('bit-panel-edge-cases').classList.remove('visible');
    document.getElementById('bit-converter').classList.remove('visible');
  });

  // PR timeline markers on the progress bar
  const markersEl = document.getElementById('pr-markers');
  PR_TIMELINE.forEach((pr, i) => {
    const position = ((i + 1) / (PR_TIMELINE.length + 1)) * 100;
    const marker = document.createElement('div');
    marker.className = 'pr-marker';
    marker.style.top = position + '%';
    marker.innerHTML = `<span class="pr-marker-label">#${pr.pr} ${pr.title} (${pr.date})</span>`;
    marker.addEventListener('click', () => {
      window.open(`https://github.com/leanprover/TensorLib/pull/${pr.pr}`, '_blank');
    });
    markersEl.appendChild(marker);
  });

  // Lambda scrubber — vertical time-travel slider
  const lambdaEl = document.getElementById('progress-lambda');
  const timestampEl = document.getElementById('progress-timestamp');
  const total = data.nodes.length;
  const complete = data.nodes.filter(n => n.status === 'complete').length;
  const maxPct = (complete / total) * 100;

  // Timeline order: topological sort respecting dependencies, then by status
  // Nodes with unresolved dependencies always come after their deps
  const depMap = {};
  data.edges.filter(e => e.type === 'depends').forEach(e => {
    const tid = e.target.id || e.target;
    const sid = e.source.id || e.source;
    if (!depMap[tid]) depMap[tid] = [];
    depMap[tid].push(sid);
  });

  function getDepth(id, visited = new Set()) {
    if (visited.has(id)) return 0;
    visited.add(id);
    const deps = depMap[id] || [];
    if (deps.length === 0) return 0;
    return 1 + Math.max(...deps.map(d => getDepth(d, visited)));
  }

  const timeline = [...data.nodes].sort((a, b) => {
    const statusOrder = { complete: 0, in_progress: 1, planned: 2 };
    const sa = statusOrder[a.status] || 3;
    const sb = statusOrder[b.status] || 3;
    if (sa !== sb) return sa - sb;
    // Within same status, sort by dependency depth (fewer deps first)
    return getDepth(a.id) - getDepth(b.id);
  });

  function getVisibleIdsAtPosition(yPct) {
    const effectivePct = Math.min(yPct, maxPct);
    const ratio = maxPct > 0 ? effectivePct / maxPct : 1;
    const count = Math.round(ratio * timeline.length);
    return new Set(timeline.slice(0, count).map(n => n.id));
  }

  function applyTimelineState(yPct) {
    const atMax = yPct >= maxPct - 0.5;
    const visibleIds = atMax ? new Set(data.nodes.map(n => n.id)) : getVisibleIdsAtPosition(yPct);

    node.classed('timeline-dimmed', n => !visibleIds.has(n.id));
    node.classed('timeline-visible', n => visibleIds.has(n.id));

    link.classed('timeline-dimmed', e => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      return !visibleIds.has(sid) || !visibleIds.has(tid);
    });
    link.classed('timeline-visible', e => {
      const sid = e.source.id || e.source;
      const tid = e.target.id || e.target;
      return visibleIds.has(sid) && visibleIds.has(tid);
    });

    if (!atMax) {
      const count = Math.round((Math.min(yPct, maxPct) / maxPct) * timeline.length);
      const visible = timeline.slice(0, count);
      const completeVisible = visible.filter(n => n.status === 'complete').length;
      const recent = visible.slice(-3).map(n => n.label.replace('\n', ' '));
      timestampEl.textContent = `${completeVisible}/${total} complete — ${recent.join(', ')}`;
      timestampEl.classList.add('visible');
    } else {
      timestampEl.classList.remove('visible');
    }
  }

  let lambdaDragging = false;

  const hintEl = document.getElementById('scrub-hint');

  lambdaEl.addEventListener('mouseenter', () => {
    if (!lambdaDragging) {
      hintEl.style.top = lambdaEl.style.top;
      hintEl.style.opacity = '1';
    }
  });

  lambdaEl.addEventListener('mouseleave', () => {
    hintEl.style.opacity = '0';
  });

  lambdaEl.addEventListener('mousedown', (e) => {
    lambdaDragging = true;
    hintEl.style.opacity = '0';
    e.preventDefault();
  });

  function getMaxY() {
    return getBarOffsets().top + (maxPct / 100) * getBarHeight();
  }

  function handleDragMove(clientY) {
    const offsets = getBarOffsets();
    const maxY = getMaxY();
    const y = Math.max(offsets.top, Math.min(maxY, clientY));
    lambdaEl.style.top = y + 'px';
    timestampEl.style.top = y + 'px';
    const yPct = ((y - offsets.top) / getBarHeight()) * 100;
    applyTimelineState(yPct);
  }

  function handleDragEnd() {
    if (lambdaDragging) {
      lambdaDragging = false;
      const offsets = getBarOffsets();
      const currentY = parseFloat(lambdaEl.style.top);
      const yPct = ((currentY - offsets.top) / getBarHeight()) * 100;
      if (yPct >= maxPct - 0.5) {
        applyTimelineState(maxPct);
      }
    }
  }

  window.addEventListener('mousemove', (e) => {
    if (!lambdaDragging) return;
    handleDragMove(e.clientY);
  });

  window.addEventListener('mouseup', handleDragEnd);

  // Touch support for lambda scrubber
  lambdaEl.addEventListener('touchstart', (e) => {
    lambdaDragging = true;
    hintEl.style.opacity = '0';
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (!lambdaDragging) return;
    handleDragMove(e.touches[0].clientY);
  });

  window.addEventListener('touchend', handleDragEnd);

  // Resize handler
  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    isMobile = w <= 768;
    RADIUS = computeRadius();

    svg.attr('width', w).attr('height', h);
    simulation.force('center', d3.forceCenter(w / 2, h / 2));
    simulation.force('link').distance(d => {
      const base = isMobile ? 50 : 115;
      const short = isMobile ? 40 : 90;
      return (d.type === 'proves' || d.type === 'depends') ? base : short;
    });
    simulation.force('charge').strength(isMobile ? -80 : -320);
    simulation.force('collision').radius(d => RADIUS[d.category] + (isMobile ? 6 : 16));
    simulation.force('x').strength(isMobile ? 0.12 : 0.04);
    simulation.force('y', d3.forceY(d => yTiers[d.category] * h).strength(isMobile ? 0.25 : 0.14));
    simulation.alpha(0.3).restart();

    const offsets = getBarOffsets();
    const barH = getBarHeight();
    const pct = (complete / total) * 100;
    lambdaEl.style.top = (offsets.top + pct / 100 * barH) + 'px';
  });
}

// Boot
init();
