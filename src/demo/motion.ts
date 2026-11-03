import { flushSync } from 'react-dom';

/** Keep navigation atomic while the old and new page crossfade. */
export async function transitionDemoView(update: () => void) {
  if (document.body.classList.contains('demo-preparing')) {
    flushSync(update);
    return;
  }
  if (document.startViewTransition) {
    const transition = document.startViewTransition(() => flushSync(update));
    await transition.finished.catch(() => {});
    return;
  }
  const content = document.getElementById('main-content');
  if (!content) {
    flushSync(update);
    return;
  }
  await content.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, fill: 'forwards' })
    .finished;
  flushSync(update);
  await content.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, fill: 'forwards' })
    .finished;
  content.getAnimations().forEach((animation) => animation.cancel());
}
