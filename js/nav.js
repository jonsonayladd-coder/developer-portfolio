/* ============================================
   ALL GOOD NOW — Portfolio V2 Navigation
   Fixed nav, scroll spy, hamburger, page state
   ============================================ */

(function () {
  'use strict';

  const nav = document.querySelector('.site-nav');
  if (!nav) return;

  const toggle = nav.querySelector('.nav-toggle');
  const linksList = nav.querySelector('.site-nav__links');
  const links = nav.querySelectorAll('.site-nav__link');

  // ── Show nav after scrolling past hero ──
  let lastScroll = 0;
  let navVisible = false;
  const SHOW_THRESHOLD = 80;

  function updateNavVisibility() {
    const scrollY = window.scrollY;

    if (scrollY > SHOW_THRESHOLD && !navVisible) {
      nav.classList.add('site-nav--visible');
      navVisible = true;
    } else if (scrollY <= SHOW_THRESHOLD && navVisible) {
      nav.classList.remove('site-nav--visible');
      navVisible = false;
      // Close mobile menu if open
      if (linksList.classList.contains('site-nav__links--open')) {
        closeMobileMenu();
      }
    }

    lastScroll = scrollY;
  }

  window.addEventListener('scroll', updateNavVisibility, { passive: true });
  updateNavVisibility(); // check on load

  // ── Hamburger toggle ──
  function closeMobileMenu() {
    linksList.classList.remove('site-nav__links--open');
    toggle.classList.remove('nav-toggle--open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const isOpen = linksList.classList.toggle('site-nav__links--open');
      toggle.classList.toggle('nav-toggle--open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // Close mobile menu when a link is clicked
  links.forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMobileMenu();
      }
    });
  });

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && linksList.classList.contains('site-nav__links--open')) {
      closeMobileMenu();
    }
  });

  // ── Scroll spy (for same-page sections) ──
  const sections = document.querySelectorAll('.section[id]');

  if (sections.length > 0) {
    function updateScrollSpy() {
      const scrollPos = window.scrollY + 120; // offset for fixed nav

      let current = '';
      sections.forEach((section) => {
        if (section.offsetTop <= scrollPos) {
          current = section.id;
        }
      });

      links.forEach((link) => {
        const href = link.getAttribute('href');
        if (href && href.includes('#')) {
          const hash = href.split('#')[1];
          link.classList.toggle('site-nav__link--active', hash === current);
        }
      });
    }

    window.addEventListener('scroll', updateScrollSpy, { passive: true });
    updateScrollSpy();
  }

  // ── Mark current page in nav ──
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
      const linkPage = href.split('/').pop().split('#')[0];
      if (linkPage === currentPage) {
        link.classList.add('site-nav__link--active');
      }
    }
  });

  // ── Keyboard: Escape closes mobile menu ──
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && linksList.classList.contains('site-nav__links--open')) {
      closeMobileMenu();
      toggle.focus();
    }
  });

})();
