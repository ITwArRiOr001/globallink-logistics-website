window.addEventListener('scroll', () => {
    document.querySelectorAll('section').forEach(sec => {
        const rect = sec.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            sec.classList.add('visible');
        }
    });
});
// Multi-step form progress (for inquiry)
function updateProgress(step) {
    const bar = document.querySelector('.progress-bar');
    if (bar) bar.style.width = `${step * 33}%`; // Assuming 3 steps
}
function validateForm(step) {
    const activeStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (!activeStep) return true;
    
    let valid = true;
    const inputs = activeStep.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
        const value = input.value.trim();
        const errorEl = activeStep.querySelector(`[data-error-for="${input.id}"]`);
        
        if (!value) {
            valid = false;
            input.classList.add('is-invalid');
            if (errorEl) errorEl.textContent = 'This field is required';
        } else {
            input.classList.remove('is-invalid');
            if (errorEl) errorEl.textContent = '';
        }
        
        // Extra email validation
        if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            valid = false;
            input.classList.add('is-invalid');
            if (errorEl) errorEl.textContent = 'Please enter a valid email';
        }
    });
    
    return valid;
}

function openModal(modalId, productName = '', type = '', priceRange = '') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    // Auto-fill for product quote modal (fixed template literal)
    if (modalId === 'quoteModal') {
        document.getElementById('modal-product-name').textContent = productName || 'Selected Product';
        document.getElementById('modal-product-hidden').value = productName ? `${productName} (${priceRange})` : '';
        document.getElementById('modal-type-hidden').value = type || '';
    }
}
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}
// Shipping Calculator
function calculateShipping() {
    const type = document.getElementById('type') ? document.getElementById('type').value : '';
    const weight = parseFloat(document.getElementById('weight')?.value || 0);
    const dest = document.getElementById('dest') ? document.getElementById('dest').value : '';
    if (!weight) return;
    const baseRate = type === 'Cold' ? 2.5 : 1.5; // $/kg example
    const distFactor = dest === 'UAE' ? 1 : 1.2;
    const cost = weight * baseRate * distFactor + 100;
  if (document.getElementById('ship-result')) document.getElementById('ship-result').innerText = `Estimated Cost: $${cost.toFixed(2)} (Time: 5-7 days)`;
}

function estimateDuty() {
    const value = parseFloat(document.getElementById('value')?.value || 0);
    const rate = 0.1; // 10% example
    const duty = value * rate;

    if (document.getElementById('duty-result')) {
        document.getElementById('duty-result').innerText =
            `Estimated Duty: $${duty.toFixed(2)}`;
    }
}

// Currency Converter
async function convertCurrency() {
    const from = 'INR';
    const to = document.getElementById('to-currency') ? document.getElementById('to-currency').value : 'AED';
    const amount = parseFloat(document.getElementById('amount')?.value || 1);
    try {
        const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const data = await res.json();
        const rate = data.rates[to];
        const result = amount * rate;
        if (document.getElementById('conv-result')) document.getElementById('conv-result').innerText = `${amount} ${from} = ${result.toFixed(2)} ${to}`;
    } catch (err) {
        console.error('API error');
    }
}

// RSS Feed for News
async function loadNews() {
    const rssUrl = 'https://timesofindia.indiatimes.com/rssfeeds/1898055.cms';
    try {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`); // Use free RSS to JSON proxy
        const data = await res.json();
        const newsList = document.getElementById('news-feed');
        if (newsList) {
            data.items.slice(0, 5).forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>`;
                newsList.appendChild(li);
            });
        }
    } catch (err) {
        console.error('RSS error');
    }
}

