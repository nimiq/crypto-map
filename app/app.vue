<template>
  <NuxtPage />
</template>

<style>
body {
  color-scheme: light;
}

/* Vaul-vue drawer styles */
[data-vaul-drawer] {
  touch-action: none;
  will-change: transform;
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

[data-vaul-drawer][data-vaul-snap-points='true'][data-vaul-drawer-direction='bottom'] {
  transform: translate3d(0, var(--initial-transform, 100%), 0);
}

/* Overlay styles - critical for snap points */
[data-vaul-overlay][data-vaul-snap-points='true'] {
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

[data-vaul-overlay][data-vaul-snap-points='true']:not([data-vaul-snap-points-overlay='true']):not(
    [data-state='closed']
  ) {
  opacity: 0;
}

[data-vaul-overlay][data-vaul-snap-points-overlay='true'] {
  opacity: 1;
}

/* Overlay without snap points */
[data-vaul-overlay][data-vaul-snap-points='false'][data-state='open'] {
  animation: fadeIn 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

[data-vaul-overlay][data-state='closed'] {
  animation: fadeOut 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}
</style>
