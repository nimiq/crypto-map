import { presetNimiq } from 'nimiq-css'
import { defineConfig, presetAttributify, presetUno, presetIcons } from 'unocss'
import { presetRemToPx } from '@unocss/preset-rem-to-px'
import presetAnimations from 'unocss-preset-animations'
import { Provider } from 'types'


export default defineConfig({
  presets: [
    presetUno({ attributifyPseudo: true }),
    presetNimiq({
      utilities: true,
      reset: 'tailwind'
    }),
    presetIcons({
      collections: {
        providers: {
          [Provider.DefaultAtm]: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 26 34"><g opacity=".5"><path stroke="#fff" stroke-linecap="round" stroke-width="2.754" d="M1.57 2h22.857"/><path fill="#fff" fill-rule="evenodd" d="M5.681 6.572A2.967 2.967 0 0 0 2.715 9.54v21.495a2.967 2.967 0 0 0 2.966 2.967h8.879V6.572H5.68Zm11.633 0v27.429h3.006a2.967 2.967 0 0 0 2.966-2.967V9.54a2.967 2.967 0 0 0-2.966-2.967h-3.006Z" clip-rule="evenodd"/></g></svg>',
          [Provider.Edenia]: '<svg viewBox="0 0 31 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path opacity=".5" fill="#fff" d="M31 .998H8.113L8.  32l22.876-.033v-5.559H14.181V19.13l14.953-.031-.003-5.396H14.18V6.558l16.82.002V.998ZM0 14.105h4.577v4.577H0z" /></svg>',
          [Provider.Kurant]: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48"><path fill="#fff" d="M19.435.261C12.152 1.836 6.251 6.255 2.8 12.654c-3.662 6.802-3.738 15.12-.192 22.228 2.318 4.63 6.631 8.781 11.405 10.991 1.839.846 4.446 1.632 6.285 1.941 1.82.288 6.21.23 8.068-.095 9.66-1.691 17.363-9.26 19.434-19.097.155-.767.25-1.48.173-1.575-.056-.095-.998-.174-2.087-.174h-1.994l-.21.808c-.498 2.017-1.248 4.19-1.764 5.246-3.64 7.245-11.805 11.74-19.646 10.875-2.185-.25-4.849-.922-4.849-1.231 0-.095.173-1.96.384-4.132.211-2.19.422-4.514.498-5.167l.095-1.19 2.588-2.402c1.398-1.326 2.626-2.422 2.72-2.422.076 0 2.129 2.153 4.522 4.805 2.415 2.632 4.428 4.804 4.485 4.804.154 0 3.24-2.766 3.47-3.132.191-.287-.25-.827-3.181-3.939a570.719 570.719 0 0 0-4.544-4.785l-1.15-1.21.747-.788c2.07-2.134 11.481-10.837 11.768-10.894.23-.037.535.288 1.017 1.058 1.36 2.228 1.744 3.17 2.875 6.973l.248.865 1.899.057c1.055.019 1.974-.02 2.069-.117.249-.25-.67-3.977-1.515-6.07C43.83 8.313 38.023 3.01 31.124.86c-1.59-.499-3.967-.922-4.121-.748-.211.211-.576 3.766-.403 3.94.056.075.765.268 1.552.422 1.477.288 3.432.96 4.85 1.673 1.303.653 3.01 1.787 3.01 2.017 0 .211-16.56 16.215-16.771 16.215-.076 0-.076-.46-.02-1.02.057-.536.347-3.516.615-6.57.267-3.075.727-8.031 1.035-11.049.287-3.017.498-5.533.441-5.628-.113-.176-.495-.157-1.877.15Zm-4.138 10.991c-.286 2.939-.746 7.762-1.017 10.72-1.206 12.872-1.725 18.156-1.839 18.156-.056 0-.787-.634-1.628-1.42-5.366-4.937-7.494-11.181-6.247-18.29 1.055-5.937 4.081-10.278 9.6-13.699.69-.423 1.342-.767 1.437-.767.135-.022.019 1.84-.306 5.3Z" opacity=".5"/></svg>',
          [Provider.Bluecode]: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="24" fill="none"><path fill="#1961AC" d="m1.82 7.744 7.765 4.483 4.634-2.673a1.039 1.039 0 0 0 0-1.8L1.819.595a1.037 1.037 0 0 0-1.557.898v7.152a1.038 1.038 0 0 1 1.557-.9ZM14.219 14.9l-4.634-2.67-7.766 4.48a1.038 1.038 0 0 1-1.557-.899v7.151a1.039 1.039 0 0 0 1.557.9l12.4-7.16a1.038 1.038 0 0 0 0-1.799V14.9Z"/><path fill="#004899" d="m1.82 16.71 7.765-4.483-7.766-4.483a1.036 1.036 0 0 0-1.557.9v7.167a1.038 1.038 0 0 0 1.557.9Z"/></svg>',
          [Provider.CryptopaymentLink]: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 23"><path fill="#5C6CFF" d="m19.884 7.687-1.528-5.579C18.036.951 16.83.271 15.648.571l-5.68 1.496a3.441 3.441 0 0 0-2.082 1.565L1.012 15.307a2.151 2.151 0 0 0 .806 2.966l7.832 4.436c1.055.598 2.416.245 3.013-.79l6.874-11.674a3.31 3.31 0 0 0 .347-2.558Zm-5.458 5.429-1.763 3.007a.74.74 0 0 1-.611.354H8.51a.709.709 0 0 1-.611-.354l-1.778-3.007a.689.689 0 0 1 0-.694L7.9 9.415a.74.74 0 0 1 .61-.354h3.542a.71.71 0 0 1 .61.354l1.764 3.007a.689.689 0 0 1 0 .694Zm1.403-7.92a1.346 1.346 0 0 1-1.639-.924c-.194-.694.236-1.416.945-1.606a1.346 1.346 0 0 1 1.638.925c.195.694-.236 1.415-.944 1.606Z"/></svg>',
          [Provider.NAKA]: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="none"><path fill="#293FFF" d="M183.304 66.667H72.001v266.666h55.651V76.111l89.044 257.222h111.303V66.667h-55.652v257.221z"/></svg>',
        }
      }
    }),
    presetRemToPx({ baseFontSize: 4 }),
    presetAttributify(),
    presetAnimations(),

    {
      name: 'radix-variants',
      variants: [
        (matcher) => {
          if (!matcher.startsWith('item-'))
            return matcher
          const re = /^item-(\w+):/
          const match = matcher.match(re)
          if (!match)
            return matcher
          return {
            matcher: matcher.replace(re, ''),
            selector: s => `[data-state="${match[1]}"]:is(${s}, & ${s})`,
          }
        },
      ]
    },
  ],
  theme: {
    breakpoints: {
      desktop: '768px',
    }
  },
  // TODO Move to nimiq-css?
  variants: [
    (matcher) => {
      if (!matcher.startsWith('hocus:'))
        return matcher
      return {
        matcher: matcher.replace(/^hocus:/, ''),
        selector: s => `${s}:hover, ${s}:focus-visible`,
      }
    },
  ],
})
