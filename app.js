"use strict";
/* ==========================================================
   Validación Cruzada · Presentación interactiva
   Lógica de navegación + laboratorios
   ========================================================== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pct = v => (isFinite(v) ? v.toFixed(1) : "0.0") + "%";
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(v => (v - m) * (v - m)))); };
const fmt = (n, d) => n.toFixed(d === undefined ? 1 : d);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function rng(seed) { let s = (seed >>> 0) || 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function paintSlider(el) {
  if (!el) return;
  el.style.setProperty("--fill", ((el.value - el.min) / (el.max - el.min) * 100) + "%");
  const n = el.parentNode && el.parentNode.querySelector("input.num");
  if (n && document.activeElement !== n) n.value = el.value;
}

/* Resaltado de sintaxis Python — una sola pasada para no romper el HTML generado */
const PY_RE = /(#[^\n]*)|("""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(def|return|for|in|if|elif|else|import|from|as|print|with|True|False|None|not|and|or|class)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)(?=\()/g;
function hl(code) {
  return esc(code).replace(PY_RE, (m, c, s, k, n, f) => {
    if (c) return '<span class="c">' + c + "</span>";
    if (s) return '<span class="s">' + s + "</span>";
    if (k) return '<span class="k">' + k + "</span>";
    if (n) return '<span class="n">' + n + "</span>";
    if (f) return '<span class="f">' + f + "</span>";
    return m;
  });
}
/* ---------- Cajas numéricas editables junto a cada deslizador ---------- */
function editableNumbers(root) {
  $$(".ctrl", root || document).forEach(ctrl => {
    const r = $("input[type=range]", ctrl), o = $("output", ctrl);
    if (!r || !o || o.parentNode.querySelector("input.num")) return;
    const n = document.createElement("input");
    n.type = "number"; n.className = "num"; n.min = r.min; n.max = r.max; n.step = r.step || 1;
    n.value = r.value;
    n.title = "Escribí el valor o usá las flechas del teclado";
    n.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); n.blur(); go(idx + 1); }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const d = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 1) * (+n.step || 1);
        n.value = clamp((+n.value || 0) + d, +r.min, +r.max);
        r.value = n.value; r.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    n.addEventListener("input", () => {
      if (n.value === "" || !isFinite(+n.value)) return;
      r.value = clamp(+n.value, +r.min, +r.max);
      r.dispatchEvent(new Event("input", { bubbles: true }));
    });
    n.addEventListener("blur", () => { n.value = r.value; });
    r.addEventListener("input", () => { if (document.activeElement !== n) n.value = r.value; });
    const g = document.createElement("span");
    g.className = "vpair";
    o.after(g); g.appendChild(o); g.appendChild(n);
  });
}
function copyText(txt, btn) {
  const ok = () => { if (btn) { const o = btn.getAttribute("data-label") || btn.textContent; btn.setAttribute("data-label", o); btn.textContent = "¡Copiado!"; setTimeout(() => btn.textContent = o, 1400); } };
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); ok(); } catch (e) { }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok).catch(fallback);
  else fallback();
}

/* ==========================================================
   Navegación
   ========================================================== */
const slides = $$(".slide");
let idx = 0;
const segsBox = $("#progressSegs"), fill = $("#progressFill");
slides.forEach(() => segsBox.appendChild(document.createElement("i")));
const segEls = $$("#progressSegs i");
$("#cntAll").textContent = slides.length;

const idxList = $("#idxList");
slides.forEach((s, i) => {
  const b = document.createElement("button");
  b.className = "idx-item";
  b.innerHTML = "<b>" + String(i + 1).padStart(2, "0") + "</b><span>" + s.dataset.title + "</span>";
  b.onclick = () => { closeOverlays(); go(i); };
  idxList.appendChild(b);
});

function go(i) {
  i = clamp(i, 0, slides.length - 1);
  slides[idx].classList.remove("is-active");
  idx = i;
  slides[idx].classList.add("is-active");
  slides[idx].scrollTop = 0;
  const n = idx + 1;
  $("#cntNow").textContent = n;
  fill.style.width = (n / slides.length * 100) + "%";
  segEls.forEach((e, j) => e.classList.toggle("on", j <= idx));
  $$(".idx-item", idxList).forEach((e, j) => e.classList.toggle("on", j === idx));
  $("#btnPrev").disabled = idx === 0;
  $("#btnNext").disabled = idx === slides.length - 1;
  try { history.replaceState(null, "", "#" + n); } catch (e) { }
  onEnter(idx);
}
const nextSlide = () => go(idx + 1), prevSlide = () => go(idx - 1);
$("#btnNext").onclick = nextSlide;
$("#btnPrev").onclick = prevSlide;
$("#btnIdx").onclick = () => $("#idxOverlay").classList.toggle("on");
$("#btnHelp").onclick = () => $("#helpOverlay").classList.toggle("on");
$("#btnFull").onclick = () => {
  if (!document.fullscreenElement) { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }
  else if (document.exitFullscreen) document.exitFullscreen();
};
function closeOverlays() { $$(".overlay").forEach(o => o.classList.remove("on")); }
$$(".overlay").forEach(o => o.onclick = e => { if (e.target === o) closeOverlays(); });

document.addEventListener("keydown", e => {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") { if (e.key === "Escape") e.target.blur(); return; }
  switch (e.key) {
    case "ArrowRight": case "ArrowDown": case "PageDown": case " ": e.preventDefault(); nextSlide(); break;
    case "ArrowLeft": case "ArrowUp": case "PageUp": e.preventDefault(); prevSlide(); break;
    case "Home": e.preventDefault(); go(0); break;
    case "End": e.preventDefault(); go(slides.length - 1); break;
    case "o": case "O": $("#idxOverlay").classList.toggle("on"); break;
    case "?": case "h": case "H": $("#helpOverlay").classList.toggle("on"); break;
    case "f": case "F": $("#btnFull").click(); break;
    case "Escape": closeOverlays(); break;
    default: if (/^[1-9]$/.test(e.key)) go(parseInt(e.key, 10) - 1);
  }
});
let tx0 = 0, ty0 = 0;
document.addEventListener("touchstart", e => { tx0 = e.changedTouches[0].clientX; ty0 = e.changedTouches[0].clientY; }, { passive: true });
document.addEventListener("touchend", e => {
  const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) { if (dx < 0) nextSlide(); else prevSlide(); }
}, { passive: true });

/* ==========================================================
   Render de folds (compartido por varias secciones)
   ========================================================== */
function buildClasses(n, seed) {
  const r = rng(seed), a = new Array(n);
  for (let i = 0; i < n; i++) a[i] = r() < 0.4 ? 1 : 0;
  return a;
}
function splitFolds(n, k, seed, strat) {
  const r = rng(seed), cls = buildClasses(n, seed);
  const folds = Array.from({ length: k }, () => []);
  if (strat) {
    const pos = [], neg = [];
    cls.forEach((c, i) => (c ? pos : neg).push(i));
    pos.forEach((v, j) => folds[j % k].push(v));
    neg.forEach((v, j) => folds[j % k].push(v));
    folds.forEach(f => f.sort((a, b) => a - b));
  } else {
    const order = cls.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    order.forEach((v, j) => folds[Math.floor(j * k / n)].push(v));
  }
  return folds.map(f => f.map(i => cls[i]));
}
function renderFolds(el, o) {
  const folds = splitFolds(o.n, o.k, o.seed, o.strat);
  el.innerHTML = folds.map((f, i) => {
    const isTest = o.active && o.active.test === i;
    const isTrain = o.active && o.active.train.indexOf(i) > -1;
    const body = f.length <= 26
      ? '<div class="cells">' + f.map(c => '<i class="cell' + (c ? " pos" : "") + '"></i>').join("") + "</div>"
      : '<div class="stripes"></div>';
    const posPct = Math.round(f.filter(Boolean).length / f.length * 100);
    return '<div class="fold ' + (isTest ? "test" : isTrain ? "train" : "") + '">' +
      '<div class="fname"><span>Fold ' + (i + 1) + "</span><em>" + f.length + " obs · " + posPct + "% pos</em></div>" +
      body + "</div>";
  }).join("");
  return folds.map(f => f.filter(Boolean).length / f.length);
}

