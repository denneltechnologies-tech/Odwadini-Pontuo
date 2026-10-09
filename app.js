/**
 * Odwadini Mpuntuo — Market Women Wellness & Fun Day
 * A 360 Group Ltd Initiative
 * Master Client Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initRouting();
  initCountdown();
  initAnimatedCounters();
  initMobileNav();
  initMembershipSwitch();
  initPassLiveSync();
});

function initMembershipSwitch() {
  const firstBtn = document.querySelector('.membership-type-btn');
  if (firstBtn) setMembershipType(membershipType, firstBtn);
}

/* ==========================================================================
   1. VIEW ROUTING (Single Page Application Multi-View Handler)
   ========================================================================== */
function switchView(viewName) {
  const views = document.querySelectorAll('.page-view');
  const navLinks = document.querySelectorAll('.nav-link');
  
  // Clean active states
  views.forEach(v => v.classList.remove('active-view'));
  navLinks.forEach(n => n.classList.remove('active'));

  // Target view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active-view');
    window.location.hash = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update nav active link
    const activeNav = document.querySelector(`.nav-link[data-nav="${viewName}"]`);
    if (activeNav) {
      activeNav.classList.add('active');
    }
  }

  // Close mobile drawer if open
  const navMenu = document.getElementById('navMenu');
  if (navMenu && navMenu.classList.contains('open')) {
    navMenu.classList.remove('open');
  }
}

function initRouting() {
  // Listen to hash changes (e.g. browser back/forward)
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'home';
    const target = document.getElementById(`view-${hash}`);
    if (target) {
      switchView(hash);
    }
  });

  // Initial load
  const initialHash = window.location.hash.replace('#', '') || 'home';
  if (document.getElementById(`view-${initialHash}`)) {
    switchView(initialHash);
  }
}

/* ==========================================================================
   2. THEME SWITCHER (Dark & Light Mode with Persistence)
   ========================================================================== */
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const sunIcon = document.getElementById('themeIconSun');
  const moonIcon = document.getElementById('themeIconMoon');
  const root = document.documentElement;

  const savedTheme = localStorage.getItem('odw_theme') || 'light';
  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentTheme = root.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(newTheme);
      localStorage.setItem('odw_theme', newTheme);
      showToast(`Switched to ${newTheme.toUpperCase()} mode`, 'gold');
    });
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    } else {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
  }
}

/* ==========================================================================
   3. MOBILE NAVIGATION DRAWER
   ========================================================================== */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navMenu = document.getElementById('navMenu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target) && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
      }
    });
  }
}

/* ==========================================================================
   4. ODWADINI MPUNTUO COUNTDOWN CLOCK
   ========================================================================== */
function initCountdown() {
  // Target: Workers' Day — 1 May 2026, 6:00 AM Ghana time (GMT / UTC+0)
  const targetDate = new Date('2026-05-01T06:00:00+00:00').getTime();

  function update() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      const daysEl = document.getElementById('cd-days');
      if (daysEl) daysEl.innerText = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const dEl = document.getElementById('cd-days');
    const hEl = document.getElementById('cd-hours');
    const mEl = document.getElementById('cd-minutes');
    const sEl = document.getElementById('cd-seconds');

    if (dEl) dEl.innerText = String(days).padStart(2, '0');
    if (hEl) hEl.innerText = String(hours).padStart(2, '0');
    if (mEl) mEl.innerText = String(minutes).padStart(2, '0');
    if (sEl) sEl.innerText = String(seconds).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

/* ==========================================================================
   5. LIVE ANIMATED NUMBER COUNTERS
   ========================================================================== */
function initAnimatedCounters() {
  const statElements = document.querySelectorAll('[data-target]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateValue(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  statElements.forEach(el => observer.observe(el));

  function animateValue(obj) {
    const rawTarget = obj.getAttribute('data-target');
    if (!rawTarget) return;
    const target = parseInt(rawTarget, 10);
    const prefix = obj.getAttribute('data-prefix') || '';
    const suffix = obj.getAttribute('data-suffix') != null ? obj.getAttribute('data-suffix') : '+';
    const duration = 1600;
    const start = 0;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * (target - start) + start);

      obj.innerText = `${prefix}${current.toLocaleString()}${suffix}`;

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }
}

/* ==========================================================================
   6. MODAL DIALOGS MANAGEMENT
   ========================================================================== */
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

// Close when clicking modal backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModals = document.querySelectorAll('.modal-backdrop.open');
    openModals.forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
});

/* ==========================================================================
   7. MEMBERSHIP — INDIVIDUAL / ASSOCIATION SWITCH
   ========================================================================== */
let membershipType = 'Individual';

