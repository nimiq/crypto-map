<template>
  <div outline="~ 1 neutral-200" shadow-sm text-center rounded-12 bg-white f-px-lg f-py-2xl f-mt-xl>
    <div flex="~ items-center justify-center" mx-auto rounded-full bg-neutral-100 size-64 f-mb-md>
      <Icon name="i-nimiq:magnifying-glass" text-neutral-400 size-32 />
    </div>
    <p text="neutral-800 f-lg" font-semibold m-0>
      {{ $t('empty.title') }}
    </p>
    <p text="neutral-600 f-sm" m-0 f-mt-xs>
      {{ $t('empty.subtitle') }}
    </p>
  </div>
</template>