/* ==========================================================
   Sección 2 · Diagnóstico train vs CV
   ========================================================== */
const gT = $("#gapTrain"), gC = $("#gapCv");
function gapUpdate() {
  const t = +gT.value, c = +gC.value, d = t - c;
  $("#gapTrainOut").textContent = t + "%";
  $("#gapCvOut").textContent = c + "%";
  $("#gapBarTrain").style.width = t + "%";
  $("#gapBarCv").style.width = c + "%";
  $("#gapBarTrainV").textContent = t + "%";
  $("#gapBarCvV").textContent = c + "%";
  const v = $("#gapVerdict");
  if (d >= 8) {
    v.className = "note ember";
    v.innerHTML = "<strong>Sobreajuste (overfitting).</strong> Brecha de <em>" + d + " puntos</em>: el modelo memorizó el entrenamiento y perdió capacidad predictiva. Solución: más regularización, menos complejidad o más datos.";
  } else if (d <= 2 && t < 70) {
    v.className = "note copper";
    v.innerHTML = "<strong>Subajuste (underfitting).</strong> Train " + t + "% y CV " + c + "%: poco rendimiento en ambos. Solución: modelo más complejo, más features o menos regularización.";
  } else if (d <= 3) {
    v.className = "note gold";
    v.innerHTML = "<strong>Equilibrado.</strong> Brecha de sólo " + d + " punto" + (d === 1 ? "" : "s") + ": el modelo generaliza. Reportá <code>media ± σ</code> sobre los folds.";
  } else {
    v.className = "note copper";
    v.innerHTML = "<strong>Zona intermedia (brecha de " + d + " pts).</strong> Hay sobreajuste leve: conviene ajustar la regularización o el tamaño del modelo y volver a medir.";
  }
}
[gT, gC].forEach(el => { paintSlider(el); el.addEventListener("input", gapUpdate); });
$$("[data-preset]").forEach(b => b.onclick = () => {
  const a = b.dataset.preset.split(",");
  gT.value = a[0]; gC.value = a[1];
  paintSlider(gT); paintSlider(gC); gapUpdate();
});

/* ==========================================================
   Sección 3 · Ciclo animado
   ========================================================== */
const loopFolds = $("#loopFolds");
let loopStep = 0, loopTimer = null, loopOn = true;
function loopRender() {
  renderFolds(loopFolds, {
    n: 100, k: 5, seed: 7, strat: true,
    active: { test: loopStep, train: [0, 1, 2, 3, 4].filter(i => i !== loopStep) }
  });
  $("#loopStep").textContent = "Iteración " + (loopStep + 1) + " de 5 · prueba: Fold " + (loopStep + 1);
}
function loopStart() { if (loopOn && !loopTimer) loopTimer = setInterval(() => { loopStep = (loopStep + 1) % 5; loopRender(); }, 1700); }
function loopStop() { clearInterval(loopTimer); loopTimer = null; }
$("#loopToggle").onclick = () => {
  loopOn = !loopOn;
  $("#loopToggle").textContent = loopOn ? "Pausar" : "Reanudar";
  if (loopOn) loopStart(); else loopStop();
};
$("#loopNext").onclick = () => { loopStep = (loopStep + 1) % 5; loopRender(); };
$("#loopPrev").onclick = () => { loopStep = (loopStep + 4) % 5; loopRender(); };

/* ==========================================================
   Sección 4 · Laboratorio K-Fold
   ========================================================== */
const labK = $("#labK"), labN = $("#labN"), labStrat = $("#labStrat");
const lab = { step: 0, timer: null };
function labUpdate() {
  const k = +labK.value, n = +labN.value, strat = labStrat.checked;
  const train = Array.from({ length: k }, (_, i) => i).filter(i => i !== lab.step);
  paintSlider(labK); paintSlider(labN);
  $("#labKOut").textContent = k;
  $("#labNOut").textContent = n + " obs.";
  $("#labNInline").textContent = n;
  $("#labTrainPct").textContent = Math.round((k - 1) / k * 100) + "%";
  $("#labTestN").textContent = Math.round(n / k);
  $("#labEvals").textContent = k;
  $("#labIterLbl").textContent = "· iteración " + (lab.step + 1) + " de " + k;
  const props = renderFolds($("#labFolds"), { n: n, k: k, seed: 11, strat: strat, active: { test: lab.step, train: train } });
  const dev = (Math.max.apply(null, props) - Math.min.apply(null, props)) * 100;
  const w = $("#labWarn");
  if (strat) {
    w.className = "note gold";
    w.innerHTML = "<strong>Stratified K-Fold activo:</strong> cada fold conserva la proporción global de aprobaciones (~40%). Imprescindible con clases desbalanceadas. Dispersión entre folds: <em>" + dev.toFixed(1) + " pts</em>.";
  } else {
    w.className = "note " + (dev > 12 ? "ember" : "copper");
    w.innerHTML = "<strong>K-Fold estándar:</strong> la proporción de positivos varía entre folds (dispersión de <em>" + dev.toFixed(1) + " pts</em>). " +
      (dev > 12 ? "Un fold queda claramente sesgado: <strong>usá Stratified K-Fold</strong>." : "Con muchas observaciones el efecto se atenúa, pero el sesgo sigue presente.");
  }
  const size = Math.round(n / k);
  let html = "";
  for (let i = 0; i < k; i++) {
    html += '<tr class="' + (i === lab.step ? "act" : "") + '"><td>Iteración ' + (i + 1) + "</td><td class='mono'>" +
      Array.from({ length: k }, (_, j) => j).filter(j => j !== i).map(j => "F" + (j + 1)).join(", ") +
      " <span style='color:var(--dim)'>(" + ((k - 1) * size) + " obs.)</span></td><td class='mono'>F" + (i + 1) +
      " <span style='color:var(--dim)'>(" + size + " obs.)</span></td></tr>";
  }
  $("#labTable").tBodies[0].innerHTML = html;
}
[labK, labN].forEach(el => el.addEventListener("input", () => { lab.step = Math.min(lab.step, +labK.value - 1); labUpdate(); }));
labStrat.addEventListener("change", labUpdate);
$("#labNext").onclick = () => { lab.step = (lab.step + 1) % (+labK.value); labUpdate(); };
$("#labPrev").onclick = () => { lab.step = (lab.step - 1 + (+labK.value)) % (+labK.value); labUpdate(); };
$("#labPlay").onclick = () => {
  if (lab.timer) { clearInterval(lab.timer); lab.timer = null; $("#labPlay").textContent = "▶ auto"; }
  else { lab.timer = setInterval(() => { lab.step = (lab.step + 1) % (+labK.value); labUpdate(); }, 1500); $("#labPlay").textContent = "⏸ auto"; }
};

/* ==========================================================
   Sección 5 · Ejemplo de los 100 estudiantes
   ========================================================== */
