/*
 * When to draw. At most `fps` frames a second (a 120 Hz screen needn't
 * draw the light twice as often), and not at all while the canvas is off
 * screen or the page is hidden. It also notices frames running well over
 * their budget, so a page can draw fewer pixels. Shared by both pages.
 */
export function createPacer(canvas) {
  let visible = true;
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(canvas);

  // The screen's refresh interval: the shortest gap between animation
  // frames lately, easing back up slowly in case the screen changes.
  let display = 1000 / 60;
  let tick = null;
  // When the next frame is due, the last drawn, and how many lately ran slow.
  let due = 0;
  let drawn = null;
  let slow = 0;

  return {
    // Whether to draw a frame now (call once per animation frame).
    ready(now, fps) {
      if (tick !== null) {
        const gap = now - tick;
        display = gap < display ? gap : display + (gap - display) * 0.002;
      }
      tick = now;
      if (!visible || document.hidden) return false;
      // Within half a refresh of being due counts as due, so the frames
      // drawn average out to the cap even when the screen's rate isn't a
      // multiple of it.
      return now >= due - display / 2;
    },
    // Call after drawing. True once frames have kept taking well over
    // their budget (the cap, or the screen's own rate if slower) for a
    // while; then it starts counting afresh.
    drew(now, fps) {
      const interval = 1000 / fps;
      due = due < now - interval ? now + interval : due + interval;
      const gap = drawn === null ? 0 : now - drawn;
      drawn = now;
      if (gap === 0 || gap > 1000) return false;
      slow = gap > Math.max(interval, display) * 1.6 ? slow + 1 : Math.max(0, slow - 1);
      if (slow < 45) return false;
      slow = 0;
      return true;
    },
  };
}
