<template>
  <div outline="~ 1 neutral-200" flex="~ col" shadow-sm rounded-12 bg-white overflow-hidden animate-pulse>
    <div aspect="16/9" bg-neutral-200 flex-shrink-0 />
    <div f-p-md flex="~ col gap-12">
      <div rounded-6 bg-neutral-200 h-20 w="3/4" />
      <div flex="~ gap-8">
        <div rounded-full bg-neutral-200 h-24 w-80 />
        <div rounded-6 bg-neutral-200 h-24 w-100 />
      </div>
      <div flex="~ gap-8">
        <div mt-2 rounded-4 bg-neutral-200 flex-shrink-0 size-16 />
        <div flex="~ col gap-6 flex-1">
          <div rounded-4 bg-neutral-200 h-16 w-full />
          <div rounded-4 bg-neutral-200 h-16 w="2/3" />
        </div>
      </div>
      <div flex="~ gap-6">
        <div rounded-full bg-neutral-200 h-24 w-80 />
        <div rounded-full bg-neutral-200 h-24 w-60 />
      </div>
      <div mt-auto pt-8 rounded-6 bg-neutral-200 h-20 w-100 />
    </div>
  </div>
</template>
