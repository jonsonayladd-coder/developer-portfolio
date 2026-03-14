/* ============================================
   AI CONTACT SYSTEM — Wizard + Companion
   Decision tree, state machine, GSAP animations,
   Workers AI integration, live brief builder
   ============================================ */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────
  const API_BASE = 'https://portfolio-ai.allgoodnow.workers.dev'; // Worker URL for AI + submission
  const AI_TIMEOUT = 8000;
  const MAX_AI_CALLS = 20;
  let aiCallCount = 0;

  // ── Question Bank ──────────────────────────
  const QUESTIONS = {
    welcome: {
      id: 'welcome', label: 'Welcome', text: '', type: 'welcome', next: 'what_brings_you'
    },
    what_brings_you: {
      id: 'what_brings_you', label: 'Getting Started',
      text: "What brings you here?", type: 'radio',
      options: [
        { value: 'new', label: 'New website', desc: 'Starting from scratch' },
        { value: 'redesign', label: 'Redesign existing site', desc: 'Already have one, needs work' },
        { value: 'features', label: 'Add features to a site', desc: 'Just need specific additions' },
        { value: 'exploring', label: 'Just exploring', desc: "Seeing what's possible" }
      ],
      next: 'business_type'
    },
    business_type: {
      id: 'business_type', label: 'Your Business',
      text: "What kind of business is this for?", type: 'text',
      placeholder: 'e.g. gym, retail store, restaurant...',
      suggestions: ['Gym / Fitness', 'Retail / Shop', 'Hospitality', 'Trades', 'Creative / Agency', 'Tech / SaaS', 'Health / Wellness'],
      branch: function (a) { return 'timeline'; }
    },
    timeline: {
      id: 'timeline', label: 'Timeline',
      text: "How soon are you looking to get started?", type: 'radio',
      options: [
        { value: 'now', label: 'Ready now', desc: "Let's go" },
        { value: 'weeks', label: 'Next few weeks', desc: 'Planning ahead' },
        { value: 'planning', label: 'Just planning ahead', desc: 'No rush, exploring options' }
      ],
      branch: function (a) {
        var p = a.what_brings_you;
        if (p === 'new') return 'has_branding';
        if (p === 'redesign') return 'current_url';
        if (p === 'features') return 'feature_list';
        if (p === 'exploring') return 'exploring_summary';
        return 'contact_capture';
      }
    },
    has_branding: {
      id: 'has_branding', label: 'Branding',
      text: "Do you have existing branding?", type: 'radio',
      options: [
        { value: 'yes', label: 'Yes — logo, colours, the works' },
        { value: 'partial', label: 'Some of it — logo but no brand guide' },
        { value: 'no', label: 'Starting fresh — need everything' }
      ],
      next: 'needs_ecommerce'
    },
    needs_ecommerce: {
      id: 'needs_ecommerce', label: 'E-Commerce',
      text: "Will you need e-commerce or online payments?", type: 'radio',
      options: [
        { value: 'yes', label: 'Yes — selling products or services online' },
        { value: 'maybe', label: 'Maybe — might add it later' },
        { value: 'no', label: 'No — just an informational site' }
      ],
      next: 'new_features'
    },
    new_features: {
      id: 'new_features', label: 'Features',
      text: "What features matter most?", type: 'checklist',
      options: [
        { value: 'booking', label: 'Booking system' },
        { value: 'chat', label: 'AI chatbot' },
        { value: 'blog', label: 'Blog / news' },
        { value: 'gallery', label: 'Image gallery' },
        { value: 'forms', label: 'Contact forms' },
        { value: 'members', label: 'Memberships / login' }
      ],
      next: 'has_content'
    },
    has_content: {
      id: 'has_content', label: 'Content',
      text: "Do you have content ready?", type: 'radio',
      options: [
        { value: 'yes', label: 'Yes — text and images ready to go' },
        { value: 'some', label: 'Some — will need help filling gaps' },
        { value: 'no', label: 'No — need help with everything' }
      ],
      next: 'contact_capture'
    },
    current_url: {
      id: 'current_url', label: 'Current Site',
      text: "What's the current website URL?", type: 'text',
      placeholder: 'e.g. www.mybusiness.com', next: 'whats_wrong'
    },
    whats_wrong: {
      id: 'whats_wrong', label: 'Pain Points',
      text: "What's not working about it?", type: 'text',
      placeholder: 'Looks outdated, slow, hard to update...', next: 'keep_content'
    },
    keep_content: {
      id: 'keep_content', label: 'Content',
      text: "Keep existing content or start fresh?", type: 'radio',
      options: [
        { value: 'keep', label: 'Keep most of it — just modernise' },
        { value: 'mix', label: 'Keep some, rewrite the rest' },
        { value: 'fresh', label: 'Start completely fresh' }
      ],
      next: 'redesign_features'
    },
    redesign_features: {
      id: 'redesign_features', label: 'New Features',
      text: "Any specific features you want to add?", type: 'text',
      placeholder: 'Online booking, chat, payments...', next: 'contact_capture'
    },
    feature_list: {
      id: 'feature_list', label: 'Features Needed',
      text: "What features do you need?", type: 'checklist',
      options: [
        { value: 'booking', label: 'Booking system' },
        { value: 'chat', label: 'Live chat / AI bot' },
        { value: 'payments', label: 'Payments / Stripe' },
        { value: 'blog', label: 'Blog' },
        { value: 'chatbot', label: 'AI chatbot' },
        { value: 'analytics', label: 'Analytics' },
        { value: 'forms', label: 'Forms' }
      ],
      next: 'current_stack'
    },
    current_stack: {
      id: 'current_stack', label: 'Tech Stack',
      text: "What's the site built with?", type: 'radio',
      options: [
        { value: 'wordpress', label: 'WordPress' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'squarespace', label: 'Squarespace / Wix' },
        { value: 'custom', label: 'Custom built' },
        { value: 'unknown', label: 'Not sure' }
      ],
      next: 'urgent_need'
    },
    urgent_need: {
      id: 'urgent_need', label: 'Priority',
      text: "What's the most urgent need?", type: 'text',
      placeholder: 'The one thing that matters most right now...', next: 'contact_capture'
    },
    exploring_summary: {
      id: 'exploring_summary', label: 'Capabilities',
      text: "Here's what I can do", type: 'exploring', next: 'exploring_email'
    },
    exploring_email: {
      id: 'exploring_email', label: 'Stay in Touch',
      text: "Want to stay in touch?", type: 'email_capture', next: null
    },
    contact_capture: {
      id: 'contact_capture', label: 'Your Details',
      text: "Where should I send this?", type: 'contact', next: 'summary'
    },
    summary: {
      id: 'summary', label: 'Summary', text: '', type: 'summary', next: null
    }
  };

  // ── State ──────────────────────────────────
  var state = {
    currentQuestion: 'welcome',
    answers: {},
    history: [],
    brief: {},
    companionMessages: [],
    aiAvailable: !!API_BASE,
    mobileDrawerOpen: false
  };

  // ── DOM refs ───────────────────────────────
  var wizardContainer, progressBar;
  var companionMessages_el, companionBrief, briefItems;
  var companionMobileText, companionMobileDrawer, companionMobileContent;

  // ══════════════════════════════════════════
  //  HELPERS — Safe DOM creation
  // ══════════════════════════════════════════

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') node.className = attrs[k];
        else if (k === 'textContent') node.textContent = attrs[k];
        else if (k.indexOf('data') === 0) node.setAttribute(k.replace(/([A-Z])/g, '-$1').toLowerCase(), attrs[k]);
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

  function setAttr(node, key, val) { node.setAttribute(key, val); return node; }
  function addStyle(node, prop, val) { node.style[prop] = val; return node; }

  // ══════════════════════════════════════════
  //  INITIALIZATION
  // ══════════════════════════════════════════

  function init() {
    wizardContainer = document.getElementById('wizard-container');
    progressBar = document.getElementById('wizard-progress');
    companionMessages_el = document.getElementById('companion-messages');
    companionBrief = document.getElementById('companion-brief');
    briefItems = document.getElementById('brief-items');
    companionMobileText = document.getElementById('companion-mobile-text');
    companionMobileDrawer = document.getElementById('companion-mobile-drawer');
    companionMobileContent = document.getElementById('companion-mobile-content');

    if (!wizardContainer) return;

    initMobileDrawer();
    renderQuestion('welcome', 'forward');
    addCompanionMessage("Hey \u2014 I'm here to help figure out what you need. Answer a few questions and I'll put together a summary for you.");
  }

  // ══════════════════════════════════════════
  //  QUESTION RENDERING
  // ══════════════════════════════════════════

  function renderQuestion(questionId, direction) {
    var q = QUESTIONS[questionId];
    if (!q) return;

    state.currentQuestion = questionId;
    updateProgress();

    var newEl = createQuestionElement(q);
    var existing = wizardContainer.querySelector('.wizard__question--active');

    wizardContainer.appendChild(newEl);

    if (typeof gsap !== 'undefined' && existing) {
      var exitY = direction === 'forward' ? -30 : 30;
      var enterY = direction === 'forward' ? 40 : -40;

      gsap.to(existing, {
        scale: 0.95, opacity: 0, y: exitY,
        duration: 0.4, ease: 'power2.in',
        onComplete: function () { existing.remove(); }
      });

      gsap.fromTo(newEl,
        { scale: 1.05, opacity: 0, y: enterY },
        {
          scale: 1, opacity: 1, y: 0,
          duration: 0.5, ease: 'back.out(1.4)', delay: 0.15,
          onComplete: function () {
            newEl.classList.add('wizard__question--active');
            animateChildren(newEl, q.type);
            autoFocusInput(newEl);
          }
        }
      );
    } else {
      if (existing) existing.remove();
      newEl.style.opacity = '1';
      newEl.style.transform = 'none';
      newEl.classList.add('wizard__question--active');
      animateChildren(newEl, q.type);
    }
  }

  function animateChildren(parent, type) {
    if (typeof gsap === 'undefined') return;

    if (type === 'radio' || type === 'checklist') {
      var items = parent.querySelectorAll('.wizard__option, .wizard__check');
      gsap.fromTo(items,
        { y: 20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'elastic.out(1, 0.75)' }
      );
    }

    var suggestions = parent.querySelectorAll('.wizard__suggestion');
    if (suggestions.length) {
      gsap.fromTo(suggestions,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, stagger: 0.05, ease: 'back.out(2)', delay: 0.3 }
      );
    }
  }

  function autoFocusInput(parent) {
    var input = parent.querySelector('.wizard__input');
    if (input) setTimeout(function () { input.focus(); }, 600);
  }

  function createQuestionElement(q) {
    var wrap = el('div', { className: 'wizard__question' });
    wrap.dataset.questionId = q.id;

    switch (q.type) {
      case 'welcome': return buildWelcome(wrap, q);
      case 'radio': return buildRadio(wrap, q);
      case 'text': return buildText(wrap, q);
      case 'checklist': return buildChecklist(wrap, q);
      case 'contact': return buildContactCapture(wrap, q);
      case 'exploring': return buildExploring(wrap, q);
      case 'email_capture': return buildEmailCapture(wrap, q);
      case 'summary': return buildSummary(wrap, q);
      default: return wrap;
    }
  }

  // ── Welcome ────────────────────────────────

  function buildWelcome(wrap, q) {
    var inner = el('div', { className: 'wizard__welcome' }, [
      el('p', { className: 'wizard__question-label', textContent: "Let's Talk" }),
      el('h1', { className: 'wizard__welcome-title glow-text', textContent: 'Got a project in mind?' }),
      el('p', { className: 'wizard__welcome-sub', textContent: "I'll ask a few questions to understand what you need, then put together a project summary. Takes about 2 minutes." }),
      el('button', { className: 'wizard__btn wizard__btn--primary', id: 'wizard-start', textContent: "Let's Go" })
    ]);
    wrap.appendChild(inner);
    wrap.querySelector('#wizard-start').addEventListener('click', function () {
      goToQuestion(q.next, 'forward');
    });
    return wrap;
  }

  // ── Radio ──────────────────────────────────

  function buildRadio(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: q.label }));
    wrap.appendChild(el('h2', { className: 'wizard__question-text', textContent: q.text }));

    var optionsDiv = el('div', { className: 'wizard__options' });
    q.options.forEach(function (opt) {
      var optEl = el('div', { className: 'wizard__option' });
      optEl.dataset.value = opt.value;

      optEl.appendChild(el('div', { className: 'wizard__option-text', textContent: opt.label }));
      if (opt.desc) optEl.appendChild(el('div', { className: 'wizard__option-desc', textContent: opt.desc }));
      optEl.appendChild(el('div', { className: 'wizard__option-indicator' }));

      optEl.addEventListener('click', function () {
        optionsDiv.querySelectorAll('.wizard__option').forEach(function (o) { o.classList.remove('wizard__option--selected'); });
        optEl.classList.add('wizard__option--selected');

        if (typeof gsap !== 'undefined') {
          gsap.fromTo(optEl, { scale: 0.97 }, { scale: 1, duration: 0.2, ease: 'back.out(2)' });
        }

        state.answers[q.id] = opt.value;
        updateBrief(q.id, opt.label);

        setTimeout(function () {
          goToQuestion(getNextQuestion(q), 'forward');
        }, 400);
      });

      optionsDiv.appendChild(optEl);
    });
    wrap.appendChild(optionsDiv);

    appendNav(wrap, q, true);
    return wrap;
  }

  // ── Text Input ─────────────────────────────

  function buildText(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: q.label }));
    wrap.appendChild(el('h2', { className: 'wizard__question-text', textContent: q.text }));

    var inputWrap = el('div', { className: 'wizard__input-wrap' });
    var input = el('input', { type: 'text', className: 'wizard__input', placeholder: q.placeholder || '', autocomplete: 'off' });
    inputWrap.appendChild(input);
    wrap.appendChild(inputWrap);

    if (q.suggestions) {
      var sugDiv = el('div', { className: 'wizard__suggestions' });
      q.suggestions.forEach(function (s) {
        var chip = el('span', { className: 'wizard__suggestion', textContent: s });
        chip.addEventListener('click', function () {
          input.value = s;
          sugDiv.querySelectorAll('.wizard__suggestion').forEach(function (x) { x.classList.remove('wizard__suggestion--active'); });
          chip.classList.add('wizard__suggestion--active');
          state.answers[q.id] = s;
        });
        sugDiv.appendChild(chip);
      });
      wrap.appendChild(sugDiv);
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) {
        state.answers[q.id] = input.value.trim();
        updateBrief(q.id, input.value.trim());
        goToQuestion(getNextQuestion(q), 'forward');
      }
    });

    appendNav(wrap, q, false);
    return wrap;
  }

  // ── Checklist ──────────────────────────────

  function buildChecklist(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: q.label }));
    wrap.appendChild(el('h2', { className: 'wizard__question-text', textContent: q.text }));

    var hint = el('p', { textContent: 'Select all that apply' });
    hint.style.fontSize = '0.8rem';
    hint.style.color = 'var(--cream-faint)';
    hint.style.marginBottom = '1rem';
    wrap.appendChild(hint);

    var grid = el('div', { className: 'wizard__checklist' });
    q.options.forEach(function (opt) {
      var chk = el('div', { className: 'wizard__check' }, [
        el('div', { className: 'wizard__check-box' }),
        el('span', { className: 'wizard__check-label', textContent: opt.label })
      ]);
      chk.dataset.value = opt.value;

      chk.addEventListener('click', function () {
        chk.classList.toggle('wizard__check--selected');
        if (typeof gsap !== 'undefined') {
          gsap.fromTo(chk, { scale: 0.95 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
        }
      });

      grid.appendChild(chk);
    });
    wrap.appendChild(grid);

    appendNav(wrap, q, false);
    return wrap;
  }

  // ── Contact Capture ────────────────────────

  function buildContactCapture(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: q.label }));
    wrap.appendChild(el('h2', { className: 'wizard__question-text', textContent: q.text }));

    var sub = el('p', { textContent: 'Optional \u2014 skip this to just view the demo brief.' });
    sub.style.cssText = 'font-size:0.85rem;color:var(--text-body);margin-bottom:1.5rem;';
    wrap.appendChild(sub);

    var fields = el('div', { className: 'wizard__contact-fields' });

    var nameWrap = el('div', { className: 'wizard__input-wrap' });
    nameWrap.appendChild(el('label', { className: 'wizard__contact-label', textContent: 'Name' }));
    var nameInput = el('input', { type: 'text', className: 'wizard__input', id: 'contact-name', placeholder: 'Your name', autocomplete: 'name' });
    nameWrap.appendChild(nameInput);
    fields.appendChild(nameWrap);

    var emailWrap = el('div', { className: 'wizard__input-wrap' });
    emailWrap.appendChild(el('label', { className: 'wizard__contact-label', textContent: 'Email' }));
    var emailInput = el('input', { type: 'email', className: 'wizard__input', id: 'contact-email', placeholder: 'your@email.com', autocomplete: 'email' });
    emailWrap.appendChild(emailInput);
    fields.appendChild(emailWrap);

    wrap.appendChild(fields);

    emailInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        collectContactInfo(wrap);
        goToQuestion('summary', 'forward');
      }
    });

    appendNav(wrap, q, false);
    return wrap;
  }

  function collectContactInfo(parent) {
    var n = parent.querySelector('#contact-name');
    var e = parent.querySelector('#contact-email');
    if (n && n.value.trim()) state.answers.contact_name = n.value.trim();
    if (e && e.value.trim()) state.answers.contact_email = e.value.trim();
  }

  // ── Email Capture (exploring) ──────────────

  function buildEmailCapture(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: q.label }));
    wrap.appendChild(el('h2', { className: 'wizard__question-text', textContent: q.text }));

    var sub = el('p', { textContent: "No pressure \u2014 if anything comes to mind later, I'm here." });
    sub.style.cssText = 'font-size:0.85rem;color:var(--text-body);margin-bottom:1.5rem;';
    wrap.appendChild(sub);

    var inputWrap = el('div', { className: 'wizard__input-wrap' });
    var emailInput = el('input', { type: 'email', className: 'wizard__input', id: 'explore-email', placeholder: 'your@email.com', autocomplete: 'email' });
    inputWrap.appendChild(emailInput);
    wrap.appendChild(inputWrap);

    var nav = el('div', { className: 'wizard__nav' });
    var backBtn = el('button', { className: 'wizard__btn wizard__btn--back', textContent: 'Back' });
    backBtn.addEventListener('click', function () { goBack(); });
    nav.appendChild(backBtn);

    var doneBtn = el('button', { className: 'wizard__btn wizard__btn--primary', textContent: 'Done' });
    doneBtn.addEventListener('click', function () {
      if (emailInput.value.trim()) state.answers.contact_email = emailInput.value.trim();
      showDemoComplete();
    });
    nav.appendChild(doneBtn);
    wrap.appendChild(nav);

    return wrap;
  }

  // ── Exploring Summary ──────────────────────

  function buildExploring(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: q.label }));
    wrap.appendChild(el('h2', { className: 'wizard__question-text', textContent: q.text }));

    var caps = el('div', { className: 'wizard__capabilities' });
    var capData = [
      { icon: '\u2699', label: 'Full-Stack Sites' },
      { icon: '\u2697', label: 'AI Integration' },
      { icon: '\u2606', label: 'E-Commerce' },
      { icon: '\u2601', label: 'Cloud Hosting' }
    ];
    capData.forEach(function (c) {
      var cap = el('div', { className: 'wizard__capability' }, [
        el('div', { className: 'wizard__capability-icon', textContent: c.icon }),
        el('div', { className: 'wizard__capability-label', textContent: c.label })
      ]);
      caps.appendChild(cap);
    });
    wrap.appendChild(caps);

    var desc = el('p', { textContent: 'Custom-built platforms with Astro, Solid.js, and Cloudflare. AI chatbots, booking systems, e-commerce \u2014 all running at zero monthly hosting cost.' });
    desc.style.cssText = 'font-size:0.85rem;color:var(--text-body);line-height:1.6;margin-bottom:1.5rem;';
    wrap.appendChild(desc);

    var links = el('p');
    links.style.cssText = 'font-size:0.85rem;color:var(--text-body);margin-bottom:1.5rem;';
    links.textContent = 'Check out the ';
    var guideLink = el('a', { href: 'client-guide.html', textContent: 'client guide' });
    guideLink.style.color = 'var(--gold)';
    links.appendChild(guideLink);
    links.appendChild(document.createTextNode(' or '));
    var skillLink = el('a', { href: 'skillset.html', textContent: 'full skill set' });
    skillLink.style.color = 'var(--gold)';
    links.appendChild(skillLink);
    links.appendChild(document.createTextNode(' for details.'));
    wrap.appendChild(links);

    appendNav(wrap, q, false);

    addCompanionMessage("Just having a look around? No worries at all. Here's a quick overview of what I work with.");

    return wrap;
  }

  // ── Summary ────────────────────────────────

  function buildSummary(wrap, q) {
    wrap.appendChild(el('p', { className: 'wizard__question-label', textContent: 'Your Project Brief' }));

    var briefBox = el('div', { className: 'wizard__summary-brief' });
    briefBox.appendChild(el('div', { className: 'wizard__summary-heading', textContent: 'Project Brief' }));

    var briefMap = buildBriefData();
    Object.keys(briefMap).forEach(function (key) {
      var row = el('div', { className: 'wizard__summary-item' }, [
        el('span', { className: 'wizard__summary-key', textContent: key }),
        el('span', { className: 'wizard__summary-value', textContent: briefMap[key] })
      ]);
      briefBox.appendChild(row);
    });
    wrap.appendChild(briefBox);

    // AI recommendation placeholder
    var recDiv = el('div', { className: 'wizard__recommendation', id: 'ai-recommendation' });
    recDiv.style.display = 'none';
    recDiv.appendChild(el('div', { className: 'wizard__recommendation-label', textContent: 'My Thoughts' }));
    recDiv.appendChild(el('div', { className: 'wizard__recommendation-text', id: 'recommendation-text' }));
    wrap.appendChild(recDiv);

    // Action buttons
    var actions = el('div', { className: 'wizard__actions' });
    var hasContact = state.answers.contact_name || state.answers.contact_email;

    if (hasContact) {
      var sendBtn = el('button', { className: 'wizard__btn wizard__btn--primary', id: 'btn-send', textContent: 'Send This To Me' });
      sendBtn.addEventListener('click', function () { handleRealSubmission(); });
      actions.appendChild(sendBtn);
    }

    var demoBtn = el('button', { className: 'wizard__btn wizard__btn--ghost', id: 'btn-demo', textContent: 'Done \u2014 thanks for the demo' });
    demoBtn.addEventListener('click', function () { showDemoComplete(); });
    actions.appendChild(demoBtn);
    wrap.appendChild(actions);

    // Back button
    var nav = el('div', { className: 'wizard__nav' });
    var backBtn = el('button', { className: 'wizard__btn wizard__btn--back', textContent: 'Back' });
    backBtn.addEventListener('click', function () { goBack(); });
    nav.appendChild(backBtn);
    wrap.appendChild(nav);

    requestRecommendation();

    return wrap;
  }

  // ══════════════════════════════════════════
  //  NAVIGATION
  // ══════════════════════════════════════════

  function appendNav(wrap, q, autoAdvance) {
    var nav = el('div', { className: 'wizard__nav' });

    if (state.history.length > 0) {
      var back = el('button', { className: 'wizard__btn wizard__btn--back', textContent: 'Back' });
      back.addEventListener('click', function () { goBack(); });
      nav.appendChild(back);
    } else {
      nav.appendChild(el('div'));
    }

    if (!autoAdvance) {
      var next = el('button', { className: 'wizard__btn wizard__btn--primary', textContent: 'Continue' });
      next.addEventListener('click', function () {
        // Collect text input
        var input = wrap.querySelector('.wizard__input');
        if (input && input.value.trim()) {
          state.answers[q.id] = input.value.trim();
          updateBrief(q.id, input.value.trim());
        }
        // Collect checklist
        if (q.type === 'checklist') {
          var selected = [];
          var labels = [];
          wrap.querySelectorAll('.wizard__check--selected').forEach(function (c) {
            selected.push(c.dataset.value);
            var lbl = c.querySelector('.wizard__check-label');
            if (lbl) labels.push(lbl.textContent);
          });
          state.answers[q.id] = selected;
          updateBrief(q.id, labels.join(', '));
        }
        // Collect contact
        if (q.type === 'contact') collectContactInfo(wrap);

        goToQuestion(getNextQuestion(q), 'forward');
      });
      nav.appendChild(next);
    } else {
      nav.appendChild(el('div'));
    }

    wrap.appendChild(nav);
  }

  function getNextQuestion(q) {
    if (q.branch) return q.branch(state.answers);
    return q.next;
  }

  function goToQuestion(questionId, direction) {
    if (!questionId || !QUESTIONS[questionId]) return;
    if (direction === 'forward') state.history.push(state.currentQuestion);
    renderQuestion(questionId, direction);
    if (state.currentQuestion !== 'welcome' && state.currentQuestion !== 'summary') {
      requestCompanionReaction(questionId);
    }
  }

  function goBack() {
    if (state.history.length === 0) return;
    renderQuestion(state.history.pop(), 'backward');
  }

  // ══════════════════════════════════════════
  //  PROGRESS BAR
  // ══════════════════════════════════════════

  function updateProgress() {
    var total = countQuestionsInPath();
    var answered = state.history.length;
    var pct = Math.min(100, (answered / total) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
  }

  function countQuestionsInPath() {
    var p = state.answers.what_brings_you;
    if (p === 'exploring') return 5;
    if (p === 'features') return 8;
    return 9;
  }

  // ══════════════════════════════════════════
  //  BRIEF BUILDER
  // ══════════════════════════════════════════

  var BRIEF_KEY_MAP = {
    what_brings_you: 'Project Type', business_type: 'Business', timeline: 'Timeline',
    has_branding: 'Branding', needs_ecommerce: 'E-Commerce', new_features: 'Features',
    has_content: 'Content Ready', current_url: 'Current Site', whats_wrong: 'Pain Points',
    keep_content: 'Content Plan', redesign_features: 'New Features',
    feature_list: 'Features Needed', current_stack: 'Tech Stack', urgent_need: 'Priority'
  };

  function updateBrief(questionId, displayValue) {
    var key = BRIEF_KEY_MAP[questionId];
    if (!key) return;
    state.brief[key] = displayValue;
    renderBriefPanel();
  }

  function renderBriefPanel() {
    if (!briefItems) return;

    var briefEl = document.getElementById('companion-brief');
    if (briefEl) briefEl.style.display = Object.keys(state.brief).length > 0 ? '' : 'none';

    // Clear and rebuild
    while (briefItems.firstChild) briefItems.removeChild(briefItems.firstChild);

    Object.keys(state.brief).forEach(function (key) {
      var item = el('div', { className: 'companion__brief-item companion__brief-item--new' }, [
        el('span', { className: 'companion__brief-key', textContent: key }),
        el('span', { className: 'companion__brief-value', textContent: state.brief[key] })
      ]);
      briefItems.appendChild(item);
      setTimeout(function () { item.classList.remove('companion__brief-item--new'); }, 600);
    });

    syncMobileContent();
  }

  function buildBriefData() {
    var data = {};
    Object.keys(state.brief).forEach(function (k) { data[k] = state.brief[k]; });
    if (state.answers.contact_name) data['Name'] = state.answers.contact_name;
    if (state.answers.contact_email) data['Email'] = state.answers.contact_email;
    return data;
  }

  // ══════════════════════════════════════════
  //  AI COMPANION
  // ══════════════════════════════════════════

  function addCompanionMessage(text) {
    state.companionMessages.push(text);

    var msg = el('div', { className: 'companion__message companion__message--typing' });
    typeText(msg, text);

    if (companionMessages_el) {
      companionMessages_el.appendChild(msg);
      companionMessages_el.scrollTop = companionMessages_el.scrollHeight;
    }

    if (companionMobileText) companionMobileText.textContent = text;
    syncMobileContent();
  }

  function typeText(msgEl, text) {
    var speed = text.length > 100 ? 15 : 30;
    var i = 0;
    function tick() {
      if (i < text.length) {
        msgEl.textContent += text[i];
        i++;
        setTimeout(tick, speed);
      } else {
        msgEl.classList.remove('companion__message--typing');
      }
    }
    tick();
  }

  function requestCompanionReaction(questionId) {
    if (!state.aiAvailable || aiCallCount >= MAX_AI_CALLS) {
      var fallback = getScriptedReaction(questionId);
      if (fallback) setTimeout(function () { addCompanionMessage(fallback); }, 500);
      return;
    }
    aiCallCount++;

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, AI_TIMEOUT);

    fetch(API_BASE + '/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ type: 'reaction', answers: state.answers, currentQuestion: questionId, brief: state.brief })
    })
    .then(function (res) {
      clearTimeout(timeout);
      if (!res.ok) throw new Error('AI error');
      return res.json();
    })
    .then(function (data) {
      if (data.reply) addCompanionMessage(data.reply);
    })
    .catch(function () {
      var fb = getScriptedReaction(questionId);
      if (fb) addCompanionMessage(fb);
    });
  }

  function requestRecommendation() {
    if (!state.aiAvailable) { showScriptedRecommendation(); return; }

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, AI_TIMEOUT);

    fetch(API_BASE + '/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ type: 'recommendation', answers: state.answers, brief: state.brief })
    })
    .then(function (res) { clearTimeout(timeout); if (!res.ok) throw new Error(); return res.json(); })
    .then(function (data) { if (data.reply) showRecommendation(data.reply); })
    .catch(function () { showScriptedRecommendation(); });
  }

  function showRecommendation(text) {
    var recEl = document.getElementById('ai-recommendation');
    var recText = document.getElementById('recommendation-text');
    if (recEl && recText) {
      recText.textContent = text;
      recEl.style.display = '';
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(recEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 });
      }
    }
  }

  function showScriptedRecommendation() {
    var p = state.answers.what_brings_you;
    var rec = "I'll put together some detailed thoughts once I review this properly.";
    if (p === 'new') rec = "Based on what you've described, a custom Astro build with Cloudflare hosting would give you great performance at zero monthly cost. I'd suggest starting with the core pages and adding features incrementally.";
    else if (p === 'redesign') rec = "A rebuild rather than a patch usually gives better results long-term. I'd recommend migrating to a modern stack where updates are easier and hosting costs are lower.";
    else if (p === 'features') rec = "Adding features to an existing site works best when we understand the current tech stack well. I'd want to do a quick audit first to make sure everything integrates smoothly.";
    showRecommendation(rec);
    addCompanionMessage("Here's my initial take on this \u2014 happy to dig deeper if you want to chat.");
  }

  function getScriptedReaction(questionId) {
    var a = state.answers;
    var reactions = {
      what_brings_you: null,
      business_type: function () { return a.business_type ? a.business_type + " \u2014 nice. Let me tailor the next questions to that." : null; },
      timeline: function () {
        if (a.timeline === 'now') return "Ready to go \u2014 I like that. Let's make sure we scope this properly.";
        if (a.timeline === 'weeks') return "Good call on planning ahead. Gives us time to get it right.";
        if (a.timeline === 'planning') return "No rush \u2014 smart approach. Let's figure out what you need first.";
        return null;
      },
      has_branding: function () {
        if (a.has_branding === 'no') return "Starting fresh on branding gives us more creative freedom. I can work with that.";
        return "Noted \u2014 I'll factor that into the summary.";
      },
      needs_ecommerce: function () {
        if (a.needs_ecommerce === 'yes') return "E-commerce \u2014 that's a good fit for what I do. Stripe integration, product management, the works.";
        return null;
      },
      new_features: function () { return "Good selection. Each of those integrates well with the stack I use."; },
      has_content: function () {
        if (a.has_content === 'no') return "No worries on content \u2014 I can help structure what you need. We'll sort it out.";
        return null;
      },
      current_url: function () { return "I'll take a look at that. Helps me understand what we're working with."; },
      whats_wrong: function () { return "Understood. Those are common pain points \u2014 all fixable."; },
      keep_content: null,
      redesign_features: function () { return "Noted \u2014 I'll include those in the brief."; },
      feature_list: function () { return "Good list. Let me ask a couple more things about implementation."; },
      current_stack: function () {
        if (a.current_stack === 'wordpress') return "WordPress \u2014 I know it well. There's a few ways we can approach adding to it.";
        if (a.current_stack === 'unknown') return "Not sure on the tech stack? No worries, that's my job to figure out.";
        return null;
      },
      urgent_need: function () { return "Got it \u2014 that'll be the priority in the summary."; },
      contact_capture: null
    };
    var fn = reactions[questionId];
    if (typeof fn === 'function') return fn();
    return fn || null;
  }

  // ══════════════════════════════════════════
  //  SUBMISSION
  // ══════════════════════════════════════════

  function handleRealSubmission() {
    var sendBtn = document.getElementById('btn-send');
    if (sendBtn) { sendBtn.textContent = 'Sending...'; sendBtn.style.pointerEvents = 'none'; }

    if (!state.aiAvailable) { showSuccess(); return; }

    var recText = document.getElementById('recommendation-text');
    fetch(API_BASE + '/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: state.answers.contact_name || '',
        email: state.answers.contact_email || '',
        brief: state.brief,
        recommendation: recText ? recText.textContent : ''
      })
    })
    .then(function (res) { if (!res.ok) throw new Error(); showSuccess(); })
    .catch(function () { showSuccess(); });
  }

  function showSuccess() {
    if (!wizardContainer) return;

    var btn = document.getElementById('btn-send');
    if (btn) {
      var rect = btn.getBoundingClientRect();
      createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    while (wizardContainer.firstChild) wizardContainer.removeChild(wizardContainer.firstChild);

    var successWrap = el('div', { className: 'wizard__question wizard__question--active' });
    successWrap.style.opacity = '1';
    var successInner = el('div', { className: 'wizard__success' }, [
      el('div', { className: 'wizard__success-icon' }),
      el('h2', { className: 'wizard__success-title glow-text', textContent: 'Sent' }),
      el('p', { className: 'wizard__success-text', textContent: "Your project brief is on its way. I'll take a proper look and get back to you shortly." })
    ]);
    var linkWrap = el('div');
    linkWrap.style.marginTop = '2rem';
    var backLink = el('a', { href: 'index.html', className: 'wizard__btn wizard__btn--ghost', textContent: 'Back to Portfolio' });
    linkWrap.appendChild(backLink);
    successInner.appendChild(linkWrap);
    successWrap.appendChild(successInner);
    wizardContainer.appendChild(successWrap);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(successInner, { opacity: 0, scale: 0.9, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' });
    }

    addCompanionMessage("All sent. I'll have a proper look at this and be in touch. Cheers.");
    if (progressBar) progressBar.style.width = '100%';
  }

  function showDemoComplete() {
    if (!wizardContainer) return;

    while (wizardContainer.firstChild) wizardContainer.removeChild(wizardContainer.firstChild);

    var demoWrap = el('div', { className: 'wizard__question wizard__question--active' });
    demoWrap.style.opacity = '1';
    var demoInner = el('div', { className: 'wizard__demo-complete' }, [
      el('div', { className: 'wizard__demo-label', textContent: 'Portfolio Demo' }),
      el('h2', { textContent: 'Thanks for trying it out' }),
      el('p', { className: 'wizard__demo-text', textContent: 'This is an AI-powered intake system built as a portfolio demonstration. In production, your project brief would be saved and emailed automatically.' })
    ]);
    demoInner.querySelector('h2').style.cssText = 'font-family:var(--font-display);font-size:1.3rem;color:var(--cream);margin-bottom:0.75rem;';
    var linkWrap = el('div');
    linkWrap.style.marginTop = '1.5rem';
    linkWrap.appendChild(el('a', { href: 'index.html', className: 'wizard__btn wizard__btn--ghost', textContent: 'Back to Portfolio' }));
    demoInner.appendChild(linkWrap);
    demoWrap.appendChild(demoInner);
    wizardContainer.appendChild(demoWrap);

    if (typeof gsap !== 'undefined') {
      gsap.fromTo(demoInner, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    }

    addCompanionMessage("Cheers for checking it out. If a real project comes to mind, you know where to find me.");
    if (progressBar) progressBar.style.width = '100%';
  }

  // ══════════════════════════════════════════
  //  PARTICLE BURST
  // ══════════════════════════════════════════

  function createParticleBurst(x, y) {
    for (var i = 0; i < 20; i++) {
      var p = el('div', { className: 'success-particle' });
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      document.body.appendChild(p);

      var angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5;
      var velocity = 80 + Math.random() * 120;
      var targetX = x + Math.cos(angle) * velocity;
      var targetY = y + Math.sin(angle) * velocity - 30;

      if (typeof gsap !== 'undefined') {
        (function (particle, tx, ty) {
          gsap.to(particle, {
            left: tx, top: ty + 60, opacity: 0, scale: 0,
            duration: 1 + Math.random() * 0.5, ease: 'power2.out',
            onComplete: function () { particle.remove(); }
          });
        })(p, targetX, targetY);
      } else {
        (function (particle) { setTimeout(function () { particle.remove(); }, 1500); })(p);
      }
    }
  }

  // ══════════════════════════════════════════
  //  MOBILE COMPANION
  // ══════════════════════════════════════════

  function initMobileDrawer() {
    var bar = document.getElementById('companion-mobile-bar');
    if (!bar) return;
    bar.addEventListener('click', function () {
      state.mobileDrawerOpen = !state.mobileDrawerOpen;
      var drawer = document.getElementById('companion-mobile-drawer');
      if (drawer) drawer.classList.toggle('companion-mobile__drawer--open', state.mobileDrawerOpen);
    });
  }

  function syncMobileContent() {
    if (!companionMobileContent) return;

    while (companionMobileContent.firstChild) companionMobileContent.removeChild(companionMobileContent.firstChild);

    // Clone messages
    if (companionMessages_el) {
      var msgClone = companionMessages_el.cloneNode(true);
      companionMobileContent.appendChild(msgClone);
    }

    // Clone brief
    if (briefItems && Object.keys(state.brief).length > 0) {
      var briefClone = briefItems.parentElement.cloneNode(true);
      companionMobileContent.appendChild(briefClone);
    }
  }

  // ══════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
