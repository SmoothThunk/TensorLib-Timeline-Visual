// TensorLib Dtype Universe Visualization
// Fetches data.json and renders an interactive force-directed graph

const COLORS = {
  bool: '#66bb6a',
  integer: '#4fc3f7',
  float: '#ab47bc',
  theorem: '#ffd54f'
};

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
};

const PR_TIMELINE = [
  { pr: 92, title: "Float16 support", date: "2026-06" },
  { pr: 94, title: "BFloat16 support", date: "2026-07" },
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
  cast_roundtrip: "Casting any value to another dtype and back preserves the original.",
  bf16_roundtrip: "Encoding a UInt16 as BF16, decoding to Float32, and re-encoding gives the same bits.",
  fp16_roundtrip: "Encoding a UInt16 as FP16, decoding to Float32, and re-encoding gives the same bits.",
  add_commutative: "a + b == b + a for all bit patterns (including NaN and special values).",
  fp16_add_identity: "a + 0 == a for all non-NaN FP16 values (±0 excluded from byte equality).",
  self_cast_roundtrip: "Casting any value to its own dtype and back is always identity.",
  lossless_cast_roundtrip: "If lossless(from, to) holds, then cast(from→to→from) preserves the value.",
  cast_zero_one: "0 and 1 round-trip correctly between any two dtype pairs.",
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
};

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
  statsEl.innerHTML = `${complete}/${total} milestones complete &middot; ${provenTheorems}/${theorems.length} theorems proven &middot; <a href="https://github.com/leanprover/TensorLib" target="_blank" style="color:#64b5f6;text-decoration:none;">github.com/leanprover/TensorLib</a>`;

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
        .attr('fill', COLORS[d.category]);
    } else {
      g.append('circle')
        .attr('class', 'node-fill-bg')
        .attr('r', r)
        .attr('fill', COLORS[d.category]);
    }
  });

  // Progress fill
  node.each(function(d) {
    const g = d3.select(this);
    const r = RADIUS[d.category];
    const progress = d.status === 'complete' ? 1 :
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
        .attr('fill', COLORS[d.category])
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
        .attr('fill', COLORS[d.category])
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
        .attr('stroke', COLORS[d.category])
        .style('color', COLORS[d.category]);
    } else {
      g.append('circle')
        .attr('class', 'node-ring')
        .attr('r', r)
        .attr('stroke', COLORS[d.category])
        .style('color', COLORS[d.category]);
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

      panel.classList.add('visible');
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
