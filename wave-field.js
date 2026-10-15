import * as THREE from "three";

export function makeField(h, state, reduced, onPulse, onPulseEnd) {
  const group = new THREE.Group();
  h.scene.add(group);
  const coarse = matchMedia("(pointer:coarse)").matches;
  const strips = coarse ? 42 : 62, segments = coarse ? 72 : 112;
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xd68aaa, metalness: .86, roughness: .24, clearcoat: .28, side: THREE.DoubleSide, envMapIntensity: 1.25, vertexColors: true });
  const edge = new THREE.LineBasicMaterial({ color: 0xb1477b, transparent: true, opacity: .23 });
  const ribbons = [];
  const pulsePosition = new THREE.Vector2(-1.4, 0);
  let pulseAge = 10, pulseActive = false;
  const weights = { flow: 0, resonance: 1, fold: 0 };
  let order = state.order, yaw = -.16, targetYaw = -.16, tilt = 0, targetTilt = 0;
  let held = null, moved = false;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(strips * (segments + 1) * 2 * 3);
  const colors = new Float32Array(positions.length);
  const edgePositions = new Float32Array(strips * segments * 2 * 3);
  const indices = [];
  for (let i = 0; i < strips; i++) {
    const offset = i * (segments + 1) * 2;
    for (let j = 0; j < segments; j++) {
      const k = offset + j * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
    ribbons.push({ offset, edgeOffset: i * segments * 2, z: (i / (strips - 1) - .5) * 4.3, width: 4.3 / strips * .76 });
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(indices);
  const sculpture = new THREE.Mesh(geo, silver);
  sculpture.frustumCulled = false;
  group.add(sculpture);
  const edgeGeometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(edgePositions, 3).setUsage(THREE.DynamicDrawUsage));
  const outlines = new THREE.LineSegments(edgeGeometry, edge);
  outlines.frustumCulled = false;
  group.add(outlines);
  const accentMat = new THREE.MeshBasicMaterial({ color: 0xe64392, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const pulseMesh = new THREE.Mesh(new THREE.RingGeometry(.92, 1.0, 100), accentMat);
  pulseMesh.rotation.x = -Math.PI / 2;
  pulseMesh.position.y = -.48;
  group.add(pulseMesh);
  // Three coherent surfaces, blended continuously rather than switching unrelated objects.
  function height(x, z, time) {
    const flow = Math.sin(x * .85 + z * .49 - time * .24) * .80 + Math.sin(z * .66) * .16;
    const resonance = Math.sin(x * 1.04 + z * .3 - time * .24) * 1.12 + Math.cos(z * .72 + x * .13) * .36;
    const fold = Math.sin(x * .8 - time * .12) * .58 + Math.sin(z * 1.02 + x * .46) * 1.19;
    const noise = (Math.sin(x * 2.35 + z * 2.4 + time * .37) * .34 + Math.cos(x * 3.4 - z * 1.9 - time * .23) * .2) * (1 - order);
    let y = flow * weights.flow + resonance * weights.resonance + fold * weights.fold + noise;
    if (pulseAge < 4.2) {
      const distance = Math.hypot(x - pulsePosition.x, z - pulsePosition.y);
      const front = distance - pulseAge * 2.45;
      y += Math.sin(front * 3.9) * Math.exp(-front * front * .55) * Math.exp(-pulseAge * .38) * .88;
    }
    return y;
  }
  function surface(time) {
    const t = reduced() ? 0 : time;
    const positions = geo.attributes.position, colors = geo.attributes.color, edgePositions = edgeGeometry.attributes.position;
    for (const ribbon of ribbons) {
      for (let j = 0; j <= segments; j++) {
        const x = (j / segments - .5) * 8.6;
        for (let side = 0; side < 2; side++) {
          const z = ribbon.z + (side - .5) * ribbon.width;
          positions.setXYZ(ribbon.offset + j * 2 + side, x, height(x, z, t), z);
          const front = Math.hypot(x - pulsePosition.x, z - pulsePosition.y) - pulseAge * 2.45;
          const glow = pulseAge < 4.2 ? Math.exp(-front * front * 1.3) * Math.exp(-pulseAge * .35) : 0;
          colors.setXYZ(ribbon.offset + j * 2 + side, 1, 1 - glow * .42, 1 - glow * .12);
        }
        if (j < segments) {
          const x2 = ((j + 1) / segments - .5) * 8.6;
          const z = ribbon.z - ribbon.width / 2;
          edgePositions.setXYZ(ribbon.edgeOffset + j * 2, x, height(x, z, t), z);
          edgePositions.setXYZ(ribbon.edgeOffset + j * 2 + 1, x2, height(x2, z, t), z);
        }
      }
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    edgePositions.needsUpdate = true;
    geo.computeVertexNormals();
    group.rotation.set(tilt, yaw, -.075);
    group.position.set(h.width > 900 ? 1.12 : h.width > 700 ? .75 : 0, -.12, 0);
    pulseMesh.position.x = pulsePosition.x;
    pulseMesh.position.z = pulsePosition.y;
    pulseMesh.scale.setScalar(.45 + pulseAge * 2.4);
    accentMat.opacity = pulseAge < 3 ? Math.exp(-pulseAge * 1.35) * .16 : 0;
    state.fieldGeometry = { order, weights: { ...weights }, pulseAge, rotation: [yaw, tilt] };
  }
  const canvas = h.renderer.domElement;
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    held = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, id: event.pointerId };
    moved = false;
    if (event.pointerType !== "touch") canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    if (!held) return;
    const dx = event.clientX - held.x, dy = event.clientY - held.y;
    const totalX = event.clientX - held.startX, totalY = event.clientY - held.startY;
    if (Math.hypot(totalX, totalY) > 6) moved = true;
    if (event.pointerType !== "touch" || Math.abs(totalX) > Math.abs(totalY)) {
      targetYaw = THREE.MathUtils.clamp(targetYaw + dx * .0035, -.65, .65);
      targetTilt = THREE.MathUtils.clamp(targetTilt + dy * .0015, -.17, .17);
    }
    held.x = event.clientX; held.y = event.clientY;
    if (reduced() || state.fieldPaused) { yaw = targetYaw; tilt = targetTilt; surface(h.time); h.render(); }
  });
  canvas.addEventListener("pointerup", event => {
    if (held && !moved) {
      const rect = canvas.getBoundingClientRect();
      onPulse((event.clientX - rect.left) / rect.width * 8 - 4, (event.clientY - rect.top) / rect.height * 4 - 2);
    }
    held = null;
  });
  canvas.addEventListener("pointercancel", () => { held = null; });
  function resize() {
    const aspect = h.width / h.height;
    const span = Math.max(5.6, 9.5 / aspect);
    h.camera.left = -span * aspect / 2; h.camera.right = span * aspect / 2;
    h.camera.top = span / 2; h.camera.bottom = -span / 2;
    h.camera.position.set(5.5, 5.3, 9.5);
    h.camera.lookAt(0, .2, 0);
    h.camera.updateProjectionMatrix();
    surface(h.time);
  }
  return {
    resize,
    change() {},
    pulse(x, z) { pulsePosition.set(x, z); pulseAge = 0; pulseActive = true; },
    settle() {
      order = state.order;
      for (const key in weights) weights[key] = key === state.preset ? 1 : 0;
      pulseAge = 10; pulseActive = false;
      surface(h.time);
    },
    step(dt, time) {
      const alpha = 1 - Math.exp(-dt * 3.2);
      order = THREE.MathUtils.lerp(order, state.order, alpha);
      for (const key in weights) weights[key] = THREE.MathUtils.lerp(weights[key], key === state.preset ? 1 : 0, alpha);
      yaw = THREE.MathUtils.lerp(yaw, targetYaw, alpha);
      tilt = THREE.MathUtils.lerp(tilt, targetTilt, alpha);
      pulseAge += dt;
      if (pulseActive && pulseAge > 4.2) { pulseActive = false; onPulseEnd(); }
      surface(time);
    }
  };
}
