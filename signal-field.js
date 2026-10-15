import * as THREE from "three";
import { RoomEnvironment } from "./assets/vendor/RoomEnvironment.js?v=c20f0b4677f6";
import { makeField } from "./wave-field.js?v=c27759dc761d";

const $ = selector => document.querySelector(selector), root = document.documentElement;
const preference = matchMedia("(prefers-reduced-motion:reduce)"), coarse = matchMedia("(pointer:coarse)");
const reduced = () => preference.matches || root.dataset.motion === "reduced";
const state = { preset: "resonance", order: .65, fieldPaused: false, pulses: 0, hosts: {} };
window.__signalPrototype = state;
const element = $("#experiment-viewport");
const info = state.hosts["experiment-viewport"] = { ready: false, visible: false, frames: 0, suspended: true };
const h = { element, ready: false, lost: false, visible: false, time: 0, width: 0, height: 0 };
let frame = 0, previous = 0, lastDraw = 0, elapsed = 0;
const presetCopy = { flow: "流动 / 让一个念头，沿着曲线向前。", resonance: "共振 / 让不同的起伏，成为同一个频率。", fold: "折叠 / 换一个角度，结构也会不同。" };
const active = () => h.ready && h.visible && !h.lost && !document.hidden && !reduced() && !state.fieldPaused;
function schedule() { if (!frame && active()) frame = requestAnimationFrame(tick); }
function tick(now) {
  frame = 0;
  if (!active()) { previous = 0; return; }
  elapsed += Math.min((now - (previous || now - 16)) / 1000, .05); previous = now;
  if (now - lastDraw > 1000 / (coarse.matches ? 30 : 40)) {
    h.time += elapsed; h.controller.step(elapsed, h.time); elapsed = 0; lastDraw = now; h.render();
  }
  schedule();
}
h.render = () => {
  if (!h.ready || h.lost || !h.visible || document.hidden) return;
  h.renderer.render(h.scene, h.camera);
  info.frames++;
  Object.assign(info, { ready: true, visible: h.visible, suspended: !active(), dpr: h.renderer.getPixelRatio(), calls: h.renderer.info.render.calls, triangles: h.renderer.info.render.triangles });
};
h.resize = () => {
  if (!h.ready || h.lost) return;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  h.width = rect.width; h.height = rect.height;
  h.renderer.setSize(rect.width, rect.height, false); h.controller.resize(); h.render();
};
function updateControls() {
  $("#field-pause").disabled = reduced() || h.lost || !h.ready;
  $("#field-pulse").disabled = reduced() || h.lost || !h.ready;
  $("#field-pause").setAttribute("aria-pressed", String(state.fieldPaused));
  $("#field-pause").setAttribute("aria-label", state.fieldPaused ? "继续波场动画" : "暂停波场动画");
  $("#field-pause").textContent = state.fieldPaused ? "▷" : "Ⅱ";
  $("#field-hint").textContent = h.lost ? "静态波场 · 可切换形态说明" : reduced() ? "已遵循减少动态效果设置" : "点击波场，也会激起涟漪。";
}
function fallback(reason) {
  h.lost = true;
  element.classList.remove("is-ready");
  if (h.renderer) h.renderer.domElement.hidden = true;
  Object.assign(info, { ready: false, fallback: reason, suspended: true });
  h.controller?.settle();
  $("#signal-field").classList.remove("is-pulsing");
  $("#field-status").textContent = "三维暂不可用 / 保留静态波场与形态说明。";
  updateControls();
}
function init() {
  if (h.ready || h.lost) return;
  try {
    h.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    h.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse.matches ? 1.5 : 2));
    h.renderer.setClearColor(0, 0);
    h.renderer.outputColorSpace = THREE.SRGBColorSpace;
    h.renderer.toneMapping = THREE.ACESFilmicToneMapping; h.renderer.toneMappingExposure = 1;
    h.scene = new THREE.Scene(); h.camera = new THREE.OrthographicCamera(-5, 5, 4, -4, .1, 80);
    h.scene.add(new THREE.HemisphereLight(0xfff1f7, 0x482338, .7));
    for (const [color, intensity, position] of [[0xfff7fb, 2.5, [-4, 6, 6]], [0xf1b5d0, 1.15, [5, 2, -3]], [0xffffff, 2.4, [1, 5, -5]]]) {
      const light = new THREE.DirectionalLight(color, intensity); light.position.set(...position); h.scene.add(light);
    }
    h.refreshEnvironment = () => {
      h.environment?.dispose();
      const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(h.renderer);
      h.environment = pmrem.fromScene(room, .035); h.scene.environment = h.environment.texture;
      room.dispose(); pmrem.dispose();
    };
    h.refreshEnvironment();
    element.append(h.renderer.domElement); h.renderer.domElement.setAttribute("aria-hidden", "true");
    h.controller = makeField(h, state, reduced, pulse, () => {
      $("#signal-field").classList.remove("is-pulsing");
      $("#field-status").textContent = presetCopy[state.preset];
    });
    h.ready = true; element.classList.add("is-ready"); h.resize(); h.controller.settle(); h.render(); updateControls(); schedule();
    h.renderer.domElement.addEventListener("webglcontextlost", event => { event.preventDefault(); fallback("context-lost"); });
    h.renderer.domElement.addEventListener("webglcontextrestored", () => {
      h.lost = false; delete info.fallback;
      h.renderer.domElement.hidden = false; element.classList.add("is-ready");
      h.refreshEnvironment(); h.resize(); h.controller.settle(); h.render();
      $("#field-status").textContent = state.fieldPaused ? "已暂停 / 可静态切换形态。" : presetCopy[state.preset];
      updateControls(); schedule();
    });
  } catch (error) { info.reason = String(error.message); h.renderer?.dispose(); fallback("webgl-unavailable"); }
}
new ResizeObserver(h.resize).observe(element);
new IntersectionObserver(([entry]) => {
  h.visible = entry.isIntersecting; info.visible = h.visible; info.suspended = !active();
  if (h.visible) { init(); h.render(); schedule(); }
  else { elapsed = previous = 0; }
}, { threshold: .01, rootMargin: "20px" }).observe(element);
function pulse(x = -1.4, z = 0) {
  if (reduced() || h.lost || !h.ready) return;
  state.pulses++; state.fieldPaused = false; updateControls(); h.controller.pulse(x, z);
  $("#signal-field").classList.add("is-pulsing");
  $("#field-status").textContent = "回响已触发 / 粉色涟漪正在穿过整片金属波场。";
  schedule();
}
$("#field-pulse").addEventListener("click", () => pulse());
$("#field-pause").addEventListener("click", () => {
  state.fieldPaused = !state.fieldPaused; info.suspended = !active(); updateControls();
  $("#field-status").textContent = state.fieldPaused ? "已暂停 / 仍可调节秩序、切换形态。" : presetCopy[state.preset];
  schedule();
});
document.querySelectorAll("[data-field-preset]").forEach(button => button.addEventListener("click", () => {
  state.preset = button.dataset.fieldPreset; $("#signal-field").dataset.preset = state.preset;
  document.querySelectorAll("[data-field-preset]").forEach(el => el.setAttribute("aria-pressed", String(el === button)));
  $("#field-status").textContent = presetCopy[state.preset];
  if (reduced() || state.fieldPaused) h.controller?.settle();
  h.render(); schedule();
}));
$("#field-order").addEventListener("input", event => {
  state.order = Number(event.target.value) / 100; $("#field-order-value").textContent = event.target.value;
  if (reduced() || state.fieldPaused) h.controller?.settle();
  h.render(); schedule();
});
function preferencesChanged() {
  cancelAnimationFrame(frame); frame = previous = elapsed = 0;
  if (reduced()) {
    h.controller?.settle(); $("#signal-field").classList.remove("is-pulsing");
    $("#field-status").textContent = "动效已暂停 / 可静态调节秩序与形态。";
  }
  info.suspended = !active(); h.render(); updateControls(); schedule();
}
new MutationObserver(preferencesChanged).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-motion"] });
preference.addEventListener("change", preferencesChanged);
document.addEventListener("visibilitychange", preferencesChanged);
updateControls();
