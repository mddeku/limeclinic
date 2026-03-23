/* ============================================================
   LIME CLINIC — Main JavaScript
   ============================================================ */

// ============================================================
// UTILITY
// ============================================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ============================================================
// NAV SCROLL EFFECT
// ============================================================
function initNav() {
  const nav = $('.nav');
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Highlight active link
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  $$('.nav__links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ============================================================
// HAMBURGER MOBILE MENU
// ============================================================
function initHamburger() {
  const burger = $('.nav__burger');
  const mobileMenu = $('.nav__mobile');
  if (!burger || !mobileMenu) return;

  burger.addEventListener('click', () => {
    const isOpen = burger.classList.toggle('open');
    if (isOpen) {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  // Close on link click
  $$('.nav__mobile a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!burger.contains(e.target) && !mobileMenu.contains(e.target)) {
      burger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

// ============================================================
// FAQ ACCORDION
// ============================================================
function initFAQ() {
  $$('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    if (!q) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all
      $$('.faq-item').forEach(i => i.classList.remove('open'));
      // Open clicked if was closed
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ============================================================
// BOOKING MODAL
// ============================================================
const BookingModal = (() => {
  let currentStep = 1;
  const totalSteps = 4;
  let selectedDoctor = '';
  let selectedDate = null;
  let selectedTime = '';
  let calYear, calMonth;

  const TIMES = ['08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'];
  const BUSY  = ['09:00','10:30','14:30','16:00'];

  function getOverlay() { return $('.modal-overlay'); }
  function getCard() { return $('.modal-card'); }

  function open(doctorName) {
    const overlay = getOverlay();
    if (!overlay) return;
    selectedDoctor = doctorName || '';
    currentStep = 1;
    selectedDate = null;
    selectedTime = '';
    initCalendar();
    renderSteps();
    renderDoctors();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Pre-select doctor if provided
    if (doctorName) {
      setTimeout(() => {
        $$('.doc-select-card').forEach(card => {
          if (card.dataset.doctor === doctorName) {
            card.classList.add('selected');
            selectedDoctor = doctorName;
          }
        });
      }, 50);
    }
  }

  function close() {
    const overlay = getOverlay();
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderSteps() {
    // Update dots
    $$('.step-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      if (i + 1 === currentStep) dot.classList.add('active');
      if (i + 1 < currentStep) dot.classList.add('done');
    });
    // Update lines
    $$('.step-line').forEach((line, i) => {
      line.classList.toggle('done', i + 1 < currentStep);
    });
    // Update step labels
    $$('.step-labels span').forEach((lbl, i) => {
      lbl.classList.toggle('active', i + 1 === currentStep);
    });
    // Show/hide steps
    $$('.modal-step').forEach((step, i) => {
      step.classList.toggle('active', i + 1 === currentStep);
    });
    // Update nav buttons
    updateNavButtons();
  }

  function updateNavButtons() {
    const prevBtn = $('#modal-prev');
    const nextBtn = $('#modal-next');
    if (!prevBtn || !nextBtn) return;

    if (currentStep === 1) {
      prevBtn.style.display = 'none';
    } else {
      prevBtn.style.display = '';
    }

    if (currentStep === totalSteps) {
      nextBtn.textContent = 'Подтвердить запись';
      nextBtn.innerHTML = '<i class="fa-solid fa-check"></i> Подтвердить запись';
    } else {
      nextBtn.innerHTML = 'Далее <i class="fa-solid fa-arrow-right"></i>';
    }
  }

  function next() {
    if (currentStep === totalSteps) {
      submitForm();
      return;
    }
    if (!validateStep()) return;
    currentStep++;
    renderSteps();
    if (currentStep === 3) renderCalendar();
    if (currentStep === 3 && selectedDate) renderTimeSlots();
  }

  function prev() {
    if (currentStep === 1) return;
    currentStep--;
    renderSteps();
    if (currentStep === 3) renderCalendar();
  }

  function validateStep() {
    if (currentStep === 1) {
      if (!selectedDoctor) {
        alert('Пожалуйста, выберите врача');
        return false;
      }
    }
    if (currentStep === 3) {
      if (!selectedDate) {
        alert('Пожалуйста, выберите дату');
        return false;
      }
      if (!selectedTime) {
        alert('Пожалуйста, выберите время');
        return false;
      }
    }
    return true;
  }

  function renderDoctors() {
    const container = $('#modal-doctors');
    if (!container) return;
    const doctors = [
      { name: 'Жанбырбекұлы Уланбек', spec: 'Андролог, Уролог, Детский андролог, Детский уролог', color: 'linear-gradient(135deg,#7ED957,#3a8c20)' },
      { name: 'Леонтьев Андриан Олегович', spec: 'Андролог, Уролог, Детский андролог, Детский уролог', color: 'linear-gradient(135deg,#5bc8af,#1a5c50)' },
    ];
    container.innerHTML = doctors.map(d => `
      <div class="doc-select-card" data-doctor="${d.name}" onclick="BookingModal._selectDoctor(this,'${d.name}')">
        <div class="doc-select-avatar" style="background:${d.color}"><i class="fa-solid fa-user-doctor"></i></div>
        <div class="doc-select-info">
          <strong>${d.name}</strong>
          <span>${d.spec}</span>
        </div>
        <div class="doc-select-check"></div>
      </div>
    `).join('');

    // Re-select if already selected
    if (selectedDoctor) {
      $$('.doc-select-card', container).forEach(card => {
        if (card.dataset.doctor === selectedDoctor) card.classList.add('selected');
      });
    }
  }

  function _selectDoctor(el, name) {
    $$('.doc-select-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedDoctor = name;
  }

  function initCalendar() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
  }

  function renderCalendar() {
    const container = $('#modal-calendar');
    if (!container) return;

    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

    const today = new Date();
    today.setHours(0,0,0,0);

    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon=0

    let html = `
      <div class="cal-nav">
        <div class="cal-nav-btn" onclick="BookingModal._prevMonth()"><i class="fa-solid fa-chevron-left"></i></div>
        <h3>${monthNames[calMonth]} ${calYear}</h3>
        <div class="cal-nav-btn" onclick="BookingModal._nextMonth()"><i class="fa-solid fa-chevron-right"></i></div>
      </div>
      <div class="cal-grid">
    `;
    dayNames.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });

    // Empty cells before first day
    for (let i = 0; i < startDow; i++) {
      html += `<div class="cal-day empty"></div>`;
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(calYear, calMonth, d);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      const isSunday = date.getDay() === 0;
      const isDisabled = isPast || isSunday;
      const isSelected = selectedDate && selectedDate.getTime() === date.getTime();

      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (isDisabled) cls += ' disabled';
      if (isSelected) cls += ' selected';

      const onclick = isDisabled ? '' : `onclick="BookingModal._selectDate(${calYear},${calMonth},${d})"`;
      html += `<div class="${cls}" ${onclick}>${d}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    // Render time slots if date is selected
    renderTimeSlots();
  }

  function _prevMonth() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  }

  function _nextMonth() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  }

  function _selectDate(y, m, d) {
    selectedDate = new Date(y, m, d);
    selectedTime = '';
    renderCalendar();
  }

  function renderTimeSlots() {
    const container = $('#modal-times');
    if (!container) return;
    if (!selectedDate) {
      container.innerHTML = '<p style="color:var(--gray);font-size:14px;">Сначала выберите дату</p>';
      return;
    }
    container.innerHTML = '<div class="time-slots">' + TIMES.map(t => {
      const isBusy = BUSY.includes(t);
      const isSelected = t === selectedTime;
      let cls = 'time-slot';
      if (isBusy) cls += ' busy';
      if (isSelected) cls += ' selected';
      const onclick = isBusy ? '' : `onclick="BookingModal._selectTime('${t}')"`;
      return `<div class="${cls}" ${onclick}>${t}</div>`;
    }).join('') + '</div>';
  }

  function _selectTime(t) {
    selectedTime = t;
    renderTimeSlots();
  }

  function submitForm() {
    const name = $('#modal-name');
    const phone = $('#modal-phone');

    if (!name || !name.value.trim()) {
      name && name.classList.add('error');
      name && name.focus();
      return;
    }
    if (!phone || !phone.value.trim()) {
      phone && phone.classList.add('error');
      phone && phone.focus();
      return;
    }
    const checkbox = $('#modal-privacy');
    if (checkbox && !checkbox.checked) {
      alert('Пожалуйста, согласитесь с политикой конфиденциальности');
      return;
    }

    // Show success
    const card = getCard();
    if (!card) return;
    const dateStr = selectedDate ? selectedDate.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' }) : '—';
    card.innerHTML = `
      <button class="modal-close" onclick="BookingModal.close()"><i class="fa-solid fa-xmark"></i></button>
      <div class="modal-success">
        <div class="success-icon"><i class="fa-solid fa-check"></i></div>
        <h3>Запись подтверждена!</h3>
        <p>Мы свяжемся с вами для подтверждения записи.</p>
        <div class="success-details">
          <p><strong>Врач:</strong> ${selectedDoctor || '—'}</p>
          <p><strong>Дата:</strong> ${dateStr}</p>
          <p><strong>Время:</strong> ${selectedTime || '—'}</p>
          <p><strong>Пациент:</strong> ${name ? name.value : '—'}</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          <button class="btn-primary" onclick="BookingModal.close()"><i class="fa-solid fa-house"></i> На главную</button>
          <button class="btn-ghost" onclick="addToCalendar()"><i class="fa-solid fa-calendar-plus"></i> В календарь</button>
        </div>
      </div>
    `;
  }

  function init() {
    const overlay = getOverlay();
    if (!overlay) return;

    // Close on overlay click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    // Close button
    const closeBtn = $('.modal-close');
    if (closeBtn) closeBtn.addEventListener('click', close);

    // Nav buttons
    const prevBtn = $('#modal-prev');
    const nextBtn = $('#modal-next');
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    // Input error removal
    $$('.form-control').forEach(input => {
      input.addEventListener('input', () => input.classList.remove('error'));
    });

    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
  }

  return { open, close, init, _selectDoctor, _prevMonth, _nextMonth, _selectDate, _selectTime };
})();

// Global alias
window.BookingModal = BookingModal;

// ============================================================
// OPEN BOOKING FROM BUTTONS
// ============================================================
function initBookingButtons() {
  $$('[data-booking]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const doctor = btn.dataset.bookingDoctor || '';
      BookingModal.open(doctor);
    });
  });
}

// ============================================================
// SMOOTH SCROLL
// ============================================================
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function countUp(el, target, duration = 1800) {
  const isFloat = target % 1 !== 0;
  const start = performance.now();
  const from = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease out cubic
    const current = from + (target - from) * ease;
    el.textContent = isFloat
      ? current.toFixed(1)
      : Math.round(current).toLocaleString('ru-RU');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('ru-RU');
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        countUp(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  counters.forEach(el => observer.observe(el));
}

// ============================================================
// SCROLL REVEAL (AOS-like)
// ============================================================
function initScrollReveal() {
  const elements = $$('[data-reveal]');
  if (!elements.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ============================================================
// MOBILE STICKY CTA
// ============================================================
function initMobileCTA() {
  const cta = $('.mobile-cta');
  if (!cta) return;

  const onScroll = () => {
    if (window.scrollY > 300) {
      cta.classList.add('visible');
    } else {
      cta.classList.remove('visible');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ============================================================
// PRICE FILTER (prices.html)
// ============================================================
function initPriceFilter() {
  const filterCat = $('#price-cat-filter');
  const filterSort = $('#price-sort-filter');
  const searchInput = $('#price-search');
  const tableBody = $('#price-tbody');
  if (!tableBody) return;

  const allRows = $$('tr[data-cat]', tableBody);

  function applyFilters() {
    const cat = filterCat ? filterCat.value : 'all';
    const sort = filterSort ? filterSort.value : '';
    const search = searchInput ? searchInput.value.toLowerCase() : '';

    let rows = allRows.filter(row => {
      const rowCat = row.dataset.cat || '';
      const text = row.textContent.toLowerCase();
      const catMatch = cat === 'all' || rowCat === cat;
      const searchMatch = !search || text.includes(search);
      return catMatch && searchMatch;
    });

    // Sort
    if (sort === 'asc' || sort === 'desc') {
      rows.sort((a, b) => {
        const pa = parseInt(a.dataset.price || '0');
        const pb = parseInt(b.dataset.price || '0');
        return sort === 'asc' ? pa - pb : pb - pa;
      });
    }

    // Show/hide
    allRows.forEach(row => { row.style.display = 'none'; });
    rows.forEach(row => { row.style.display = ''; });

    // Hide/show category headers
    $$('tr.price-cat-header', tableBody).forEach(header => {
      const next = header.nextElementSibling;
      if (!next || next.style.display === 'none') {
        header.style.display = 'none';
      } else {
        header.style.display = '';
      }
    });

    // No results
    let noResults = $('#no-results-row');
    if (rows.length === 0) {
      if (!noResults) {
        noResults = document.createElement('tr');
        noResults.id = 'no-results-row';
        noResults.className = 'no-results-row';
        noResults.innerHTML = '<td colspan="3"><i class="fa-solid fa-search" style="margin-right:8px;color:var(--lime-dark)"></i>Ничего не найдено</td>';
        tableBody.appendChild(noResults);
      }
      noResults.style.display = '';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  }

  if (filterCat) filterCat.addEventListener('change', applyFilters);
  if (filterSort) filterSort.addEventListener('change', applyFilters);
  if (searchInput) searchInput.addEventListener('input', applyFilters);
}

// ============================================================
// BLOG SEARCH & FILTER (blog.html)
// ============================================================
function initBlogFilter() {
  const searchInput = $('#blog-search');
  const filterTags = $$('.filter-tag');
  const cards = $$('.blog-card[data-cat]');
  if (!cards.length) return;

  let activeTag = 'all';

  function applyFilter() {
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    cards.forEach(card => {
      const cat = card.dataset.cat || '';
      const text = card.textContent.toLowerCase();
      const catMatch = activeTag === 'all' || cat === activeTag;
      const searchMatch = !search || text.includes(search);
      card.style.display = (catMatch && searchMatch) ? '' : 'none';
    });
  }

  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      activeTag = tag.dataset.cat || 'all';
      applyFilter();
    });
  });

  if (searchInput) searchInput.addEventListener('input', applyFilter);
}

// ============================================================
// SERVICES CATEGORY TABS (services.html)
// ============================================================
function initServiceTabs() {
  const tabs = $$('.cat-tab');
  const cats = $$('.service-category');
  if (!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.cat;
      cats.forEach(cat => {
        cat.classList.toggle('active', cat.dataset.cat === target);
      });
    });
  });
}

// ============================================================
// PAGE BOOKING FORM (booking.html standalone)
// ============================================================
function initPageBookingForm() {
  const form = $('#page-booking-form');
  if (!form) return;

  let currentStep = 1;
  const totalSteps = 5;

  function gotoStep(step) {
    $$('.page-booking-step').forEach((s, i) => {
      s.classList.toggle('active', i + 1 === step);
    });
    $$('.page-step').forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i + 1 === step) s.classList.add('active');
      if (i + 1 < step) s.classList.add('done');
    });
    currentStep = step;
    // Scroll to top of form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $$('[data-page-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep < totalSteps) gotoStep(currentStep + 1);
    });
  });

  $$('[data-page-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentStep > 1) gotoStep(currentStep - 1);
    });
  });

  // Doctor selection
  $$('.doc-radio-card').forEach(card => {
    card.addEventListener('click', () => {
      $$('.doc-radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // Time slots in page form
  $$('.page-time-slot').forEach(slot => {
    if (slot.classList.contains('busy')) return;
    slot.addEventListener('click', () => {
      $$('.page-time-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
    });
  });

  // Submit
  const submitBtn = $('#page-submit-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const name = $('#page-name');
      const phone = $('#page-phone');
      if (name && !name.value.trim()) {
        name.classList.add('error');
        name.focus();
        return;
      }
      if (phone && !phone.value.trim()) {
        phone.classList.add('error');
        phone.focus();
        return;
      }
      gotoStep(5);
    });
  }

  // Init page calendar
  initPageCalendar();
}

function initPageCalendar() {
  const container = $('#page-calendar');
  if (!container) return;

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  let now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  let selectedDate = null;

  function render() {
    const today = new Date();
    today.setHours(0,0,0,0);
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay();
    startDow = startDow === 0 ? 6 : startDow - 1;

    let html = `
      <div class="cal-nav">
        <div class="cal-nav-btn" id="page-cal-prev"><i class="fa-solid fa-chevron-left"></i></div>
        <h3>${monthNames[month]} ${year}</h3>
        <div class="cal-nav-btn" id="page-cal-next"><i class="fa-solid fa-chevron-right"></i></div>
      </div>
      <div class="cal-grid">
    `;
    dayNames.forEach(d => { html += `<div class="cal-day-name">${d}</div>`; });
    for (let i = 0; i < startDow; i++) html += `<div class="cal-day empty"></div>`;
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today;
      const isSunday = date.getDay() === 0;
      const isDisabled = isPast || isSunday;
      const isSelected = selectedDate && selectedDate.getTime() === date.getTime();
      let cls = 'cal-day';
      if (isToday) cls += ' today';
      if (isDisabled) cls += ' disabled';
      if (isSelected) cls += ' selected';
      const onclick = isDisabled ? '' : `data-d="${year}-${month}-${d}"`;
      html += `<div class="${cls}" ${onclick}>${d}</div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    // Events
    document.getElementById('page-cal-prev').addEventListener('click', () => {
      month--;
      if (month < 0) { month = 11; year--; }
      render();
    });
    document.getElementById('page-cal-next').addEventListener('click', () => {
      month++;
      if (month > 11) { month = 0; year++; }
      render();
    });
    $$('.cal-day:not(.disabled):not(.empty)', container).forEach(day => {
      day.addEventListener('click', () => {
        const [y, m, d] = day.dataset.d.split('-').map(Number);
        selectedDate = new Date(y, m, d);
        render();
        // Update date display
        const dateDisplay = $('#selected-date-display');
        if (dateDisplay) {
          dateDisplay.textContent = selectedDate.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' });
        }
      });
    });
  }
  render();
}

// ============================================================
// ADD TO CALENDAR (placeholder)
// ============================================================
window.addToCalendar = function() {
  alert('Функция добавления в календарь будет доступна после подтверждения записи по телефону.');
};

// ============================================================
// WHATSAPP BUTTON
// ============================================================
function initWhatsApp() {
  const wa = $('.wa-btn');
  if (!wa) return;
  wa.addEventListener('click', e => {
    e.preventDefault();
    window.open('https://api.whatsapp.com/send/?phone=77077787890', '_blank');
  });
}

// ============================================================
// PRICE TABLE SORT (column headers)
// ============================================================
function initPriceSort() {
  $$('.price-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortFilter = $('#price-sort-filter');
      if (!sortFilter) return;
      const current = sortFilter.value;
      if (current === 'asc') sortFilter.value = 'desc';
      else sortFilter.value = 'asc';
      sortFilter.dispatchEvent(new Event('change'));
    });
  });
}

// ============================================================
// INIT ALL
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHamburger();
  initFAQ();
  BookingModal.init();
  initBookingButtons();
  initSmoothScroll();
  initCounters();
  initScrollReveal();
  initMobileCTA();
  initPriceFilter();
  initBlogFilter();
  initServiceTabs();
  initPageBookingForm();
  initWhatsApp();
  initPriceSort();

  // Mobile CTA booking button
  const mobileCTABtn = $('#mobile-cta-btn');
  if (mobileCTABtn) {
    mobileCTABtn.addEventListener('click', () => BookingModal.open());
  }
});