const exVals = [88, 92, 90, 91, 89], exSliders = $("#exSliders");
exVals.forEach((v, i) => {
  const d = document.createElement("div");
  d.className = "ctrl";
  d.innerHTML = '<div class="ctrl-top"><label>Accuracy fold ' + (i + 1) + "</label><output>" + v + "%</output></div>" +
    '<input type="range" min="40" max="100" step="1" value="' + v + '" class="' + (i % 2 ? "gold" : "clay") + '">';
  exSliders.appendChild(d);
  paintSlider(d.querySelector("input"));
  d.querySelector("input").addEventListener("input", exUpdate);
});
function exUpdate() {
  const vals = $$("input", exSliders).map(i => +i.value);
  $$("output", exSliders).forEach((o, i) => o.textContent = vals[i] + "%");
  $$("input", exSliders).forEach(paintSlider);
  const m = mean(vals), s = std(vals);
  $("#exMean").textContent = fmt(m) + "%";
  $("#exStd").textContent = "±" + fmt(s) + "%";
  $("#exRange").textContent = Math.min.apply(null, vals) + "–" + Math.max.apply(null, vals);
  const v = $("#exVerdict");
  if (s <= 2) { v.className = "note gold"; v.innerHTML = "<strong>Estable.</strong> σ = ±" + fmt(s) + ": el modelo rinde igual en cualquier grupo de estudiantes. El <strong>" + fmt(m) + "%</strong> es un número en el que podés confiar."; }
  else if (s <= 5) { v.className = "note"; v.innerHTML = "<strong>Aceptable.</strong> σ = ±" + fmt(s) + ": hay variaciones entre grupos. Conviene reportar el rango " + Math.min.apply(null, vals) + "%–" + Math.max.apply(null, vals) + "%."; }
  else { v.className = "note ember"; v.innerHTML = "<strong>Inestable.</strong> σ = ±" + fmt(s) + ": el resultado depende mucho del grupo evaluado. Revisá el preprocesamiento y la estratificación."; }
  renderFolds($("#exFolds"), { n: 100, k: 5, seed: 3, strat: true, active: { test: 0, train: [1, 2, 3, 4] } });
}

/* ==========================================================
   Sección 6 · Estabilidad entre folds
   ========================================================== */
const stDefA = [90, 91, 89, 90, 91], stDefB = [65, 98, 74, 93, 81];
function stBuild(box, vals, cls) {
  box.innerHTML = "";
  vals.forEach((v, i) => {
    const d = document.createElement("div");
    d.className = "ctrl";
    d.style.marginBottom = ".25em";
    d.innerHTML = '<div class="ctrl-top"><label>Fold ' + (i + 1) + "</label><output>" + v + "%</output></div>" +
      '<input type="range" min="50" max="100" step="1" value="' + v + '" class="' + cls + '">';
    box.appendChild(d);
    paintSlider(d.querySelector("input"));
    d.querySelector("input").addEventListener("input", () => {
      paintSlider(d.querySelector("input"));
      stUpdate();
    });
  });
}
function stChart(box, vals, color) {
  const m = mean(vals), s = std(vals);
  const W = 210, base = 70, top = 14, x0 = 10, bw = 28, gap = 11;
  const y = v => base - (v - 40) / 60 * (base - top);
  let g = '<svg class="scg2" viewBox="0 0 ' + W + " 88" + '" preserveAspectRatio="xMidYMid meet" role="img">';
  [50, 70, 90].forEach(v => {
    g += '<line x1="' + x0 + '" y1="' + y(v).toFixed(1) + '" x2="' + (W - 4) + '" y2="' + y(v).toFixed(1) + '" stroke="rgba(255,255,255,.08)"/>' +
      '<text x="' + (x0 - 3) + '" y="' + (y(v) + 3).toFixed(1) + '" text-anchor="end" font-size="7" fill="var(--dim)">' + v + "</text>";
  });
  vals.forEach((v, i) => {
    const x = x0 + i * (bw + gap), yy = y(v);
    g += '<rect x="' + x + '" y="' + yy.toFixed(1) + '" width="' + bw + '" height="' + (base - yy).toFixed(1) + '" rx="4" fill="' + color + '" opacity=".82"/>' +
      '<text x="' + (x + bw / 2) + '" y="' + (base + 12) + '" text-anchor="middle" font-size="8" font-weight="700" fill="var(--muted)">F' + (i + 1) + "</text>";
  });
  g += '<line x1="' + x0 + '" y1="' + y(m).toFixed(1) + '" x2="' + (W - 4) + '" y2="' + y(m).toFixed(1) + '" stroke="var(--ambar)" stroke-width="1.8" stroke-dasharray="5 3"/>';
  g += "</svg>";
  g += '<div class="foot" style="margin-top:.1em">media <strong style="color:var(--ambar)">' + fmt(m) + "%</strong> · σ ±" + fmt(s) +
    " · rango " + Math.min.apply(null, vals) + "–" + Math.max.apply(null, vals) + "</div>";
  box.innerHTML = g;
}
function stVerdict(el, m, s, label) {
  const cv = s / m * 100;
  el.className = "note " + (s <= 2 ? "gold" : s <= 5 ? "" : "ember");
  el.innerHTML = "<strong>" + label + "</strong> — media " + fmt(m) + "%, σ ±" + fmt(s) + " (" + fmt(cv) + "% de coeficiente de variación). " +
    (s <= 2 ? "Alta fiabilidad en producción y baja sensibilidad a las variaciones muestrales."
      : s <= 5 ? "Aceptable para producción."
        : "Alta sensibilidad a la muestra: riesgo significativo de comportamientos anómalos.");
}
function stUpdate() {
  const a = $$("#stSlidersA input").map(i => +i.value), b = $$("#stSlidersB input").map(i => +i.value);
  $$("#stSlidersA output").forEach((o, i) => o.textContent = a[i] + "%");
  $$("#stSlidersB output").forEach((o, i) => o.textContent = b[i] + "%");
  $$("#stSlidersA input").forEach(paintSlider);
  $$("#stSlidersB input").forEach(paintSlider);
  stChart($("#stChartA"), a, "var(--ambar)");
  stChart($("#stChartB"), b, "var(--brasa)");
  $("#stMeanA").textContent = fmt(mean(a)) + "%";
  $("#stSdA").textContent = "±" + fmt(std(a));
  $("#stMeanB").textContent = fmt(mean(b)) + "%";
  $("#stSdB").textContent = "±" + fmt(std(b));
  stVerdict($("#stVerdictA"), mean(a), std(a), "Modelo A");
  stVerdict($("#stVerdictB"), mean(b), std(b), "Modelo B");
}
stBuild($("#stSlidersA"), stDefA, "gold");
stBuild($("#stSlidersB"), stDefB, "ember");
$("#stReset").onclick = () => {
  $$("#stSlidersA input").forEach((el, i) => { el.value = stDefA[i]; paintSlider(el); });
  $$("#stSlidersB input").forEach((el, i) => { el.value = stDefB[i]; paintSlider(el); });
  stUpdate();
};
$("#stEqualize").onclick = () => {
  $$("#stSlidersA input, #stSlidersB input").forEach(el => { el.value = 90; paintSlider(el); });
  stUpdate();
};

/* ==========================================================
   Sección 7 · Estrategias (con diagrama por técnica)
   ========================================================== */