function setMembershipType(type, buttonEl) {
  membershipType = type;

  // Toggle switch buttons
  const buttons = document.querySelectorAll('.membership-type-btn');
  buttons.forEach(b => b.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active');

  // Show correct fieldset, clear the hidden one so stale values aren't submitted
  document.querySelectorAll('.membership-fieldset').forEach((fs) => {
    const isTarget = fs.getAttribute('data-fieldset') === type;
    fs.style.display = isTarget ? '' : 'none';
    fs.querySelectorAll('input, select, textarea').forEach((el) => {
      if (isTarget) {
        el.setAttribute('required', '');
      } else {
        el.removeAttribute('required');
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else el.value = '';
      }
    });
  });
}

/* ==========================================================================
   8. PACKAGES & PARTNERSHIP
   ========================================================================== */
function selectPackage(packageName) {
  const target = `${packageName} Partner`;
  const selects = [
    document.getElementById('modalPartnerPackageSelect'),
    document.getElementById('partnerPackageSelect')
  ];
  selects.forEach((select) => {
    if (!select) return;
    for (const opt of select.options) {
      if (opt.text.startsWith(packageName)) { select.value = opt.value; break; }
    }
  });
  openModal('modal-partner');
}

function handlePartnerSubmit(e) {
  e.preventDefault();
  const data = collectFields(e.target);
  const inModal = !!e.target.closest('.modal-backdrop');
  if (inModal) closeModal('modal-partner');
  e.target.reset();
  submitToServer('partner', data).then((ref) => {
    showToast(`✓ Partnership inquiry received (Ref: ${ref || 'PRN'}). Our team will confirm your package within 24 hours.`, 'gold', 6000);
  });
}

/* ==========================================================================
   9. DONATIONS
   ========================================================================== */
function selectDonation(amount, buttonEl) {
  const input = document.getElementById('donationAmount');
  if (input) input.value = amount;

  const buttons = document.querySelectorAll('.preset-amount-button');
  buttons.forEach(b => b.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active');
}

let selectedMomoNetwork = 'MTN MoMo';

function selectMomoNet(network, btnEl) {
  selectedMomoNetwork = network;
  const chips = document.querySelectorAll('.momo-chip');
  chips.forEach(c => c.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
}

function handleDonateSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = collectFields(form);
  const amount = document.getElementById('donationAmount') ? document.getElementById('donationAmount').value : '';
  if (amount) data.amount = `GHS ${amount}`;
  data.momoNetwork = selectedMomoNetwork;

  form.reset();
  const defaultPreset = document.querySelector('.preset-amount-button');
  document.querySelectorAll('.preset-amount-button').forEach(b => b.classList.remove('active'));
  if (defaultPreset) defaultPreset.classList.add('active');

  submitToServer('donate', data).then((ref) => {
    launchConfetti();
    showToast(`🌟 Pledge of ${data.amount || 'contribution'} logged via ${selectedMomoNetwork} (Ref: ${ref || 'GIV'}). Medaase!`, 'gold', 6500);
  });
}

/* ==========================================================================
   10. INTERACTIVE FORM SUBMISSIONS (persisted to /api/submissions)
   ========================================================================== */

// Collect every labelled field in a form into a plain object
function collectFields(form) {
  const data = {};
  const els = form.querySelectorAll('input, select, textarea');
  els.forEach((el) => {
    if (el.type === 'hidden' || el.type === 'button' || el.type === 'submit') return;
    const value = (el.value || '').trim();
    if (!value) return;

    let key = '';
    const group = el.closest('.form-group');
    const label = group ? group.querySelector('label') : null;
    if (el.name) key = el.name;
    else if (label) key = label.textContent;
    else if (el.placeholder) key = el.placeholder;
    if (!key) return;

    key = key.replace(/\*/g, '').trim()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(/\s+/)
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');

    if (key === 'emailAddress') key = 'email';
    if (!data[key]) data[key] = value;
  });
  return data;
}

// POST a submission to the server; returns reference code or null when offline
async function submitToServer(type, data) {
  try {
    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data })
    });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    return json.reference || null;
  } catch (err) {
    return null;
  }
}

function handleMemberSubmit(e) {
  e.preventDefault();
  const data = collectFields(e.target);
  data.membershipType = membershipType;
  e.target.reset();
  submitToServer('member', data).then((ref) => {
    launchConfetti();
    showToast(`🎉 Registration complete! Your official pass reference is ${ref || 'MBR-2026'}. See you on 1 May at Makola Market!`, 'gold', 7500);
  });
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const data = collectFields(e.target);
  closeModal('modal-register');
  e.target.reset();
  submitToServer('member', data).then((ref) => {
    launchConfetti();
    showToast(`✓ You're registered! Reference: ${ref || 'MBR-2026'} — free admission on 1 May, 6 AM at Makola Market.`, 'gold', 7000);
  });
}

function handleContactSubmit(e) {
  e.preventDefault();
  const data = collectFields(e.target);
  e.target.reset();
  submitToServer('contact', data).then((ref) => {
    showToast(`✓ Message sent to the 360 Group Ltd team (Ref: ${ref || 'MSG'}). We will respond within 24 hours.`, 'default', 5000);
  });
}