// Mock Shipment Tracker
function trackShipment() {
    const id = document.getElementById('track-id')?.value;
    const statuses = ['In Transit', 'At Port', 'Delivered', 'Delayed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    if (document.getElementById('track-result')) document.getElementById('track-result').innerText = `Status for ID ${id}: ${randomStatus}`;
}
// Products page: Category + Search Filter
function normalizeText(s) {
    return (s || "").toLowerCase().trim();
}

function applyProductFilters() {
    const categorySelect = document.getElementById("category-filter");
    const searchInput = document.getElementById("search-bar");
    const noResults = document.getElementById("no-results");
    
    if (!categorySelect || !searchInput) return;
    
    const category = categorySelect.value;
    const query = normalizeText(searchInput.value);
    
    const cards = document.querySelectorAll(".product-card");
    let visibleCount = 0;
    
    cards.forEach(card => {
        const cardCategory = card.dataset.category || "";
        const title = normalizeText(card.querySelector("h4")?.textContent);
        const desc = normalizeText(card.querySelector("p")?.textContent);
        
        const matchCategory = (category === "all") || (cardCategory === category);
        const matchSearch = !query || title.includes(query) || desc.includes(query);
        
        const shouldShow = matchCategory && matchSearch;
        card.style.display = shouldShow ? "" : "none";
        if (shouldShow) visibleCount++;
    });
    
    if (noResults) noResults.style.display = visibleCount === 0 ? "block" : "none";
}
// Multilingual (using Google Translate widget) - Added 'zh-CN' for Chinese
function changeLanguage(lang) {
    const frame = document.querySelector('.goog-te-combo');
    if (frame) frame.value = lang;
    // Trigger change event
    const event = new Event('change');
    frame.dispatchEvent(event);
}

// Hamburger Menu Toggle
function toggleMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    const overlay = document.querySelector('.overlay');
    const hamburger = document.querySelector('.hamburger');
    
    mobileMenu.classList.toggle('open');
    overlay.classList.toggle('open');
    hamburger.classList.toggle('open');
}toggleMobileMenu
// Init on load - FIXED VERSION
document.addEventListener('DOMContentLoaded', () => {
    initGlobalThankYouRedirect();
    // Set active nav
    const links = document.querySelectorAll('nav a');
    links.forEach(link => {
        if (link.href === window.location.href) link.classList.add('active');
    });
    
    // Load news if on blog
    if (document.getElementById('news-feed')) loadNews();
    
    // Fade in initial sections
    document.querySelectorAll('section').forEach(sec => sec.classList.add('visible'));
    
    // Close menu on overlay or link click
    document.querySelector('.overlay')?.addEventListener('click', toggleMobileMenu);
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', toggleMobileMenu);
    });
    
    // 🔥 PRODUCTS PAGE: Search + Category Filter (WORKING)
    const categorySelect = document.getElementById("category-filter");
    const searchInput = document.getElementById("search-bar");
    
    if (categorySelect) {
        categorySelect.addEventListener("change", applyProductFilters);
    }
    if (searchInput) {
        searchInput.addEventListener("input", applyProductFilters);
    }
    // Initial filter run
    applyProductFilters();
    
// Professional Modal Close: Outside click + ESC key
document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