const STRATS = [
  { n: "Hold-Out", d: "Partición fija, ej. 80/20", p: "Rápido y simple de implementar", m: "Muy sensible a la partición elegida", u: "Exploración inicial, prototipos o datasets enormes", c: "El fold de prueba es siempre el mismo: si ese grupo fue fácil, el score queda inflado y no se puede repetir con otra partición." },
  { n: "K-Fold", d: "K bloques iguales", p: "Aprovecha todos los datos; k es flexible", m: "Requiere K entrenamientos (costo × k)", u: "El estándar por defecto en clasificación", c: "Cada bloque se usa una vez como prueba (fila 1: Fold 1, fila 2: Fold 2). Tras k iteraciones, todas las observaciones fueron evaluadas exactamente una vez." },
  { n: "Stratified K-Fold", d: "Mantiene la proporción de clases", p: "Ideal para clases desbalanceadas", m: "Diseñado exclusivamente para clasificación", u: "Clasificación con desbalanceo (fraude, raras clases)", c: "Mismo patrón de clases en cada bloque: la proporción de positivos se mantiene (~40%), así ningún fold queda sesgado." },
  { n: "Leave One Out", d: "K = N, una observación por fold", p: "Sesgo mínimo, usa cada dato como prueba", m: "Costo computacional muy alto (N modelos)", u: "Datasets chicos (n menor a ~200) o regresión", c: "Cada fold contiene una sola observación: N iteraciones. Todos los modelos comparten (N−2)/(N−1) de los datos, por eso la varianza de la estimación es altísima." },
  { n: "Repeated K-Fold", d: "K-Fold con distintas semillas", p: "Reduce la variabilidad de la estimación", m: "Multiplica el costo computacional", u: "Resultados sensibles al azar o búsqueda de hiperparámetros", c: "Se repiten las k particiones con semillas aleatorias distintas (fila 1 y fila 2 resaltan folds diferentes): la media de todas las repeticiones es más estable." },
  { n: "Time Series Split", d: "Avance temporal (walk-forward)", p: "Evita fugas temporales (Data Leakage)", m: "Menos datos de entrenamiento en los primeros folds", u: "Series de tiempo: nunca se mira al futuro", c: "Cada fila crece hacia la derecha: se entrena con todo el pasado y se evalúa el bloque siguiente. El futuro (bloques apagados) jamás se usa para entrenar." },
  { n: "Group K-Fold", d: "Un grupo nunca se parte entre folds", p: "Correcto con datos agrupados o repetidos", m: "Requiere una variable grupal identificadora", u: "Pacientes, usuarios, mediciones repetidas", c: "Las tres observaciones del mismo grupo (mismo color) se quedan juntas: el grupo resaltado es test completo y nunca se divide entre train y test." }
];
/* Mini-gráficos: cada técnica con su propio diagrama de particionado */
const VI = "var(--terracota)", CY = "var(--ambar)";
function rc(x, y, w, h, fill, op) {
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2.5" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : "") + "/>";
}
const STRAT_VIS = [
  /* Hold-Out: una única partición fija */
  function () { return rc(6, 24, 150, 20, VI, ".5") + rc(156, 24, 38, 20, CY); },
  /* K-Fold: dos iteraciones, el test rota de fold */
  function () {
    let s = "", bw = 35;
    for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++)
      s += rc(6 + i * (bw + 3), r === 0 ? 14 : 40, bw, 18, i === r ? CY : VI, i === r ? null : ".5");
    return s;
  },
  /* Stratified: mismo patrón de clases en cada fold */
  function () {
    let s = "";
    for (let f = 0; f < 5; f++) for (let c = 0; c < 10; c++)
      s += rc(6 + f * 38 + c * 3.5, 24, 3.2, 20, c % 5 < 2 ? CY : VI, c % 5 < 2 ? null : ".5");
    return s;
  },
  /* LOOCV: una observación por fold */
  function () {
    let s = "", cw = 13;
    [[0, 3], [1, 9]].forEach(p => {
      for (let i = 0; i < 12; i++) s += rc(6 + i * (cw + 2), p[0] === 0 ? 14 : 40, cw, 18, i === p[1] ? CY : VI, i === p[1] ? null : ".45");
    });
    return s;
  },
  /* Repeated K-Fold: mismas k particiones, semillas distintas */
  function () {
    let s = "", bw = 35;
    for (let i = 0; i < 5; i++) s += rc(6 + i * (bw + 3), 14, bw, 18, i === 2 ? CY : VI, i === 2 ? null : ".5");
    for (let i = 0; i < 5; i++) s += rc(6 + i * (bw + 3), 40, bw, 18, i === 4 ? CY : VI, i === 4 ? null : ".5");
    return s;
  },
  /* Time Series Split: ventana creciente, nunca el futuro */
  function () {
    let s = "", bw = 29;
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++)
      s += rc(6 + i * (bw + 2), 6 + row * 20, bw, 14, i === row ? CY : VI, i === row ? null : (i < row ? ".45" : ".14"));
    return s;
  },
  /* Group K-Fold: el grupo entero pasa a test */
  function () {
    let s = "";
    for (let g = 0; g < 3; g++) for (let c = 0; c < 3; c++)
      s += rc(6 + g * 64 + c * 21, 24, 18, 20, g === 0 ? CY : VI, g === 0 ? null : ".5");
    return s;
  }
];
const stratGrid = $("#stratGrid");
STRATS.forEach((s, i) => {
  const d = document.createElement("div");
  d.className = "sc" + (i === 1 ? " on" : "");
  d.innerHTML = '<div class="n"><b>' + String(i + 1).padStart(2, "0") + "</b>" + s.n + "</div>" +
    '<svg class="scg" viewBox="0 0 200 64" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Diagrama de ' + s.n + '">' + STRAT_VIS[i]() + "</svg>" +
    '<div class="d">' + s.d + "</div>";
  d.onclick = () => {
    $$(".sc", stratGrid).forEach(x => x.classList.remove("on"));
    d.classList.add("on");
    stratDetail(i);
  };
  stratGrid.appendChild(d);
});
function stratDetail(i) {
  const s = STRATS[i];
  $("#stratDetail").innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">' +
    '<h3 style="margin:0">' + s.n + ' <span class="badge b-clay" style="vertical-align:middle">' + s.d + "</span></h3>" +
    '<span class="badge b-gold">Cuándo usarlo</span></div>' +
    '<div class="split g-1-2" style="gap:18px;align-items:center">' +
    '<svg class="scg" style="margin:0" viewBox="0 0 200 64" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Diagrama de ' + s.n + '">' + STRAT_VIS[i]() + "</svg>" +
    '<div class="grid" style="gap:8px">' +
    '<div class="grid g3">' +
    '<div class="note gold"><strong>(+) Ventaja</strong><br>' + s.p + "</div>" +
    '<div class="note ember"><strong>(−) Limitación</strong><br>' + s.m + "</div>" +
    '<div class="note copper"><strong>Casos de uso</strong><br>' + s.u + "</div></div>" +
    '<div class="note"><strong>Qué muestra el gráfico:</strong> ' + s.c + "</div></div></div>";
}
stratDetail(1);

/* ==========================================================
   Sección 8 · Métricas
   ========================================================== */