function handleNewsletterSubmit(e) {
  e.preventDefault();
  const data = collectFields(e.target);
  e.target.reset();
  submitToServer('newsletter', data).then(() => {
    showToast('✓ Subscribed! You will receive Odwadini Mpuntuo event updates.', 'gold', 4500);
  });
}

/* --- Landing page (social media lead capture) --- */

function prefillLead(interest) {
  const sel = document.getElementById('leadInterest');
  if (sel && interest) sel.value = interest;
  const section = document.getElementById('capture');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleLeadSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const consent = document.getElementById('leadConsent');
  if (consent && !consent.checked) {
    showToast('Please tick the consent box so we can contact you.', 'gold');
    return;
  }

  const data = collectFields(form);
  const btn = document.getElementById('leadSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

  submitToServer('lead', data).then((ref) => {
    if (btn) { btn.disabled = false; btn.textContent = 'Send My Details'; }
    if (ref) {
      const refEl = document.getElementById('leadRef');
      if (refEl) refEl.textContent = ref;
      form.style.display = 'none';
      const success = document.getElementById('leadSuccess');
      if (success) {
        success.style.display = 'block';
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      showToast('Could not reach the server. Please check your connection and try again.', '', 5500);
    }
  });
}

/* ==========================================================================
   11. TOAST NOTIFICATION ENGINE
   ========================================================================= */
function showToast(message, type = 'default', duration = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'gold' ? 'gold' : ''}`;
  toast.innerHTML = `
    <span style="font-size:1.2rem;">${type === 'gold' ? '🌟' : '🔔'}</span>
    <span style="font-size:0.92rem; font-weight:600; line-height:1.4;">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 350);
  }, duration);
}

/* ==========================================================================
   12. INTERACTIVE EVENT PHOTO GALLERY & LIGHTBOX
   ========================================================================== */
function filterGallery(category, buttonEl) {
  const cards = document.querySelectorAll('.gallery-card');
  const buttons = document.querySelectorAll('.gallery-filter-btn');

  buttons.forEach(b => b.classList.remove('active'));
  if (buttonEl) buttonEl.classList.add('active');

  cards.forEach(card => {
    const cardCat = card.getAttribute('data-cat');
    if (category === 'all' || cardCat === category) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function openLightbox(imgSrc, caption) {
  const modal = document.getElementById('lightboxModal');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  if (!modal || !img) return;

  img.src = imgSrc;
  if (cap) cap.textContent = caption || 'Odwadini Mpuntuo — Makola Market';
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
  if (event && event.target && (event.target.id === 'lightboxImg' || event.target.id === 'lightboxCaption')) {
    return;
  }
  const modal = document.getElementById('lightboxModal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ==========================================================================
   13. DIGITAL PARTICIPANT PASS LIVE SYNC
   ========================================================================== */
function initPassLiveSync() {
  const memberForm = document.getElementById('memberForm');
  if (!memberForm) return;

  const nameInput = memberForm.querySelector('input[placeholder*="Akosua"]');
  const locationInput = memberForm.querySelector('input[placeholder*="Makola Market"]');
  const sectorInput = memberForm.querySelector('input[placeholder*="Food trader"]');

  const previewName = document.getElementById('previewPassName');
  const previewLoc = document.getElementById('previewPassLocation');
  const previewSector = document.getElementById('previewPassSector');

  if (nameInput && previewName) {
    nameInput.addEventListener('input', (e) => {
      previewName.textContent = e.target.value.trim() || 'Akosua Mensah';
    });
  }
  if (locationInput && previewLoc) {
    locationInput.addEventListener('input', (e) => {
      previewLoc.textContent = e.target.value.trim() || 'Makola Market';
    });
  }
  if (sectorInput && previewSector) {
    sectorInput.addEventListener('input', (e) => {
      previewSector.textContent = e.target.value.trim() || 'Food Trader';
    });
  }
}

/* ==========================================================================
   14. INTERACTIVE FAQ ACCORDION
   ========================================================================== */
function toggleFaq(questionEl) {
  const item = questionEl.closest('.faq-item');
  if (!item) return;

  const isOpen = item.classList.contains('open');
  // Optional: close siblings
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

  if (!isOpen) {
    item.classList.add('open');
  }
}

/* ==========================================================================
   15. CELEBRATORY CONFETTI ENGINE (Native Canvas Physics)
   ========================================================================== */
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#0e3d2f', '#cba342', '#f3c053', '#8e1c25', '#25D366', '#ffffff'];
  const confettiCount = 120;
  const particles = [];

  for (let i = 0; i < confettiCount; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.8) * 18,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 10,
      gravity: 0.35,
      alpha: 1
    });
  }

  let animationFrame;
  const startTime = performance.now();

  function render(time) {
    const elapsed = time - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.rSpeed;
      if (elapsed > 1800) {
        p.alpha -= 0.015;
      }

      if (p.alpha > 0 && p.y < canvas.height + 20) {
        activeCount++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (activeCount > 0 && elapsed < 3500) {
      animationFrame = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  requestAnimationFrame(render);
}