document.addEventListener("keydown", (e) => {
if (e.key === "Escape") {
    document.querySelectorAll(".modal").forEach(modal => {
        closeModal(modal.id);
    });
}
});
});
// Accordion Functionality
document.querySelectorAll('.accordion-button').forEach(button => {
    button.addEventListener('click', () => {
        const item = button.parentElement;
        item.classList.toggle('active');
    });
});
document.addEventListener('DOMContentLoaded', () => {
    
    const intentCards = document.querySelectorAll('.intent-card');
    const inquiryForm = document.getElementById('inquiry-form');
    const inquiryType = document.getElementById('inquiry-type');
    const inquiryMessage = document.getElementById('inquiry-message');
    
    if (intentCards.length && inquiryForm && inquiryType && inquiryMessage) {
        intentCards.forEach(card => {
            card.addEventListener('click', () => {
                const intent = card.dataset.intent;
                inquiryType.value = intent;
                inquiryMessage.value =
                    `I want help with ${intent}. Please guide me on next steps.`;
                inquiryForm.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }
    
});
/* ---------------------------
   Global Link Logistics - Inquiry Wizard + UI
--------------------------- */

// Fade-in on scroll (lightweight)
function initScrollReveal() {
    const sections = document.querySelectorAll('section');
    const reveal = () => {
        sections.forEach(sec => {
            const rect = sec.getBoundingClientRect();
            if (rect.top < window.innerHeight - 120) sec.classList.add('visible');
        });
    };
    window.addEventListener('scroll', reveal, { passive: true });
    reveal();
}
function initIntentPrefill() {
    const intentCards = document.querySelectorAll('.intent-card');
    const inquiryType = document.getElementById('inquiryType');
    const inquiryMessage = document.getElementById('inquiryMessage');
    
    if (!intentCards.length || !inquiryType || !inquiryMessage) return;
    
    intentCards.forEach(card => {
        card.addEventListener('click', () => {
            // Active highlight
            intentCards.forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
            
            // Prefill intent + message
            const intent = card.dataset.intent || '';
            const seed = card.dataset.seed || '';
            inquiryType.value = intent;
            inquiryMessage.value = seed;
            
            // Jump to inquiry and open Step 2 (because it's about need)
            setWizardStep(2, { scroll: true });
        });
    });
}

/* ---------------------------
   Wizard (3 steps)
   Patterns: progress indicator + step switching
--------------------------- */
let currentStep = 1;

function setWizardStep(step, opts = {}) {
    const { scroll = false } = opts;
    
    const steps = document.querySelectorAll('.form-step');
    const indicators = document.querySelectorAll('.wizard-step');
    const bar = document.getElementById('wizardBar');
    
    currentStep = Math.max(1, Math.min(3, step));
    
    steps.forEach(s => {
        s.classList.toggle('is-active', Number(s.dataset.step) === currentStep);
    });
    
    indicators.forEach((ind, idx) => {
        const n = idx + 1;
        ind.classList.toggle('is-active', n === currentStep);
        ind.classList.toggle('is-done', n < currentStep);
    });
    
    // 0%, 50%, 100% for 3 steps
    if (bar) {
        const pct = (currentStep - 1) / (3 - 1) * 100;
        bar.style.width = `${pct}%`;
    }
    
    if (currentStep === 3) updateConfirmCard();
    
    if (scroll) {
        document.getElementById('inquiry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function validateStep(step) {
    // Simple required-field validation for each step
    const form = document.getElementById('inquiry-form');
    if (!form) return false;
    
    const requiredByStep = {
        1: ['fullName', 'companyName', 'email'],
        2: ['inquiryType', 'inquiryMessage']
    };
    
    const fields = requiredByStep[step] || [];
    let ok = true;
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        const err = document.querySelector(`[data-error-for="${id}"]`);
        if (!el) return;
        
        const isEmpty = !String(el.value || '').trim();
        const isEmail = (id === 'email');
        const invalidEmail = isEmail && !/^[^s@]+@[^s@]+.[^s@]+$/.test(el.value);
        
        let msg = '';
        if (isEmpty) msg = 'This field is required.';
        else if (invalidEmail) msg = 'Enter a valid email address.';
        
        if (err) err.textContent = msg;
        el.classList.toggle('is-invalid', Boolean(msg));
        
        if (msg) ok = false;
    });
    
    return ok;
}

function updateConfirmCard() {
    const fullName = document.getElementById('fullName')?.value?.trim() || '—';
    const company = document.getElementById('companyName')?.value?.trim() || '—';
    const email = document.getElementById('email')?.value?.trim() || '—';
    const type = document.getElementById('inquiryType')?.value?.trim() || '—';
    const stage = document.querySelector('input[name="stage"]:checked')?.value || '—';
    
    document.getElementById('cName').textContent = fullName;
    document.getElementById('cCompany').textContent = company;
    document.getElementById('cEmail').textContent = email;
    document.getElementById('cType').textContent = type;
    document.getElementById('cStage').textContent = stage;
}

function initWizard() {
    const form = document.getElementById('inquiry-form');
    if (!form) return;
    
    // Next / Prev buttons
    form.addEventListener('click', (e) => {
        const nextBtn = e.target.closest('[data-next]');
        const prevBtn = e.target.closest('[data-prev]');
        
        if (nextBtn) {
            if (validateStep(currentStep)) setWizardStep(currentStep + 1);
        }
        
        if (prevBtn) {
            setWizardStep(currentStep - 1);
        }
    });
    
    // Submit handler
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validate step 1 + 2 before submit
        const ok1 = validateStep(1);
        const ok2 = validateStep(2);
        if (!ok1) return setWizardStep(1, { scroll: true });
        if (!ok2) return setWizardStep(2, { scroll: true });
        
        // Example: replace with Formspree / your backend fetch
        // const payload = Object.fromEntries(new FormData(form).entries());
        
        alert('Inquiry submitted successfully! We will contact you within 24 hours.');
        form.reset();
        // Reset UI state
        document.querySelectorAll('.intent-card').forEach(c => c.classList.remove('is-selected'));
        setWizardStep(1);
        updateStageUI(); // reset hint/note
    });
    
    // Allow clicking step indicators (optional UX)
    document.querySelectorAll('.wizard-step').forEach((stepEl, idx) => {
        stepEl.addEventListener('click', () => {
            const target = idx + 1;
            // Only allow jump forward if current step is valid
            if (target > currentStep && !validateStep(currentStep)) return;
            setWizardStep(target);
        });
    });
    
    setWizardStep(1);
}

/* ---------------------------
   Beginner vs Business UI changes
--------------------------- */
function updateStageUI() {
    const stage = document.querySelector('input[name="stage"]:checked')?.value || 'Beginner';
    const hint = document.getElementById('stageHint');
    const beginnerNote = document.getElementById('beginnerNote');
    
    if (hint) {
        hint.textContent = stage === 'Beginner' ?
            'Beginner mode: simple, step-by-step guidance.' :
            'Business mode: faster, direct answers with cost & compliance focus.';
    }
    
    if (beginnerNote) {
        beginnerNote.style.display = stage === 'Beginner' ? 'block' : 'none';
    }
}

function initStageToggle() {
    const radios = document.querySelectorAll('input[name="stage"]');
    if (!radios.length) return;
    radios.forEach(r => r.addEventListener('change', updateStageUI));
    updateStageUI();
}

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    
    // Close menu on overlay or link click
    document.querySelector('.overlay')?.addEventListener('click', toggleMobileMenu);
    document.querySelectorAll('.mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            const mm = document.querySelector('.mobile-menu');
            if (mm?.classList.contains('open')) toggleMobileMenu();
        });
    });
    
    initIntentPrefill();
    initStageToggle();
    initWizard();
});
