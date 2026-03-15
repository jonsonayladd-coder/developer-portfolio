/* ============================================
   PORTFOLIO CHATBOT — Floating Chat Widget
   Freeform conversation with Marc's AI assistant.
   Workers AI (Llama 3.1 8B) via portfolio-ai Worker.
   ============================================ */

(function () {
  'use strict';

  var API_URL = 'https://portfolio-ai.allgoodnow.workers.dev/chat';
  var MAX_HISTORY = 10;
  var INPUT_MAX = 500;

  // ── State ──────────────────────────────────
  var history = [];
  var isOpen = false;
  var isWaiting = false;

  // ── DOM Creation Helper ────────────────────
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else if (c) node.appendChild(c);
      });
    }
    return node;
  }

  // ── SVG Icon Builders (safe DOM, no innerHTML) ─
  function createSVG(width, height, content) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    content(svg);
    return svg;
  }

  function chatIcon() {
    return createSVG(24, 24, function (svg) {
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
      svg.appendChild(path);
    });
  }

  function closeIcon() {
    return createSVG(18, 18, function (svg) {
      var l1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l1.setAttribute('x1', '18'); l1.setAttribute('y1', '6');
      l1.setAttribute('x2', '6'); l1.setAttribute('y2', '18');
      var l2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l2.setAttribute('x1', '6'); l2.setAttribute('y1', '6');
      l2.setAttribute('x2', '18'); l2.setAttribute('y2', '18');
      svg.appendChild(l1);
      svg.appendChild(l2);
    });
  }

  function sendIcon() {
    return createSVG(18, 18, function (svg) {
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '22'); line.setAttribute('y1', '2');
      line.setAttribute('x2', '11'); line.setAttribute('y2', '13');
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '22 2 15 22 11 13 2 9 22 2');
      svg.appendChild(line);
      svg.appendChild(poly);
    });
  }

  // ── Build Widget DOM ───────────────────────
  function buildWidget() {
    // Bubble
    var bubble = el('button', {
      className: 'chat-bubble',
      'aria-label': 'Open chat'
    });
    bubble.appendChild(chatIcon());

    // Panel
    var panel = el('div', { className: 'chat-panel' });

    // Header
    var closeBtn = el('button', {
      className: 'chat-panel__close',
      'aria-label': 'Close chat'
    });
    closeBtn.appendChild(closeIcon());

    var header = el('div', { className: 'chat-panel__header' }, [
      el('div', { className: 'chat-panel__title' }, [
        el('span', { className: 'chat-panel__dot' }),
        "Marc's AI"
      ]),
      closeBtn
    ]);

    // Messages area
    var messages = el('div', { className: 'chat-panel__messages', id: 'chat-messages' });

    // Input area
    var inputWrap = el('div', { className: 'chat-panel__input-wrap' });
    var input = el('input', {
      type: 'text',
      className: 'chat-panel__input',
      id: 'chat-input',
      placeholder: 'Ask me anything...',
      autocomplete: 'off',
      maxlength: String(INPUT_MAX)
    });
    var sendBtn = el('button', {
      className: 'chat-panel__send',
      'aria-label': 'Send message'
    });
    sendBtn.appendChild(sendIcon());
    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messages);
    panel.appendChild(inputWrap);

    document.body.appendChild(bubble);
    document.body.appendChild(panel);

    // ── Events ─────────────────────────────
    bubble.addEventListener('click', function () { toggleChat(true, bubble, panel); });
    closeBtn.addEventListener('click', function () { toggleChat(false, bubble, panel); });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !isWaiting) sendMessage(input, messages);
    });
    sendBtn.addEventListener('click', function () {
      if (!isWaiting) sendMessage(input, messages);
    });

    // ── Entrance animation ─────────────────
    if (typeof gsap !== 'undefined') {
      bubble.style.opacity = '0';
      bubble.style.transform = 'scale(0)';
      gsap.to(bubble, {
        scale: 1, opacity: 1, duration: 0.6, ease: 'back.out(1.7)', delay: 1.5
      });
    }
  }

  // ── Toggle Panel ───────────────────────────
  function toggleChat(open, bubble, panel) {
    isOpen = open;
    if (open) {
      panel.classList.add('chat-panel--open');
      bubble.classList.add('chat-bubble--hidden');

      if (typeof gsap !== 'undefined') {
        gsap.fromTo(panel,
          { opacity: 0, y: 20, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.4)' }
        );
      }

      // Show greeting on first open
      var msgs = document.getElementById('chat-messages');
      if (msgs && msgs.children.length === 0) {
        addAIMessage(msgs, "Hey \u2014 I'm Marc's AI assistant. Ask me anything about what Marc builds, his tech stack, or how he works. What are you curious about?");
      }

      var input = document.getElementById('chat-input');
      if (input) setTimeout(function () { input.focus(); }, 350);
    } else {
      panel.classList.remove('chat-panel--open');
      bubble.classList.remove('chat-bubble--hidden');

      if (typeof gsap !== 'undefined') {
        gsap.fromTo(bubble,
          { scale: 0.8 },
          { scale: 1, duration: 0.3, ease: 'back.out(2)' }
        );
      }
    }
  }

  // ── Send Message ───────────────────────────
  function sendMessage(input, messagesEl) {
    var text = input.value.trim();
    if (!text || isWaiting) return;

    input.value = '';
    addUserMessage(messagesEl, text);
    isWaiting = true;

    // Show typing indicator
    var typing = el('div', { className: 'chat-msg chat-msg--ai chat-msg--typing' }, [
      el('div', { className: 'chat-typing' }, [
        el('span', { className: 'chat-typing__dot' }),
        el('span', { className: 'chat-typing__dot' }),
        el('span', { className: 'chat-typing__dot' })
      ])
    ]);
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    // Disable input while waiting
    input.disabled = true;

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 10000);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        message: text,
        history: history.slice(-MAX_HISTORY)
      })
    })
    .then(function (res) {
      clearTimeout(timeout);
      if (!res.ok) throw new Error('API error ' + res.status);
      return res.json();
    })
    .then(function (data) {
      typing.remove();
      if (data.reply) {
        history.push({ role: 'user', content: text });
        history.push({ role: 'assistant', content: data.reply });
        addAIMessage(messagesEl, data.reply);
      } else {
        addAIMessage(messagesEl, "Sorry, I couldn't process that. Try asking something else.");
      }
    })
    .catch(function (err) {
      clearTimeout(timeout);
      typing.remove();
      var errorMsg = err.name === 'AbortError'
        ? "That took too long \u2014 try again in a moment."
        : "Something went wrong. Try again shortly.";
      addAIMessage(messagesEl, errorMsg);
    })
    .finally(function () {
      isWaiting = false;
      input.disabled = false;
      input.focus();
    });
  }

  // ── Add Messages ───────────────────────────
  function addUserMessage(container, text) {
    var msg = el('div', { className: 'chat-msg chat-msg--user' }, [
      el('div', { className: 'chat-msg__text', textContent: text })
    ]);
    container.appendChild(msg);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(msg, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' });
    }

    container.scrollTop = container.scrollHeight;
  }

  function addAIMessage(container, text) {
    var msg = el('div', { className: 'chat-msg chat-msg--ai' });
    var textEl = el('div', { className: 'chat-msg__text' });
    msg.appendChild(textEl);
    container.appendChild(msg);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(msg, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' });
    }

    // Typing effect
    var i = 0;
    var speed = text.length > 120 ? 12 : 22;
    function tick() {
      if (i < text.length) {
        textEl.textContent += text[i];
        i++;
        container.scrollTop = container.scrollHeight;
        setTimeout(tick, speed);
      }
    }
    tick();
  }

  // ── Init ───────────────────────────────────
  function init() {
    // Don't add chatbot on contact page — it has the wizard companion already
    if (window.location.pathname.indexOf('contact') !== -1) return;

    buildWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
