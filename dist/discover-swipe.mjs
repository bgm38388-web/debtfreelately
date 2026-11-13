export function swipeDirection(dx, dy) {
  if (Math.abs(dx) < 70 || Math.abs(dx) <= Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 'left' : 'right';
}

export function bindDiscoverSwipe(deck, onSwipe) {
  const face = deck.querySelector('.discovery-debt-card');
  let drag = null;

  face.addEventListener('pointerdown', event => {
    if (drag || !event.isPrimary || event.button !== 0 ||
        (event.pointerType === 'touch' && deck.closest('.is-multi') &&
          window.matchMedia('(max-width: 620px)').matches) ||
        event.target.closest('button, a, input, select') || deck.classList.contains('out-left')) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
    face.setPointerCapture(drag.id);
  });

  face.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.id) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) < 6 || Math.abs(dx) <= Math.abs(event.clientY - drag.y) * 1.5) return;
    const shift = Math.max(-140, Math.min(140, dx));
    face.classList.add('is-dragging');
    face.style.setProperty('--swipe-x', `${shift}px`);
    face.style.setProperty('--swipe-tilt', `${shift / 18}deg`);
  });

  function finish(event) {
    if (event.pointerId !== drag?.id) return;
    const direction = event.type === 'pointerup'
      ? swipeDirection(event.clientX - drag.x, event.clientY - drag.y)
      : null;
    drag = null;
    face.classList.remove('is-dragging');
    face.style.removeProperty('--swipe-x');
    face.style.removeProperty('--swipe-tilt');
    if (direction) onSwipe(direction);
  }

  face.addEventListener('pointerup', finish);
  face.addEventListener('pointercancel', finish);
  face.addEventListener('lostpointercapture', finish);
}