const mi = { tp: $("#tp"), fp: $("#fp"), fn: $("#fn"), tn: $("#tn") };
function metricUpdate() {
  const tp = +mi.tp.value, fp = +mi.fp.value, fn = +mi.fn.value, tn = +mi.tn.value;
  $("#tpOut").textContent = tp; $("#fpOut").textContent = fp;
  $("#fnOut").textContent = fn; $("#tnOut").textContent = tn;
  Object.keys(mi).forEach(k => paintSlider(mi[k]));
  const tot = tp + fp + fn + tn || 1;
  const acc = (tp + tn) / tot;
  const pre = (tp + fp) ? tp / (tp + fp) : 0;
  const rec = (tp + fn) ? tp / (tp + fn) : 0;
  const f1 = (pre + rec) ? 2 * pre * rec / (pre + rec) : 0;
  $("#cmGrid").innerHTML =
    '<div class="hd"></div><div class="hd">Predice +</div><div class="hd">Predice −</div>' +
    '<div class="hd v">Real +</div>' +
    '<div class="cellbox tp"><div class="n">' + tp + '</div><div class="t">VP · acierto</div></div>' +
    '<div class="cellbox fn"><div class="n">' + fn + '</div><div class="t">FN · falso negativo</div></div>' +
    '<div class="hd v">Real −</div>' +
    '<div class="cellbox fp"><div class="n">' + fp + '</div><div class="t">FP · falso positivo</div></div>' +
    '<div class="cellbox tn"><div class="n">' + tn + '</div><div class="t">VN · acierto</div></div>';
  const bars = [["Accuracy", acc, "var(--ambar)"], ["Precision", pre, "var(--terracota)"], ["Recall", rec, "var(--cobre)"], ["F1-score", f1, "var(--brasa)"]];
  $("#metricBars").innerHTML = bars.map(b =>
    '<div class="bar"><span class="nm">' + b[0] + '</span><span class="track"><i class="fill" style="width:' + (b[1] * 100).toFixed(1) +
    "%;background:linear-gradient(90deg," + b[2] + ",rgba(255,255,255,.4))\"></i></span><span class=\"val\" style=\"color:" + b[2] + '">' + pct(b[1] * 100) + "</span></div>"
  ).join("");
  const posReal = tp + fn, recReal = posReal ? tp / posReal : 0;
  const n = $("#metricNote");
  let msg, cls = "note gold";
  if (rec >= .9 && pre >= .8) { msg = "<strong>Excelente equilibrio.</strong> Alta cobertura y alta precisión: el modelo sirve para automatizar la decisión."; }
  else if (rec >= .85 && pre < .7) { msg = "<strong>Prioriza cobertura (Recall " + pct(rec * 100) + ").</strong> Casi no se le escapa un positivo, a costa de falsos positivos. Típico en <em>fraude o diagnóstico médico</em>: preferís avisar de más."; cls = "note copper"; }
  else if (pre >= .85 && rec < .7) { msg = "<strong>Prioriza precisión (Precision " + pct(pre * 100) + ").</strong> Cuando dice que sí, acierta, pero se le escapan positivos reales. Típico en <em>recomendaciones o filtrado de spam</em>."; }
  else if (acc > .9 && recReal < .3) { msg = "<strong>Accuracy engañosa.</strong> Accuracy " + pct(acc * 100) + " pero sólo " + pct(recReal * 100) + " de los positivos reales se detectan: el desbalanceo de clases infla la métrica. Usá F1, recall o ROC-AUC."; cls = "note ember"; }
  else { msg = "<strong>Rendimiento moderado.</strong> Revisá el balance entre precisión y recall según el costo de cada tipo de error."; cls = "note"; }
  n.className = cls; n.innerHTML = msg;
}
Object.keys(mi).forEach(k => mi[k].addEventListener("input", metricUpdate));
$$("[data-cpreset]").forEach(b => b.onclick = () => {
  const p = b.dataset.cpreset.split(",");
  mi.tp.value = p[0]; mi.fp.value = p[1]; mi.fn.value = p[2]; mi.tn.value = p[3];
  metricUpdate();
});

/* ==========================================================
   Sección 9 · Compromiso sesgo–varianza
   ========================================================== */
const bvK = $("#bvK");
const P_BIAS = [[2, .55], [3, .46], [4, .40], [5, .355], [6, .325], [7, .30], [8, .285], [10, .265], [12, .25], [15, .238], [20, .225]];
const P_VAR = [[2, .17], [3, .255], [4, .325], [5, .385], [6, .435], [7, .475], [8, .51], [10, .57], [12, .615], [15, .665], [20, .715]];
const P_TOT = [[2, .72], [3, .715], [4, .725], [5, .74], [6, .76], [7, .775], [8, .79], [9, .80], [10, .805], [12, .815], [15, .83], [20, .85]];
function interp(pts, x) {
  if (x <= pts[0][0]) return pts[0][1];
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) {
      const a = pts[i - 1], b = pts[i];
      return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
  }
}
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + "," +
      (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + "," +
      p2[0].toFixed(1) + " " + p2[1].toFixed(1);
  }
  return d;
}
function bvDraw() {
  const k = +bvK.value, W = 720, H = 320, L = 46, R = 18, T = 18, B = 40;
  const X = v => L + (v - 1) / 19 * (W - L - R);
  const Y = v => T + (1 - v) * (H - T - B);
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const v = i / 4;
    g += '<line class="grid-l" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - R) + '" y2="' + Y(v).toFixed(1) + '"/>' +
      '<text x="' + (L - 8) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + Math.round(v * 100) + "%</text>";
  }
  g += '<rect x="' + X(5).toFixed(1) + '" y="' + T + '" width="' + (X(10) - X(5)).toFixed(1) + '" height="' + (H - T - B) +
    '" fill="rgba(226,98,15,.1)" stroke="rgba(226,98,15,.34)" stroke-dasharray="4 4"/>';
  g += '<text class="strong" x="' + ((X(5) + X(10)) / 2).toFixed(1) + '" y="' + (T + 13) + '" text-anchor="middle" fill="var(--terracota)">zona 5–10</text>';
  for (let v = 2; v <= 20; v += 2) g += '<text x="' + X(v).toFixed(1) + '" y="' + (H - B + 16) + '" text-anchor="middle">' + v + "</text>";
  g += '<text class="strong" x="' + ((L + W - R) / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" fill="var(--muted)">k · número de folds</text>';
  g += '<line class="axis" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '"/>' +
    '<line class="axis" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '"/>';
  [[P_BIAS, "var(--brasa)", 2], [P_VAR, "var(--dorado)", 2], [P_TOT, "var(--ambar)", 3]].forEach(s => {
    const pts = [];
    for (let v = 2; v <= 20; v += .25) pts.push([X(v), Y(interp(s[0], v))]);
    g += '<path d="' + smoothPath(pts) + '" fill="none" stroke="' + s[1] + '" stroke-width="' + s[2] + '" stroke-linecap="round" opacity=".92"/>';
  });
  const ky = Y(interp(P_TOT, k)).toFixed(1);
  g += '<line x1="' + X(k).toFixed(1) + '" y1="' + T + '" x2="' + X(k).toFixed(1) + '" y2="' + (H - B) + '" stroke="rgba(255,255,255,.28)" stroke-dasharray="3 4"/>';
  g += '<circle cx="' + X(k).toFixed(1) + '" cy="' + ky + '" r="6" fill="#fff" stroke="var(--ambar)" stroke-width="3"/>';
  g += '<text class="strong" x="' + X(k).toFixed(1) + '" y="' + (parseFloat(ky) - 14).toFixed(1) + '" text-anchor="middle" fill="#fff">k=' + k + "</text>";
  $("#bvChart").innerHTML = g;
  $("#bvKOut").textContent = k;
  $("#bvTrain").textContent = Math.round((k - 1) / k * 100) + "%";
  $("#bvEvals").textContent = k;
  const trainPct = Math.round((k - 1) / k * 100), t = $("#bvText"), card = $("#bvVerdict");
  if (k <= 3) {
    card.style.borderColor = "rgba(217,74,69,.42)";
    t.innerHTML = "<strong style='color:var(--brasa)'>k = " + k + ": alto sesgo pesimista.</strong> El modelo se entrena con sólo " + trainPct + "% de los datos, así que la métrica <em>subestima</em> el desempeño real. A cambio, la varianza es baja: estimación estable pero pesimista.";
  } else if (k <= 10) {
    card.style.borderColor = "rgba(240,180,41,.38)";
    t.innerHTML = "<strong style='color:var(--ambar)'>k = " + k + ": punto óptimo empírico.</strong> Entrenamiento con " + trainPct + "%, " + k + " evaluaciones y un compromiso equilibrado entre sesgo moderado y varianza controlada. Recomendado por Hastie et al. (2009) y Kohavi (1995).";
  } else {
    card.style.borderColor = "rgba(224,138,74,.45)";
    t.innerHTML = "<strong style='color:var(--cobre)'>k = " + k + ": varianza elevada.</strong> Cada fold aporta muy poca información nueva y las estimaciones quedan altamente correlacionadas. Si k tiende a N tenés LOOCV: insesgado pero carísimo.";
  }
}
bvK.addEventListener("input", bvDraw);

