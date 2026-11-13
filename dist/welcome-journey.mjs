const steps = [
  ['Sign Up', 'Join as Broke and create your account.', '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m4-12v6m-3-3h6"/>'],
  ['Add Your Debt', 'Enter your debt amount and share your story.', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6"/>'],
  ['Your Privacy', 'Choose what to share and what to keep private.', '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/>'],
  ['Review & Confirm', 'Preview your card and check the details.', '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2m-6 9 2 2 4-4"/>'],
  ['Submit Your Card', 'Submit your request and track its status.', '<path d="m3 10 18-7-7 18-3-8-8-3Zm8 3L21 3"/>'],
  ['Bros Lend a Hand', 'Supporters discover your story and may choose to help.', '<path d="M12 20 4 12a5 5 0 0 1 7-7l1 1 1-1a5 5 0 0 1 7 7l-8 8Z"/><path d="m12 6-3 3a2 2 0 0 0 3 3l1-1 4 4"/>'],
  ['Debt-Free!', 'When your debt is fully settled, celebrate a fresh start.', '<path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8 3 3M5 19l3-3m8-8 3-3"/><circle cx="12" cy="12" r="3"/>'],
];

const cycleDuration = 30_000;
const transitionDuration = 4_200;
const photoNames = ['signup', 'add-debt', 'privacy', 'review', 'submit', 'bros', 'debt-free'];

export function welcomeJourneyHTML(brandMark) {
  return `<section class="welcome-journey" aria-labelledby="welcome-journey-title">
    <div class="journey-heading">
      <p class="journey-label">HOW IT WORKS</p>
      <h2 id="welcome-journey-title">DebtFreeLately in <span class="journey-title-number">7</span> Steps</h2>
    </div>
    <div id="journey-carousel" class="journey-carousel" role="region" aria-label="Seven steps to a fresh start" tabindex="0">
      <div class="journey-track">
        <ol class="journey-steps" role="list">
          ${steps.map(([title, description, icon], index) => `
            <li class="journey-step">
              <img class="journey-photo" src="/assets/journey-${photoNames[index]}.webp" width="600" height="800" decoding="async" alt="">
              <div class="journey-step-top">
                <span class="journey-number">${String(index + 1).padStart(2, '0')}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>
              </div>
              <h3>${title.replaceAll('&', '&amp;')}</h3>
              <p>${description}</p>
            </li>`).join('')}
          <li class="journey-step journey-transition">
            <div class="journey-transition-art" aria-hidden="true">
              <svg class="journey-hands" viewBox="0 0 200 110" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <g class="journey-hand-left">
                  <path d="M4 39h33l14-12 22 2 17 7-17 15c-5 5 2 12 8 8l19-12 32 27c5 5-1 11-6 7l-9-7c4 4-2 10-6 7l-8-6c3 5-3 9-7 6l-8-6c2 5-3 8-7 5L54 63l-16-7H4" fill="#edf1e4" stroke="#526943"/>
                  <path d="m40 37 11 24M117 74l-12-10m-2 11-9-8m-6 8-6-5" stroke="#526943"/>
                </g>
                <g class="journey-hand-right">
                  <path d="M196 39h-32l-16-11-24-2-24 4-27 21c-5 5 2 12 8 8l19-12 32 27 15-12 16-6h33" fill="#dce8cc" stroke="#526943"/>
                  <path d="m160 37-10 24m-50-14 11-5" stroke="#526943"/>
                </g>
              </svg>
              ${brandMark}
            </div>
            <h3>A Fresh Start</h3>
            <p>Support begins with connection.</p>
          </li>
        </ol>
      </div>
    </div>
    <p class="journey-note">This is one possible journey. Support and becoming debt-free are not guaranteed.</p></section>`;
}

export function initWelcomeJourney() {
  let section = document.querySelector('.welcome-journey');
  if (!section) {
    const mark = document.querySelector('#welcome .welcome-mark').cloneNode(true);
    mark.setAttribute('class', 'journey-transition-mark');
    document.querySelector('#welcome .welcome-hero').insertAdjacentHTML('afterend', welcomeJourneyHTML(mark.outerHTML));
    section = document.querySelector('.welcome-journey');
  }

  const carousel = section.querySelector('.journey-carousel');
  const original = section.querySelector('.journey-steps');
  const duplicate = original.cloneNode(true);
  duplicate.setAttribute('aria-hidden', 'true');
  duplicate.classList.add('journey-copy');
  original.after(duplicate);
  const transitionCards = [...carousel.querySelectorAll('.journey-transition')];

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let hovered = false;
  let touching = false;
  let frame = 0;
  let lastTime = null;
  let position = 0;
  let distance = 0;
  let transitionStarts = [];

  function syncTransition(scrollPosition) {
    if (reducedMotion.matches || distance <= 0) return;
    const speed = distance / cycleDuration;
    transitionCards.forEach((card, index) => {
      const elapsed = Math.min(transitionDuration, Math.max(0, (scrollPosition - transitionStarts[index]) / speed));
      card.style.setProperty('--transition-time', `-${elapsed}ms`);
    });
  }

  function updatePlayback() {
    distance = original.getBoundingClientRect().width;
    transitionStarts = transitionCards.map(card => card.offsetLeft - carousel.clientWidth);
    syncTransition(carousel.scrollLeft);
    const shouldPlay = !touching && !hovered && !carousel.matches(':focus-within') &&
      !reducedMotion.matches && !document.hidden && carousel.clientWidth > 0;
    if (shouldPlay && !frame) {
      position = carousel.scrollLeft;
      frame = requestAnimationFrame(advance);
    } else if (!shouldPlay && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = null;
    }
  }

  function advance(time) {
    if (lastTime !== null && distance > 0) {
      position = (position + Math.min(time - lastTime, 50) * distance / cycleDuration) % distance;
      carousel.scrollLeft = position;
      syncTransition(position);
    }
    lastTime = time;
    frame = requestAnimationFrame(advance);
  }

  carousel.addEventListener('touchstart', () => {
    touching = true;
    updatePlayback();
  }, {passive: true});
  function finishTouch(event) {
    touching = event.touches.length > 0;
    updatePlayback();
  }
  carousel.addEventListener('touchend', finishTouch);
  carousel.addEventListener('touchcancel', finishTouch);
  carousel.addEventListener('pointerenter', event => {
    hovered = event.pointerType === 'mouse';
    updatePlayback();
  });
  carousel.addEventListener('pointerleave', () => {
    hovered = false;
    updatePlayback();
  });
  carousel.addEventListener('focus', updatePlayback);
  carousel.addEventListener('blur', updatePlayback);
  carousel.addEventListener('scroll', () => {
    if (!frame) syncTransition(carousel.scrollLeft);
  }, {passive: true});
  reducedMotion.addEventListener('change', updatePlayback);
  document.addEventListener('visibilitychange', updatePlayback);
  new ResizeObserver(updatePlayback).observe(carousel);
  updatePlayback();
}
