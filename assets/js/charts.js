/* Studio Track — tiny dependency-free SVG charts */
(function () {
  'use strict';

  var LIME = '#CBF24C', LIME_D = '#A9D31C', INK = '#14160F', GRID = '#EFEFE6', FAINT = '#A2A69A';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* vertical bars ------------------------------------------------------ */
  function bars(items, opt) {
    opt = opt || {};
    var W = 620, H = opt.height || 190;
    var padL = 30, padR = 10, padT = 22, padB = 28;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var step = max <= 10 ? 2 : max <= 40 ? 10 : 20;
    var top = Math.ceil(max / step) * step;
    var iw = W - padL - padR, ih = H - padT - padB;
    var bw = iw / items.length;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block" role="img">';

    for (var g = 0; g <= 4; g++) {
      var y = padT + ih * g / 4;
      s += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y + '" y2="' + y + '" stroke="' + GRID + '" stroke-width="1"/>';
      s += '<text x="' + (padL - 8) + '" y="' + (y + 3.5) + '" text-anchor="end" font-size="9" fill="' + FAINT + '">' + Math.round(top - top * g / 4) + '</text>';
    }
    items.forEach(function (it, i) {
      var h = Math.max(2, ih * (it.value / top));
      var x = padL + bw * i + bw * 0.24;
      var w = bw * 0.52;
      var y2 = padT + ih - h;
      var isLast = i === items.length - 1;
      s += '<rect x="' + x + '" y="' + y2 + '" width="' + w + '" height="' + h + '" rx="5" fill="' + (isLast ? LIME_D : '#E3E7D6') + '"/>';
      s += '<text x="' + (x + w / 2) + '" y="' + (y2 - 6) + '" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + (isLast ? INK : '#767A6E') + '">' + it.value + '</text>';
      s += '<text x="' + (x + w / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="' + (isLast ? INK : FAINT) + '">' + esc(it.short || it.label) + '</text>';
    });
    s += '</svg>';
    return s;
  }

  /* horizontal bars ---------------------------------------------------- */
  function hbars(items, opt) {
    opt = opt || {};
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var s = '<div style="display:flex;flex-direction:column;gap:11px">';
    items.forEach(function (it) {
      var pct = Math.round(it.value / max * 100);
      s += '<div style="display:flex;align-items:center;gap:10px">'
        + '<span style="font-size:11.5px;color:#3C3F35;width:' + (opt.labelWidth || 78) + 'px;flex:0 0 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(it.label) + '</span>'
        + '<span style="flex:1;height:8px;border-radius:99px;background:' + GRID + ';overflow:hidden"><i style="display:block;height:100%;width:' + pct + '%;border-radius:99px;background:' + (it.color || LIME_D) + '"></i></span>'
        + '<b style="font-size:11.5px;font-variant-numeric:tabular-nums;width:34px;text-align:right">' + esc(it.suffix ? it.value + it.suffix : it.value) + '</b>'
        + (it.note ? '<span style="font-size:10.5px;color:' + FAINT + ';width:38px;text-align:right">' + esc(it.note) + '</span>' : '')
        + '</div>';
    });
    return s + '</div>';
  }

  /* progress ring ------------------------------------------------------ */
  function ring(value, opt) {
    opt = opt || {};
    var size = opt.size || 76, sw = opt.stroke || 8;
    var r = (size - sw) / 2, c = 2 * Math.PI * r;
    var pct = value === null || value === undefined ? 0 : Math.max(0, Math.min(100, value));
    var off = c * (1 - pct / 100);
    var color = pct >= 100 ? '#8FC024' : pct >= 50 ? LIME_D : pct >= 25 ? '#D79B17' : '#CF3B3B';
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:' + size + 'px;height:' + size + 'px">'
      + '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + GRID + '" stroke-width="' + sw + '"/>'
      + '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + sw
      + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1)
      + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')" style="transition:stroke-dashoffset .6s"/>'
      + '</svg>';
  }

  /* sparkline ---------------------------------------------------------- */
  function spark(values, opt) {
    opt = opt || {};
    var w = opt.width || 96, h = opt.height || 34, p = 3;
    if (!values.length) return '';
    var max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    var span = max - min || 1;
    var pts = values.map(function (v, i) {
      var x = p + (w - p * 2) * (values.length === 1 ? .5 : i / (values.length - 1));
      var y = h - p - (h - p * 2) * ((v - min) / span);
      return [x, y];
    });
    var d = pts.map(function (pt, i) { return (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1); }).join(' ');
    var area = d + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + h + ' L' + pts[0][0].toFixed(1) + ' ' + h + ' Z';
    var id = 'sp' + Math.random().toString(36).slice(2, 7);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:' + w + 'px;height:' + h + 'px">'
      + '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="' + (opt.color || LIME_D) + '" stop-opacity=".28"/>'
      + '<stop offset="1" stop-color="' + (opt.color || LIME_D) + '" stop-opacity="0"/></linearGradient></defs>'
      + '<path d="' + area + '" fill="url(#' + id + ')"/>'
      + '<path d="' + d + '" fill="none" stroke="' + (opt.color || LIME_D) + '" stroke-width="1.8" stroke-linecap="round"/>'
      + '</svg>';
  }

  /* stacked distribution bar ------------------------------------------- */
  function stacked(bands) {
    var total = bands.reduce(function (a, b) { return a + b.n; }, 0) || 1;
    var colors = ['#E5766F', '#E7B33A', '#D9DE9E', '#B6D93F', '#8FC024'];
    var s = '<div style="display:flex;height:12px;border-radius:99px;overflow:hidden;background:' + GRID + '">';
    bands.forEach(function (b, i) {
      if (!b.n) return;
      s += '<i style="display:block;width:' + (b.n / total * 100) + '%;background:' + colors[i] + '" title="' + esc(b.label) + ': ' + b.n + '"></i>';
    });
    s += '</div><div class="legend">';
    bands.forEach(function (b, i) {
      s += '<span><i style="background:' + colors[i] + '"></i>' + esc(b.label) + ' · <b style="color:#3C3F35">' + b.n + '</b></span>';
    });
    s += '</div>';
    return s;
  }

  window.Charts = { bars: bars, hbars: hbars, ring: ring, spark: spark, stacked: stacked };
})();