/* ==========================================================
   Sección 10 · Data Leakage
   ========================================================== */
const CODE_BAD = [
  "# Error: el Scaler aprende media y varianza del conjunto de prueba",
  "from sklearn.preprocessing import StandardScaler",
  "from sklearn.model_selection import cross_val_score",
  "from sklearn.ensemble import RandomForestClassifier",
  "",
  "model = RandomForestClassifier(n_estimators=100, random_state=42)",
  "",
  "scaler = StandardScaler()",
  "X_scaled = scaler.fit_transform(X)   # <-- fuga: usa TODOS los datos",
  "scores = cross_val_score(model, X_scaled, y, cv=5)",
  'print("Accuracy (optimista):", scores.mean())'
].join("\n");
const CODE_GOOD = [
  "# Correcto: el Scaler se ajusta SOLO dentro de cada fold de train",
  "from sklearn.pipeline import make_pipeline",
  "from sklearn.preprocessing import StandardScaler",
  "from sklearn.model_selection import cross_val_score",
  "from sklearn.ensemble import RandomForestClassifier",
  "",
  "model = RandomForestClassifier(n_estimators=100, random_state=42)",
  "",
  "pipeline = make_pipeline(StandardScaler(), model)",
  "scores = cross_val_score(pipeline, X, y, cv=5)",
  'print("Accuracy (real):", scores.mean(), "+/-", scores.std())'
].join("\n");
const CODE_NESTED = [
  "from sklearn.model_selection import KFold, GridSearchCV, cross_val_score",
  "",
  "# Bucle interno: busqueda de hiperparametros",
  "inner_cv = KFold(n_splits=3, shuffle=True, random_state=42)",
  "clf = GridSearchCV(estimator=model, param_grid=param_grid, cv=inner_cv)",
  "",
  "# Bucle externo: estimacion insesgada del rendimiento",
  "outer_cv = KFold(n_splits=5, shuffle=True, random_state=42)",
  "nested_scores = cross_val_score(clf, X, y, cv=outer_cv)",
  "",
  'print("Rendimiento Nested CV insesgado:", nested_scores.mean())'
].join("\n");
$("#cBad").innerHTML = hl(CODE_BAD);
$("#cGood").innerHTML = hl(CODE_GOOD);
$("#cNested").innerHTML = hl(CODE_NESTED);
$$("[data-copy]").forEach(b => b.onclick = () => copyText($("#" + b.dataset.copy).textContent, b));

let leakCorrect = false;
function leakDraw() {
  const names = ["Fold 1", "Fold 2", "Fold 3", "Fold 4", "Fold 5"];
  let h = '<div class="foldwrap" style="gap:7px">';
  names.forEach((f, i) => {
    h += '<div class="fold" style="padding:.5em .6em;border-color:' + (leakCorrect ? "rgba(240,180,41,.3)" : "rgba(217,74,69,.3)") + '">' +
      '<div class="fname" style="margin:0"><span>' + f + "</span><em>" + (i === 0 ? "prueba" : "entrenamiento") + "</em></div>" +
      '<div style="height:14px;border-radius:6px;margin-top:5px;background:repeating-linear-gradient(115deg,rgba(168,92,51,.38) 0 5px,rgba(168,92,51,.1) 5px 10px)"></div></div>';
  });
  h += "</div>";
  h += '<div style="margin-top:16px;position:relative;height:76px">';
  if (leakCorrect) {
    h += '<div style="position:absolute;left:8%;right:0;top:4px;height:30px;border-radius:9px;background:linear-gradient(90deg,var(--ambar),var(--dorado));display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:#1a0c02">StandardScaler.fit() + modelo</div>' +
      '<div style="position:absolute;left:0;right:0;top:42px;text-align:center;font-size:.7rem;color:var(--muted)">se ajusta sólo sobre los folds de entrenamiento (80%)</div>';
  } else {
    h += '<div style="position:absolute;left:0;right:0;top:4px;height:30px;border-radius:9px;background:linear-gradient(90deg,var(--brasa),var(--miel));display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:800;color:#200a04">StandardScaler.fit() sobre TODO X</div>' +
      '<div style="position:absolute;left:0;right:0;top:42px;text-align:center;font-size:.7rem;color:var(--muted)">incluye el fold de prueba → la media y la varianza se filtran</div>';
  }
  h += "</div>";
  h += '<div class="note ' + (leakCorrect ? "gold" : "ember") + '">' +
    (leakCorrect
      ? "<strong>Pipeline:</strong> el transformador se re-entrena en cada iteración sobre el 80% de entrenamiento. La métrica refleja lo que pasa en producción."
      : "<strong>Fuga de información:</strong> el fold de prueba participó del ajuste del escalador, así que el modelo ya conoce su media y varianza antes de ser evaluado.") +
    "</div>";
  $("#leakViz").innerHTML = h;
  $("#leakToggle").textContent = leakCorrect ? "Ver práctica incorrecta" : "Ver práctica correcta";
  $("#leakToggle").className = "btn sm " + (leakCorrect ? "" : "pri");
}
$("#leakToggle").onclick = () => { leakCorrect = !leakCorrect; leakDraw(); };

/* ==========================================================
   Sección 11 · Validación anidada
   ========================================================== */
