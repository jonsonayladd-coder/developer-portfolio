/* ============================================
   ALL GOOD NOW — Portfolio V2 Effects Engine
   WebGL particles, 3D tilt, inferno embers,
   custom cursor, GSAP scroll animations,
   count-up numbers, letter stagger,
   Lenis smooth scroll, loading screen,
   page transitions, auto-parallax
   ============================================ */

(function () {
  'use strict';

  // ── Shared state ──────────────────────────
  const mouse = { x: 0, y: 0, nx: 0.5, ny: 0.5, dx: 0, dy: 0, speed: 0 };
  let prevMouseX = 0, prevMouseY = 0;
  let isTouchDevice = false;
  let isTabVisible = true;
  let lenisInstance = null;
  let pulseValue = 0;
  let pulseVelocity = 0;
  let lastPulseTime = 0;

  // ── Spring physics ──────────────────────────
  const SPRING = {
    snappy: { stiffness: 0.15, damping: 0.75, mass: 1 },
    bouncy: { stiffness: 0.08, damping: 0.6, mass: 1 },
    heavy:  { stiffness: 0.12, damping: 0.65, mass: 1.2 }
  };

  function springStep(current, target, velocity, cfg) {
    velocity += ((target - current) * cfg.stiffness) / cfg.mass;
    velocity *= cfg.damping;
    current += velocity;
    return { value: current, velocity: velocity };
  }

  function triggerPulse() {
    const now = Date.now();
    if (now - lastPulseTime < 500) return;
    lastPulseTime = now;
    pulseVelocity += 0.35; // strong kick
  }

  function detectTouch() {
    isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  }
  detectTouch();

  document.addEventListener('mousemove', (e) => {
    mouse.dx = e.clientX - prevMouseX;
    mouse.dy = e.clientY - prevMouseY;
    mouse.speed = Math.sqrt(mouse.dx * mouse.dx + mouse.dy * mouse.dy);
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.nx = e.clientX / window.innerWidth;
    mouse.ny = e.clientY / window.innerHeight;
  });

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
  });

  // ══════════════════════════════════════════
  //  LOADING SCREEN
  // ══════════════════════════════════════════

  function createLoader() {
    const loader = document.createElement('div');
    loader.classList.add('loader');

    const brand = document.createElement('div');
    brand.classList.add('loader__brand');
    brand.textContent = 'ALL GOOD NOW';

    const bar = document.createElement('div');
    bar.classList.add('loader__bar');

    const barFill = document.createElement('div');
    barFill.classList.add('loader__bar-fill');

    bar.appendChild(barFill);
    loader.appendChild(brand);
    loader.appendChild(bar);
    document.body.appendChild(loader);

    return loader;
  }

  function runLoaderSequence(loader, onComplete) {
    if (typeof gsap === 'undefined') {
      loader.remove();
      onComplete();
      return;
    }

    const brand = loader.querySelector('.loader__brand');
    const barFill = loader.querySelector('.loader__bar-fill');

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(loader, {
          opacity: 0,
          duration: 0.4,
          ease: 'power2.inOut',
          onComplete: () => {
            loader.classList.add('loader--done');
            loader.remove();
            onComplete();
          }
        });
      }
    });

    tl.to(brand, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0);
    tl.to(barFill, { scaleX: 1, duration: 1.0, ease: 'power1.inOut' }, 0.2);
    tl.to({}, { duration: 0.3 }); // brief hold before fade
  }

  // ══════════════════════════════════════════
  //  PAGE TRANSITIONS
  // ══════════════════════════════════════════

  function initPageTransitions() {
    // Create transition overlay
    const overlay = document.createElement('div');
    overlay.classList.add('page-transition');
    document.body.appendChild(overlay);

    // Reveal-in on page load (if navigated via transition)
    if (sessionStorage.getItem('page-transitioning')) {
      sessionStorage.removeItem('page-transitioning');
      overlay.style.transformOrigin = 'right';
      overlay.style.transform = 'scaleX(1)';
      // Animate out (reveal page)
      if (typeof gsap !== 'undefined') {
        gsap.to(overlay, {
          scaleX: 0,
          duration: 0.5,
          ease: 'power2.inOut',
          delay: 0.1,
          onComplete: () => {
            overlay.style.transform = '';
            overlay.style.transformOrigin = '';
          }
        });
      } else {
        overlay.style.transform = '';
      }
    }

    // Intercept internal links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      // Skip external links, anchors, mailto, tel, javascript
      if (!href ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          href.startsWith('http://') ||
          href.startsWith('https://') ||
          link.target === '_blank') return;

      // Internal page link — animate transition
      e.preventDefault();

      if (typeof gsap !== 'undefined') {
        overlay.style.transformOrigin = 'left';
        overlay.style.transform = 'scaleX(0)';

        sessionStorage.setItem('page-transitioning', '1');

        gsap.to(overlay, {
          scaleX: 1,
          duration: 0.4,
          ease: 'power2.inOut',
          onComplete: () => {
            window.location.href = href;
          }
        });
      } else {
        window.location.href = href;
      }
    });
  }

  // ══════════════════════════════════════════
  //  LENIS SMOOTH SCROLL
  // ══════════════════════════════════════════

  function initLenis() {
    if (typeof Lenis === 'undefined') return;

    lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
      infinite: false
    });

    // Sync Lenis with GSAP ScrollTrigger
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenisInstance.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });

      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback: standalone RAF loop
      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  // ══════════════════════════════════════════
  //  AUTO-PARALLAX
  // ══════════════════════════════════════════

  function initAutoParallax() {
    // Apply subtle parallax to decorative elements
    document.querySelectorAll('.accent-rule').forEach((el) => {
      if (!el.hasAttribute('data-parallax')) {
        el.setAttribute('data-parallax', '0.15');
      }
    });

    // Stats rows get a very subtle drift
    document.querySelectorAll('.doc-header .stats').forEach((el) => {
      if (!el.hasAttribute('data-parallax')) {
        el.setAttribute('data-parallax', '0.08');
      }
    });
  }

  // ══════════════════════════════════════════
  //  1. WebGL PARTICLE FIELD (Three.js)
  // ══════════════════════════════════════════

  function initParticles() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const COUNT = isTouchDevice ? 800 : 2000;
    const positions = new Float32Array(COUNT * 3);
    const velocities = new Float32Array(COUNT * 3);
    const springVels = new Float32Array(COUNT * 3); // spring velocities for gravity well
    const sizes = new Float32Array(COUNT);
    const opacities = new Float32Array(COUNT);
    const basePositions = new Float32Array(COUNT * 3); // rest positions for drift

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3]     = (Math.random() - 0.5) * 600;
      positions[i3 + 1] = (Math.random() - 0.5) * 600;
      positions[i3 + 2] = (Math.random() - 0.5) * 400;

      basePositions[i3]     = positions[i3];
      basePositions[i3 + 1] = positions[i3 + 1];
      basePositions[i3 + 2] = positions[i3 + 2];

      velocities[i3]     = (Math.random() - 0.5) * 0.15;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.15;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;

      const depth = (positions[i3 + 2] + 200) / 400;
      sizes[i] = 1.5 + depth * 2.5;
      opacities[i] = 0.2 + depth * 0.6;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    // ── Upgraded shaders ──────────────────────────
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xc8952a) },
        uWarmColor: { value: new THREE.Color(0xffd966) },
        uTime: { value: 0 },
        uMouseWorld: { value: new THREE.Vector3(0, 0, 0) },
        uPulse: { value: 0 },
        uScrollDepth: { value: 0 }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aOpacity;
        uniform vec3 uMouseWorld;
        uniform float uPulse;
        varying float vOpacity;
        varying float vProximity;
        void main() {
          vOpacity = aOpacity;

          // Proximity to mouse for glow effect
          float dist = distance(position, uMouseWorld);
          vProximity = smoothstep(120.0, 0.0, dist);

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

          // Size boost near mouse
          float sizeBoost = 1.0 + vProximity * 0.8;
          // Pulse size kick
          sizeBoost += uPulse * 0.3;

          gl_PointSize = aSize * sizeBoost * (200.0 / -mvPosition.z);

          // Depth of field: fade particles very close to camera
          float camDist = -mvPosition.z;
          if (camDist < 30.0) {
            vOpacity *= smoothstep(5.0, 30.0, camDist);
          }

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uWarmColor;
        uniform float uPulse;
        varying float vOpacity;
        varying float vProximity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;

          // Warm glow near mouse
          vec3 color = mix(uColor, uWarmColor, vProximity * 0.7);

          // Pulse flash — all particles brighten briefly
          alpha *= 1.0 + uPulse * 0.5;
          color = mix(color, uWarmColor, uPulse * 0.3);

          gl_FragColor = vec4(color, alpha);
        }
      `
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Camera spring state ──────────────────────────
    let camXVel = 0, camYVel = 0, camZVel = 0;
    let camRoll = 0, camRollVel = 0;
    let camTargetZ = 300;

    // ── Mouse 3D projection ──────────────────────────
    const mouse3D = new THREE.Vector3();
    const mouseNDC = new THREE.Vector3();

    function updateMouse3D() {
      mouseNDC.set(
        (mouse.nx) * 2 - 1,
        -(mouse.ny) * 2 + 1,
        0.5 // mid-frustum
      );
      mouse3D.copy(mouseNDC).unproject(camera);
    }

    // ── Scroll state ──────────────────────────
    let scrollProgress = 0;
    let scrollVelocity = 0;
    let lastScrollY = 0;

    function updateScrollState() {
      if (lenisInstance) {
        scrollProgress = Math.min(1, lenisInstance.scroll / (document.body.scrollHeight - window.innerHeight || 1));
        scrollVelocity = Math.abs(lenisInstance.velocity || 0);
      } else {
        const sy = window.scrollY;
        scrollVelocity = Math.abs(sy - lastScrollY);
        lastScrollY = sy;
        scrollProgress = Math.min(1, sy / (document.body.scrollHeight - window.innerHeight || 1));
      }
    }

    // ── Click shockwave ──────────────────────────
    document.addEventListener('click', () => {
      triggerShockwave();
    });

    if (isTouchDevice) {
      document.addEventListener('touchstart', () => {
        triggerShockwave();
      });
    }

    function triggerShockwave() {
      updateMouse3D();
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const dx = pos[i3] - mouse3D.x;
        const dy = pos[i3 + 1] - mouse3D.y;
        const dz = pos[i3 + 2] - mouse3D.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 150 && dist > 0.1) {
          const force = (1 - dist / 150) * 8; // full intensity burst
          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;
          springVels[i3]     += nx * force;
          springVels[i3 + 1] += ny * force;
          springVels[i3 + 2] += nz * force;
        }
      }
      // Pulse flash
      pulseVelocity += 0.5;
    }

    // ── Animation loop ──────────────────────────
    function animate() {
      if (!isTabVisible) {
        requestAnimationFrame(animate);
        return;
      }

      material.uniforms.uTime.value += 0.01;

      // Update scroll state
      updateScrollState();

      // Update mouse 3D position
      if (!isTouchDevice) {
        updateMouse3D();
        material.uniforms.uMouseWorld.value.copy(mouse3D);
      }

      // ── Pulse spring (decays toward 0) ──
      const ps = springStep(pulseValue, 0, pulseVelocity, SPRING.heavy);
      pulseValue = ps.value;
      pulseVelocity = ps.velocity;
      material.uniforms.uPulse.value = Math.max(0, pulseValue);

      // ── Scroll depth uniform ──
      material.uniforms.uScrollDepth.value = scrollProgress;

      // ── Camera: spring toward scroll zoom target ──
      camTargetZ = 300 - scrollProgress * 180; // 300 at top → 120 deep
      const camXTarget = (mouse.nx - 0.5) * 40;
      const camYTarget = (mouse.ny - 0.5) * -40;

      const szx = springStep(camera.position.x, camXTarget, camXVel, SPRING.snappy);
      camera.position.x = szx.value; camXVel = szx.velocity;

      const szy = springStep(camera.position.y, camYTarget, camYVel, SPRING.snappy);
      camera.position.y = szy.value; camYVel = szy.velocity;

      const szz = springStep(camera.position.z, camTargetZ, camZVel, SPRING.snappy);
      camera.position.z = szz.value; camZVel = szz.velocity;

      camera.lookAt(scene.position);

      // ── Camera roll on fast scroll (barrel roll drama) ──
      const rollTarget = Math.max(-0.06, Math.min(0.06, scrollVelocity * 0.003 * (scrollProgress > 0.5 ? -1 : 1)));
      const sr = springStep(camRoll, scrollVelocity > 2 ? rollTarget : 0, camRollVel, SPRING.bouncy);
      camRoll = sr.value; camRollVel = sr.velocity;
      camera.rotation.z = camRoll;

      // ── Scroll velocity boost to drift speed ──
      const scrollBoost = 1 + Math.min(scrollVelocity * 0.15, 5);

      // ── Particle loop ──────────────────────────
      const pos = geometry.attributes.position.array;
      const gravityActive = !isTouchDevice && mouse.speed > 0.5;
      const flingActive = !isTouchDevice && mouse.speed > 8;

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;

        // Base drift (boosted by scroll velocity)
        pos[i3]     += velocities[i3] * scrollBoost;
        pos[i3 + 1] += velocities[i3 + 1] * scrollBoost;
        pos[i3 + 2] += velocities[i3 + 2] * scrollBoost;

        // ── Gravity well (half intensity) ──
        if (gravityActive) {
          const dx = mouse3D.x - pos[i3];
          const dy = mouse3D.y - pos[i3 + 1];
          const dz = mouse3D.z - pos[i3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 120 && dist > 0.1) {
            const pull = ((1 - dist / 120) * 0.5) * 0.5; // half intensity
            springVels[i3]     += dx / dist * pull;
            springVels[i3 + 1] += dy / dist * pull;
            springVels[i3 + 2] += dz / dist * pull;
          }

          // Fling: fast mouse scatters nearby particles (full intensity)
          if (flingActive && dist < 80) {
            const flingForce = Math.min(mouse.speed * 0.08, 3);
            springVels[i3]     += (mouse.dx / mouse.speed) * flingForce * (1 - dist / 80);
            springVels[i3 + 1] += (mouse.dy / mouse.speed) * flingForce * (1 - dist / 80);
          }
        }

        // ── Apply spring velocities and damp ──
        springVels[i3]     *= SPRING.bouncy.damping;
        springVels[i3 + 1] *= SPRING.bouncy.damping;
        springVels[i3 + 2] *= SPRING.bouncy.damping;

        pos[i3]     += springVels[i3];
        pos[i3 + 1] += springVels[i3 + 1];
        pos[i3 + 2] += springVels[i3 + 2];

        // ── Wrap boundaries ──
        if (pos[i3] > 300) pos[i3] = -300;
        if (pos[i3] < -300) pos[i3] = 300;
        if (pos[i3 + 1] > 300) pos[i3 + 1] = -300;
        if (pos[i3 + 1] < -300) pos[i3 + 1] = 300;
        if (pos[i3 + 2] > 200) pos[i3 + 2] = -200;
        if (pos[i3 + 2] < -200) pos[i3 + 2] = 200;
      }

      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // ══════════════════════════════════════════
  //  2. 3D TILT CARDS
  // ══════════════════════════════════════════

  function initTilt() {
    if (isTouchDevice) return;

    const tiltEls = document.querySelectorAll('.card, .showcase-card, .stat, .highlight-box, .q-block');

    tiltEls.forEach((el) => {
      let currentX = 0, currentY = 0;
      let velX = 0, velY = 0;
      let targetX = 0, targetY = 0;
      let rafId = null;
      let active = false;

      const tiltSpring = { stiffness: 0.12, damping: 0.65, mass: 1 };

      el.addEventListener('mouseenter', () => {
        active = true;
        el.style.transition = 'box-shadow 0.4s ease';
        if (!rafId) tick();
      });

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        targetX = (y - 0.5) * -14;
        targetY = (x - 0.5) * 14;

        const shadowX = (x - 0.5) * -20;
        const shadowY = (y - 0.5) * -20;
        el.style.boxShadow = `${shadowX}px ${shadowY}px 35px rgba(0,0,0,0.35), 0 0 20px rgba(200,149,42,0.08)`;
      });

      el.addEventListener('mouseleave', () => {
        targetX = 0;
        targetY = 0;
        el.style.transition = 'box-shadow 0.6s ease';
        el.style.boxShadow = '';

        // Let spring settle naturally, then stop
        setTimeout(() => {
          active = false;
        }, 1200);
      });

      function tick() {
        const sx = springStep(currentX, targetX, velX, tiltSpring);
        const sy = springStep(currentY, targetY, velY, tiltSpring);
        currentX = sx.value; velX = sx.velocity;
        currentY = sy.value; velY = sy.velocity;

        el.style.transform = `perspective(800px) rotateX(${currentX}deg) rotateY(${currentY}deg) translateZ(8px)`;

        const moving = Math.abs(velX) > 0.001 || Math.abs(velY) > 0.001 || active;
        if (moving) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = null;
          el.style.transform = '';
        }
      }
    });
  }

  // ══════════════════════════════════════════
  //  3. INFERNO EMBER PARTICLES
  // ══════════════════════════════════════════

  function initEmbers() {
    const headers = document.querySelectorAll('.doc-header');

    headers.forEach((header) => {
      const count = isTouchDevice ? 6 : 14;

      for (let i = 0; i < count; i++) {
        const ember = document.createElement('div');
        ember.classList.add('ember');
        if (Math.random() > 0.5) ember.classList.add('ember--warm');

        ember.style.left = Math.random() * 100 + '%';
        ember.style.setProperty('--ember-duration', (2.5 + Math.random() * 3) + 's');
        ember.style.setProperty('--ember-delay', (Math.random() * 4) + 's');

        const drift = (Math.random() - 0.5) * 40;
        ember.style.animationName = 'none';
        void ember.offsetHeight;
        ember.style.setProperty('--ember-drift', drift + 'px');

        header.appendChild(ember);
      }
    });

    const style = document.createElement('style');
    style.textContent = `
      @keyframes emberRise {
        0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
        10%  { opacity: 0.8; }
        100% { transform: translateY(-140px) translateX(var(--ember-drift, 10px)) scale(0); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════
  //  4. CUSTOM CURSOR
  // ══════════════════════════════════════════

  function initCursor() {
    if (isTouchDevice) return;

    const dot = document.createElement('div');
    dot.classList.add('cursor-dot');
    const ring = document.createElement('div');
    ring.classList.add('cursor-ring');
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    const SPARKLE_COUNT = 8;
    const sparkles = [];
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const s = document.createElement('div');
      s.classList.add('cursor-sparkle');
      document.body.appendChild(s);
      sparkles.push({ el: s, life: 0, x: 0, y: 0, vx: 0, vy: 0 });
    }
    let sparkleIndex = 0;
    let lastSparkleTime = 0;

    let dotX = 0, dotY = 0, dotVX = 0, dotVY = 0;
    let ringX = 0, ringY = 0, ringVX = 0, ringVY = 0;

    const dotSpring = { stiffness: 0.2, damping: 0.7, mass: 0.8 };
    const ringSpring = { stiffness: 0.1, damping: 0.6, mass: 1.3 }; // heavier = lags + bounces more

    function updateCursor() {
      // Spring dot toward mouse (tight, snappy)
      const dx = springStep(dotX, mouse.x, dotVX, dotSpring);
      const dy = springStep(dotY, mouse.y, dotVY, dotSpring);
      dotX = dx.value; dotVX = dx.velocity;
      dotY = dy.value; dotVY = dy.velocity;
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';

      // Spring ring toward mouse (heavy, bouncy lag)
      const rx = springStep(ringX, mouse.x, ringVX, ringSpring);
      const ry = springStep(ringY, mouse.y, ringVY, ringSpring);
      ringX = rx.value; ringVX = rx.velocity;
      ringY = ry.value; ringVY = ry.velocity;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';

      // Ring scale reacts to speed — stretches when moving fast
      const ringSpeed = Math.sqrt(ringVX * ringVX + ringVY * ringVY);
      const ringScale = 1 + Math.min(ringSpeed * 0.03, 0.4);
      ring.style.transform = `translate(-50%,-50%) scale(${ringScale})`;

      for (let i = 0; i < SPARKLE_COUNT; i++) {
        const sp = sparkles[i];
        if (sp.life > 0) {
          sp.life -= 0.02;
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.05; // heavier gravity on sparkles
          sp.vx *= 0.98; // air resistance
          sp.el.style.left = sp.x + 'px';
          sp.el.style.top = sp.y + 'px';
          sp.el.style.opacity = sp.life;
          sp.el.style.transform = `translate(-50%,-50%) scale(${sp.life})`;
        }
      }

      requestAnimationFrame(updateCursor);
    }
    updateCursor();

    document.addEventListener('mousemove', () => {
      const now = Date.now();
      if (now - lastSparkleTime < 80) return;
      lastSparkleTime = now;

      const sp = sparkles[sparkleIndex % SPARKLE_COUNT];
      sp.life = 1;
      sp.x = mouse.x;
      sp.y = mouse.y;
      sp.vx = (Math.random() - 0.5) * 3;
      sp.vy = (Math.random() - 0.5) * 3 - 1;
      sp.el.style.opacity = 1;
      sparkleIndex++;
    });

    const hoverEls = 'a, button, .tag, .nav-toggle, .site-nav__link';
    const ctaEls = '.cta-block a, .showcase-card';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(ctaEls)) {
        document.body.classList.add('cursor--cta');
        document.body.classList.remove('cursor--hover');
      } else if (e.target.closest(hoverEls)) {
        document.body.classList.add('cursor--hover');
        document.body.classList.remove('cursor--cta');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverEls) || e.target.closest(ctaEls)) {
        document.body.classList.remove('cursor--hover', 'cursor--cta');
      }
    });
  }

  // ══════════════════════════════════════════
  //  5. GSAP SCROLL ANIMATIONS
  // ══════════════════════════════════════════

  function initScrollAnimations() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    gsap.registerPlugin(ScrollTrigger);

    // Default reveal: fade up + particle pulse
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.fromTo(el,
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
            onEnter: () => { triggerPulse(); }
          }
        }
      );
    });

    // Reveal from left
    gsap.utils.toArray('[data-reveal-left]').forEach((el) => {
      gsap.fromTo(el,
        { x: -50, opacity: 0 },
        {
          x: 0, opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    // Reveal from right
    gsap.utils.toArray('[data-reveal-right]').forEach((el) => {
      gsap.fromTo(el,
        { x: 50, opacity: 0 },
        {
          x: 0, opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    // Scale reveal
    gsap.utils.toArray('[data-reveal-scale]').forEach((el) => {
      gsap.fromTo(el,
        { scale: 0.85, opacity: 0 },
        {
          scale: 1, opacity: 1,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });

    // Staggered children
    gsap.utils.toArray('[data-stagger]').forEach((container) => {
      const children = container.children;
      gsap.fromTo(children,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1,
          duration: 0.6,
          ease: 'power3.out',
          stagger: 0.08,
          scrollTrigger: { trigger: container, start: 'top 88%', once: true }
        }
      );
    });

    // Parallax elements (including auto-applied ones)
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      gsap.to(el, {
        y: () => speed * -100,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  6. COUNT-UP NUMBERS
  // ══════════════════════════════════════════

  function initCountUp() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const statNumbers = document.querySelectorAll('[data-count]');

    statNumbers.forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.countSuffix || '';
      const prefix = el.dataset.countPrefix || '';
      const hasDecimal = String(target).includes('.');
      const decimals = hasDecimal ? String(target).split('.')[1].length : 0;

      const obj = { val: 0 };

      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(obj, {
            val: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => {
              el.textContent = prefix + (hasDecimal ? obj.val.toFixed(decimals) : Math.round(obj.val)) + suffix;
            }
          });
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  7. LETTER STAGGER ANIMATION
  // ══════════════════════════════════════════

  function initLetterStagger() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    document.querySelectorAll('.section-label[data-letter-stagger]').forEach((label) => {
      const text = label.textContent;
      label.textContent = '';
      label.setAttribute('aria-label', text);

      text.split('').forEach((char) => {
        const span = document.createElement('span');
        span.classList.add('char');
        span.textContent = char === ' ' ? '\u00A0' : char;
        label.appendChild(span);
      });

      const chars = label.querySelectorAll('.char');
      ScrollTrigger.create({
        trigger: label,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(chars, {
            opacity: 1,
            duration: 0.05,
            stagger: 0.04,
            ease: 'none'
          });
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  8. HERO TITLE ANIMATION
  // ══════════════════════════════════════════

  function initHeroAnimation(delay) {
    if (typeof gsap === 'undefined') return;

    const baseDelay = delay || 0.3;

    const heroTitle = document.querySelector('.landing-hero__title, .doc-header h1');
    if (!heroTitle) return;

    const text = heroTitle.textContent;
    heroTitle.textContent = '';
    heroTitle.style.opacity = '1';

    text.split('').forEach((char) => {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.opacity = '0';
      span.style.transform = 'translateY(30px)';
      span.textContent = char === ' ' ? '\u00A0' : char;
      heroTitle.appendChild(span);
    });

    const spans = heroTitle.querySelectorAll('span');

    gsap.to(spans, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.03,
      ease: 'power3.out',
      delay: baseDelay
    });

    const tagline = document.querySelector('.doc-header .tagline, .landing-hero__sub');
    if (tagline) {
      gsap.fromTo(tagline,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: baseDelay + spans.length * 0.03 + 0.2 }
      );
    }

    const nameEl = document.querySelector('.landing-hero__name');
    if (nameEl) {
      gsap.fromTo(nameEl,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: baseDelay + spans.length * 0.03 + 0.4 }
      );
    }

    const stats = document.querySelector('.doc-header .stats, .landing-hero .stats');
    if (stats) {
      gsap.fromTo(stats,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: baseDelay + spans.length * 0.03 + 0.5 }
      );
    }
  }

  // ══════════════════════════════════════════
  //  9. SMOOTH SCROLL ANCHORS
  // ══════════════════════════════════════════

  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();

        if (lenisInstance) {
          lenisInstance.scrollTo(target, { offset: 0 });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ══════════════════════════════════════════
  //  INIT ALL
  // ══════════════════════════════════════════

  function init() {
    const loader = createLoader();

    // Start systems that don't need the loader to finish
    initParticles();
    initPageTransitions();
    initLenis();
    initAutoParallax();

    // Run loader sequence, then reveal page content
    runLoaderSequence(loader, () => {
      // These init after loader completes for clean entrance
      initTilt();
      initEmbers();
      initCursor();
      initScrollAnimations();
      initCountUp();
      initLetterStagger();
      initHeroAnimation(0.1);
      initSmoothScroll();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
