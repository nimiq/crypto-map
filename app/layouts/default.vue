<template>
  <main f="$px-16/24" min-h-screen f-px-sm f-pt-md>
    <header>
      <Search />
    </header>

    <slot />

    <LanguageSelector />
  </main>
</template>

<style>
main {
  --uno: bg-neutral-100 transition-colors;
}

body:has([data-reka-popper-content-wrapper]) main {
  --uno: bg-neutral-0;
}
</style>