let nested = true;
function nestDraw() {
  let g = '<text x="14" y="16" font-size="11" font-weight="700" fill="var(--ambar)">Bucle externo · 5 folds (evaluacion)</text>';
  const ox = 14, oy = 24, ow = 332, oh = 258;
  g += '<rect x="' + ox + '" y="' + oy + '" width="' + ow + '" height="' + oh + '" rx="14" fill="rgba(240,180,41,.04)" stroke="rgba(240,180,41,.4)" stroke-width="1.6"/>';
  const fw = (ow - 20) / 5;
  for (let i = 0; i < 5; i++) {
    const isTest = i === 0;
    g += '<rect x="' + (ox + 10 + i * fw).toFixed(1) + '" y="' + (oy + 10) + '" width="' + (fw - 4).toFixed(1) + '" height="' + (oh - 20) + '" rx="9" fill="' +
      (isTest ? "rgba(240,180,41,.09)" : "rgba(255,255,255,.018)") + '" stroke="' + (isTest ? "var(--ambar)" : "rgba(255,255,255,.11)") + '" stroke-width="' + (isTest ? 2 : 1) + '"/>' +
      '<text x="' + (ox + 10 + i * fw + fw / 2 - 2).toFixed(1) + '" y="' + (oy + oh - 14) + '" text-anchor="middle" fill="' + (isTest ? "var(--ambar)" : "var(--muted)") + '">F' + (i + 1) + "</text>";
  }
  g += '<text x="20" y="42" font-size="10" font-weight="700" fill="var(--ambar)">TEST F1 (nunca visto)</text>';
  const tx = ox + 10 + fw, tw = ow - 20 - fw, tcx = (tx + tw / 2).toFixed(1);
  if (nested) {
    g += '<text x="' + (tx + 12).toFixed(1) + '" y="42" font-size="10" font-weight="700" fill="var(--terracota)">Bucle interno · 3 folds (optimizacion)</text>';
    const iw = (tw - 24) / 3;
    for (let i = 0; i < 3; i++) {
      g += '<rect x="' + (tx + 12 + i * iw).toFixed(1) + '" y="' + (oy + 48) + '" width="' + (iw - 4).toFixed(1) + '" height="' + (oh - 92) + '" rx="9" fill="rgba(168,92,51,.07)" stroke="rgba(168,92,51,.42)" stroke-dasharray="4 3"/>' +
        '<text x="' + (tx + 12 + i * iw + iw / 2 - 2).toFixed(1) + '" y="' + (oy + oh / 2 - 24) + '" text-anchor="middle" fill="var(--terracota)">val ' + (i + 1) + "</text>";
    }
    g += '<rect x="' + (tx + 12).toFixed(1) + '" y="' + (oy + oh - 38) + '" width="' + (tw - 24).toFixed(1) + '" height="22" rx="8" fill="rgba(240,180,41,.13)" stroke="var(--ambar)"/>' +
      '<text x="' + tcx + '" y="' + (oy + oh - 23) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ambar)">modelo final → 88% insesgado</text>';
  } else {
    g += '<text x="' + (tx + 12).toFixed(1) + '" y="42" font-size="10" font-weight="700" fill="var(--brasa)">Sin anidar: el mismo fold elige y evalua</text>';
    g += '<rect x="' + (tx + 12).toFixed(1) + '" y="' + (oy + 48) + '" width="' + (tw - 24).toFixed(1) + '" height="' + (oh - 92) + '" rx="9" fill="rgba(217,74,69,.08)" stroke="rgba(217,74,69,.42)" stroke-dasharray="5 4"/>' +
      '<text x="' + tcx + '" y="' + (oy + 92) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--brasa)">GridSearchCV elige el mejor</text>' +
      '<text x="' + tcx + '" y="' + (oy + 112) + '" text-anchor="middle" font-size="10" fill="#c98f84">y ese mismo score se reporta</text>' +
      '<text x="' + tcx + '" y="' + (oy + oh - 26) + '" text-anchor="middle" font-size="12" font-weight="800" fill="var(--brasa)">94% → optimista (+6 pts)</text>';
  }
  $("#nestChart").innerHTML = g;
  $("#nestMode").textContent = nested ? "Nested CV · insesgado" : "Optimización plana · sesgo optimista";
  $("#nestMode").className = "badge " + (nested ? "b-gold" : "b-ember");
  $("#nestToggle").textContent = nested ? "Ver sin anidar" : "Ver con anidar";
}
$("#nestToggle").onclick = () => { nested = !nested; nestDraw(); };

/* ==========================================================
   Sección 12 · Scikit-Learn
   ========================================================== */
const SK = {
  t1: {
    name: "cross_val_score",
    code: [
      "from sklearn.ensemble import RandomForestClassifier",
      "from sklearn.model_selection import cross_val_score",
      "",
      "model = RandomForestClassifier(n_estimators=100, random_state=42)",
      "scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')",
      "",
      'print("Accuracy promedio:", scores.mean())',
      'print("Desviacion estandar:", scores.std())'
    ].join("\n"),
    info: "<h3>Evaluación rápida de una métrica</h3><p>Devuelve un array con la métrica de cada fold. Es la vía más corta para obtener <code>media</code> y <code>σ</code>.</p><ul><li><code>cv=5</code> o <code>cv=KFold(...)</code></li><li><code>n_jobs=-1</code> para paralelizar</li><li><code>scoring</code>: 'accuracy', 'f1_macro', 'roc_auc', 'neg_mean_squared_error'…</li></ul><div class='note gold'>Siempre reportá <strong>media ± σ</strong>: un 90% con σ ±0,7 es confiable; con σ ±12 es una lotería.</div>"
  },
  t2: {
    name: "cross_validate",
    code: [
      "from sklearn.model_selection import cross_validate",
      "",
      "scoring = ['accuracy', 'precision_macro', 'recall_macro', 'f1_macro']",
      "cv_results = cross_validate(",
      "    model, X, y,",
      "    cv=5, scoring=scoring,",
      "    return_train_score=True",
      ")",
      "",
      'print("Test F1 Macro :", cv_results[\'test_f1_macro\'].mean())',
      'print("Train F1 Macro:", cv_results[\'train_f1_macro\'].mean())  # audita overfitting'
    ].join("\n"),
    info: "<h3>Varias métricas + auditoría</h3><p><code>return_train_score=True</code> es la clave: te da el score de entrenamiento para compararlo con el de prueba y <strong>detectar sobreajuste</strong>.</p><div class='note copper'>Si <code>train − test &gt; 8 pts</code> en F1, estás sobreajustando.</div><div class='note ember' style='margin-top:8px'>Nunca apliques el preprocesamiento fuera del CV: encapsulalo en un <strong>Pipeline</strong>.</div>"
  },
  t3: {
    name: "cross_val_predict",
    code: [
      "from sklearn.model_selection import cross_val_predict",
      "",
      "# Predicciones fuera de muestra para CADA muestra",
      "y_pred_oof = cross_val_predict(pipeline, X, y, cv=5)",
      "",
      "# Ideal para inspeccionar la matriz de confusion agregada",
      "from sklearn.metrics import confusion_matrix, classification_report",
      "print(confusion_matrix(y, y_pred_oof))",
      "print(classification_report(y, y_pred_oof))"
    ].join("\n"),
    info: "<h3>Predicciones out-of-fold</h3><p>Devuelve una predicción por muestra, generada por el modelo que <em>no</em> la vio en el entrenamiento. Ideal para graficar la <strong>matriz de confusión agregada</strong> o los residuos en regresión.</p><div class='note ember'><strong>Advertencia metodológica:</strong> no debe usarse directamente para inferir el error de generalización estándar del modelo.</div>"
  },
  t4: {
    name: "splitters (sklearn.model_selection)",
    code: [
      "# Clasicos",
      "KFold(n_splits=5, shuffle=True, random_state=42)",
      "StratifiedKFold(n_splits=5, shuffle=True, random_state=42)",
      "RepeatedKFold(n_splits=5, n_repeats=10)",
      "RepeatedStratifiedKFold(n_splits=5, n_repeats=10)",
      "LeaveOneOut()",
      "LeavePOut(p=2)",
      "ShuffleSplit(n_splits=10, test_size=0.2)",
      "StratifiedShuffleSplit(n_splits=10, test_size=0.2)",
      "",
      "# Datos agrupados",
      "GroupKFold(n_splits=5)",
      "StratifiedGroupKFold(n_splits=5)",
      "",
      "# Series de tiempo (nunca mira al futuro)",
      "TimeSeriesSplit(n_splits=5)"
    ].join("\n"),
    info: "<h3>Elegí el splitter según el problema</h3><ul><li><strong>Clasificación desbalanceada</strong> → <code>StratifiedKFold</code></li><li><strong>Clasificación normal</strong> → <code>KFold(shuffle=True)</code></li><li><strong>Serie de tiempo</strong> → <code>TimeSeriesSplit</code></li><li><strong>Pacientes o usuarios</strong> → <code>GroupKFold</code></li><li><strong>n chico</strong> → <code>LeaveOneOut</code></li></ul><div class='note'>Usá siempre <code>random_state</code> para que el experimento sea <strong>reproducible</strong>.</div>"
  },
  t5: {
    name: "pipeline + gridsearch",
    code: [
      "from sklearn.pipeline import Pipeline",
      "from sklearn.preprocessing import StandardScaler",
      "from sklearn.model_selection import GridSearchCV, cross_val_score, KFold",
      "",
      "pipe = Pipeline([",
      "    ('scaler', StandardScaler()),",
      "    ('clf', RandomForestClassifier(random_state=42))",
      "])",
      "",
      "param_grid = {",
      "    'clf__n_estimators': [100, 300],",
      "    'clf__max_depth': [None, 8, 12]",
      "}",
      "",
      "# Bucle interno: optimizacion de hiperparametros",
      "inner_cv = KFold(n_splits=3, shuffle=True, random_state=42)",
      "search = GridSearchCV(pipe, param_grid, cv=inner_cv, scoring='f1_macro')",
      "",
      "# Bucle externo: estimacion insesgada",
      "outer_cv = KFold(n_splits=5, shuffle=True, random_state=42)",
      "print(cross_val_score(search, X, y, cv=outer_cv).mean())"
    ].join("\n"),
    info: "<h3>El patrón correcto</h3><p>El <code>Pipeline</code> evita el Data Leakage: cada fold escala sus propios datos. El <strong>GridSearchCV</strong> con <code>cv=inner_cv</code> hace la búsqueda y el <code>cross_val_score</code> exterior mide sin sesgo.</p><div class='note gold'>Ese es exactamente el esquema de la <strong>validación anidada</strong>.</div><div class='note copper' style='margin-top:8px'><code>GridSearchCV</code> sola devuelve un score <em>optimistamente sesgado</em>.</div>"
  }
};
let skCur = "t1";
function skShow(k) {
  skCur = k;
  $("#skCode").innerHTML = hl(SK[k].code);
  $("#skName").textContent = SK[k].name;
  $("#skInfo").innerHTML = SK[k].info;
  $$("#skTabs .btn").forEach(b => b.classList.toggle("pri", b.dataset.tab === k));
}
$$("#skTabs .btn").forEach(b => b.onclick = () => skShow(b.dataset.tab));
$("#skCopy").onclick = () => copyText(SK[skCur].code, $("#skCopy"));

/* ==========================================================
   Sección 13 · Checklist
   ========================================================== */
const CHECKS = [
  ["Folds disjuntos", "Cada observación es prueba exactamente una vez"],
  ["Pipeline", "Scaler e imputación dentro del fold, nunca antes"],
  ["Estratificación", "Proporción de clases constante si hay desbalanceo"],
  ["Media ± σ", "Reportar siempre la dispersión, no sólo el promedio"],
  ["k adecuado", "5–10 salvo justificación (LOOCV sólo con n chico)"],
  ["Sin fuga", "Nada que use y labels derivados antes de dividir"],
  ["Comparación justa", "Mismas particiones para todos los algoritmos"],
  ["Test final", "Un único hold-out que sólo se toca al final"]
];
$("#checklist").innerHTML = CHECKS.map(c => '<div class="chk"><i>✓</i><span><strong>' + c[0] + "</strong><br><small>" + c[1] + "</small></span></div>").join("");

/* ==========================================================
   Sección 14 · Glosario con buscador
   ========================================================== */
const GLOSS = [
  ["Validación Cruzada (Cross Validation)", "Método estadístico para evaluar la capacidad de generalización de un modelo predictivo dividiendo el conjunto de datos en subconjuntos disjuntos de entrenamiento y prueba."],
  ["Sobreajuste (Overfitting)", "El modelo memoriza los datos de entrenamiento: excelente rendimiento en entrenamiento pero pérdida de capacidad predictiva sobre datos nuevos."],
  ["Subajuste (Underfitting)", "El modelo carece de complejidad suficiente para capturar la estructura de los datos: rendimiento deficiente tanto en entrenamiento como en prueba."],
  ["Fold", "Subconjunto disjunto de observaciones resultante de particionar el dataset, usado alternadamente para entrenamiento o evaluación."],
  ["K-Fold Cross Validation", "Estrategia que divide el dataset en K partes iguales y entrena y evalúa el modelo K veces."],
  ["Stratified K-Fold", "Variante de K-Fold que conserva la proporción de clases de la variable objetivo en cada fold; esencial con datos desbalanceados."],
  ["Data Leakage (Fuga de Información)", "Error metodológico en el que información del conjunto de prueba contamina el entrenamiento (por ejemplo, al aplicar transformaciones antes de dividir los folds), produciendo métricas irrealmente optimistas."],
  ["Nested Cross-Validation", "Técnica con un bucle interno para la optimización de hiperparámetros y un bucle externo para la evaluación insesgada del rendimiento general."],
  ["Pipeline", "Estructura de Scikit-Learn que encapsula el preprocesamiento de datos y la estimación del modelo para evitar el Data Leakage durante la validación cruzada."],
  ["Compromiso Sesgo-Varianza (Bias-Variance Tradeoff)", "Equilibrio entre el sesgo de la estimación del error y la varianza entre estimadores, controlado en validación cruzada por la elección del número de folds (k)."],
  ["Hold-Out", "Partición fija del dataset (por ejemplo 80/20) usada una sola vez para entrenar y una para evaluar."],
  ["Time Series Split", "Particionado con avance temporal (walk-forward) que nunca usa información del futuro para entrenar."],
  ["Group K-Fold", "Estrategia que garantiza que ninguna observación de un mismo grupo (paciente, usuario) aparezca en folds de entrenamiento y prueba a la vez."],
  ["Leave One Out (LOOCV)", "Caso extremo de K-Fold con k = N: cada observación individual actúa una vez como conjunto de prueba."]
];
const glossBox = $("#glossBox");
glossBox.innerHTML = GLOSS.map((g, i) =>
  '<details class="gi" id="gi' + i + '"><summary>' + g[0] + "</summary><div class=\"gb\">" + g[1] + "</div></details>"
).join("");
$("#gSearch").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  let n = 0;
  GLOSS.forEach((g, i) => {
    const el = $("#gi" + i);
    const hit = !q || (g[0] + " " + g[1]).toLowerCase().indexOf(q) > -1;
    el.classList.toggle("hide", !hit);
    if (hit) n++;
    const t = el.querySelector("summary"), b = el.querySelector(".gb");
    t.innerHTML = q && g[0].toLowerCase().indexOf(q) > -1
      ? g[0].replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>")
      : g[0];
    b.innerHTML = q && g[1].toLowerCase().indexOf(q) > -1
      ? g[1].replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"), "<mark>$1</mark>")
      : g[1];
  });
  if (q) {
    let box = $("#gSearchResult");
    if (!box) { box = document.createElement("div"); box.id = "gSearchResult"; box.className = "foot"; glossBox.parentNode.appendChild(box); }
    box.textContent = n + (n === 1 ? " término coincide" : " términos coinciden") + " con «" + e.target.value.trim() + "»";
  }
});

/* ==========================================================
   Arranque
   ========================================================== */
function onEnter(i) {
  loopStop();
  if (i === 2) loopStart();
  if (lab.timer && i !== 3) { clearInterval(lab.timer); lab.timer = null; $("#labPlay").textContent = "▶ auto"; }
}
$$("input[type=range]").forEach(paintSlider);
gapUpdate();
loopRender();
labUpdate();
exUpdate();
stUpdate();
metricUpdate();
bvDraw();
leakDraw();
nestDraw();
skShow("t1");
editableNumbers();

const start = parseInt((location.hash || "").replace("#", ""), 10);
go(isFinite(start) && start > 0 ? start - 1 : 0);
