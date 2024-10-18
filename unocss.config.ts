import { presetRemToPx } from '@unocss/preset-rem-to-px'
import transformerDirectives from '@unocss/transformer-directives'
import { presetNimiq } from 'nimiq-css'
import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'

const reRadix = /^r-(\w+)-(open|closed):/
const reRadixHocus = /^r-(\w+)-hocus:/
const variantsRE = /^(scrollbar(-track|-thumb)?):.+$/

export default defineConfig({
  presets: [
    presetUno({ attributifyPseudo: true }),
    presetNimiq({
      utilities: true,
      typography: true,
      reset: 'tailwind',
      attributifyUtilities: true,
      fonts: false,
    }),
    presetIcons({
      collections: {
        providers: {
          'default-atm': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 26 34"><g opacity=".5"><path stroke="#fff" stroke-linecap="round" stroke-width="2.754" d="M1.57 2h22.857"/><path fill="#fff" fill-rule="evenodd" d="M5.681 6.572A2.967 2.967 0 0 0 2.715 9.54v21.495a2.967 2.967 0 0 0 2.966 2.967h8.879V6.572H5.68Zm11.633 0v27.429h3.006a2.967 2.967 0 0 0 2.966-2.967V9.54a2.967 2.967 0 0 0-2.966-2.967h-3.006Z" clip-rule="evenodd"/></g></svg>',
          'edenia': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 31 32"><path fill="#fff" d="M31 .998H8.113L8.117 32l22.876-.033v-5.559H14.181V19.13l14.953-.031-.003-5.396H14.18V6.558L31 6.56V.998ZM0 14.105h4.577v4.577H0z" opacity=".5"/></svg>',
          'kurant': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48"><path fill="#fff" d="M19.435.261C12.152 1.836 6.251 6.255 2.8 12.654c-3.662 6.802-3.738 15.12-.192 22.228 2.318 4.63 6.631 8.781 11.405 10.991 1.839.846 4.446 1.632 6.285 1.941 1.82.288 6.21.23 8.068-.095 9.66-1.691 17.363-9.26 19.434-19.097.155-.767.25-1.48.173-1.575-.056-.095-.998-.174-2.087-.174h-1.994l-.21.808c-.498 2.017-1.248 4.19-1.764 5.246-3.64 7.245-11.805 11.74-19.646 10.875-2.185-.25-4.849-.922-4.849-1.231 0-.095.173-1.96.384-4.132.211-2.19.422-4.514.498-5.167l.095-1.19 2.588-2.402c1.398-1.326 2.626-2.422 2.72-2.422.076 0 2.129 2.153 4.522 4.805 2.415 2.632 4.428 4.804 4.485 4.804.154 0 3.24-2.766 3.47-3.132.191-.287-.25-.827-3.181-3.939a570.719 570.719 0 0 0-4.544-4.785l-1.15-1.21.747-.788c2.07-2.134 11.481-10.837 11.768-10.894.23-.037.535.288 1.017 1.058 1.36 2.228 1.744 3.17 2.875 6.973l.248.865 1.899.057c1.055.019 1.974-.02 2.069-.117.249-.25-.67-3.977-1.515-6.07C43.83 8.313 38.023 3.01 31.124.86c-1.59-.499-3.967-.922-4.121-.748-.211.211-.576 3.766-.403 3.94.056.075.765.268 1.552.422 1.477.288 3.432.96 4.85 1.673 1.303.653 3.01 1.787 3.01 2.017 0 .211-16.56 16.215-16.771 16.215-.076 0-.076-.46-.02-1.02.057-.536.347-3.516.615-6.57.267-3.075.727-8.031 1.035-11.049.287-3.017.498-5.533.441-5.628-.113-.176-.495-.157-1.877.15Zm-4.138 10.991c-.286 2.939-.746 7.762-1.017 10.72-1.206 12.872-1.725 18.156-1.839 18.156-.056 0-.787-.634-1.628-1.42-5.366-4.937-7.494-11.181-6.247-18.29 1.055-5.937 4.081-10.278 9.6-13.699.69-.423 1.342-.767 1.437-.767.135-.022.019 1.84-.306 5.3Z" opacity=".5"/></svg>',
          'bluecode': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none"><path fill="#1961AC" d="m6.558 7.289 7.765 4.483 4.634-2.673a1.039 1.039 0 0 0 0-1.8L6.557.139A1.037 1.037 0 0 0 5 1.039V8.19a1.038 1.038 0 0 1 1.557-.9l.001-.001Zm12.399 7.156-4.634-2.67-7.766 4.48a1.038 1.038 0 0 1-1.557-.9v7.152a1.04 1.04 0 0 0 1.557.9l12.4-7.16a1.038 1.038 0 0 0 0-1.8v-.002Z"/><path fill="#004899" d="m6.558 16.255 7.765-4.483-7.766-4.483a1.036 1.036 0 0 0-1.557.9v7.167a1.038 1.038 0 0 0 1.557.9l.001-.001Z"/></svg>',
          'cpl': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 23"><path fill="#5C6CFF" d="m19.884 7.687-1.528-5.579C18.036.951 16.83.271 15.648.571l-5.68 1.496a3.441 3.441 0 0 0-2.082 1.565L1.012 15.307a2.151 2.151 0 0 0 .806 2.966l7.832 4.436c1.055.598 2.416.245 3.013-.79l6.874-11.674a3.31 3.31 0 0 0 .347-2.558Zm-5.458 5.429-1.763 3.007a.74.74 0 0 1-.611.354H8.51a.709.709 0 0 1-.611-.354l-1.778-3.007a.689.689 0 0 1 0-.694L7.9 9.415a.74.74 0 0 1 .61-.354h3.542a.71.71 0 0 1 .61.354l1.764 3.007a.689.689 0 0 1 0 .694Zm1.403-7.92a1.346 1.346 0 0 1-1.639-.924c-.194-.694.236-1.416.945-1.606a1.346 1.346 0 0 1 1.638.925c.195.694-.236 1.415-.944 1.606Z"/></svg>',
          'naka': '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="none"><path fill="#293FFF" d="M183.304 66.667H72.001v266.666h55.651V76.111l89.044 257.222h111.303V66.667h-55.652v257.221z"/></svg>',
        },
        ring: {
          atm: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 118 118"><circle cx="59" cy="59" r="32" stroke="#fff" opacity=".2"/><path stroke="url(#a)" d="M43.992 2.99C13.06 11.28-5.298 43.074 2.99 74.008c8.289 30.933 40.084 49.29 71.018 41.002 30.933-8.289 49.29-40.084 41.002-71.018C106.721 13.06 74.926-5.298 43.992 2.99Z" opacity=".2"/><defs><linearGradient id="a" x1="29.896" x2="70.898" y1="99.159" y2="28.141" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>',
          provider: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 186 186"><circle cx="93" cy="93" r="21" stroke="#fff" opacity=".8"/><circle cx="93" cy="93" r="25" stroke="#fff" opacity=".5"/><circle cx="93" cy="93" r="92" stroke="url(#a)" opacity=".3"/><circle cx="93" cy="93" r="52" stroke="url(#b)" opacity=".3"/><defs><linearGradient id="a" x1="43.406" x2="135.406" y1="154.094" y2="62.094" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><linearGradient id="b" x1="64.969" x2="116.969" y1="127.531" y2="75.531" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs></svg>',
        },
        apps: {
          'google-play': '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="19" fill="none"><g clip-path="url(#a)"><path fill="#000" d="M57.446 18.279H2.568a2.174 2.174 0 0 1-2.195-2.195V2.914c0-1.23.965-2.196 2.195-2.196h54.878c1.229 0 2.195.966 2.195 2.195v13.17c0 1.23-.966 2.196-2.195 2.196Z"/><path fill="#A6A6A6" d="M57.446 1.07c1.01 0 1.844.833 1.844 1.843v13.17c0 1.01-.834 1.845-1.844 1.845H2.568a1.855 1.855 0 0 1-1.844-1.844V2.914c0-1.01.834-1.845 1.844-1.845h54.878Zm0-.352H2.568A2.201 2.201 0 0 0 .373 2.913v13.17c0 1.23.965 2.196 2.195 2.196h54.878c1.229 0 2.195-.966 2.195-2.195V2.914A2.202 2.202 0 0 0 57.446.717Z"/><path fill="#fff" stroke="#fff" stroke-miterlimit="10" stroke-width=".2" d="M21.182 5.196c0 .351-.088.659-.307.878a1.29 1.29 0 0 1-.966.395 1.29 1.29 0 0 1-.966-.395 1.29 1.29 0 0 1-.395-.966c0-.395.132-.702.395-.966a1.29 1.29 0 0 1 .966-.395c.176 0 .351.044.527.132.175.088.307.176.395.307l-.22.22c-.175-.22-.395-.308-.702-.308-.263 0-.527.088-.702.308-.22.175-.308.439-.308.746s.088.57.308.746c.22.176.439.308.702.308a.963.963 0 0 0 .746-.308.727.727 0 0 0 .22-.526h-.966V5.02h1.273v.176Zm2.02-1.098h-1.186v.835h1.098v.307h-1.098v.834h1.186v.351h-1.537V3.791h1.537v.307Zm1.448 2.327h-.35V4.098h-.747v-.307h1.844v.307h-.746v2.327Zm2.02 0V3.791h.351v2.634h-.351Zm1.844 0h-.351V4.098h-.747v-.307h1.8v.307h-.746v2.327h.044Zm4.17-.35a1.29 1.29 0 0 1-.965.394 1.29 1.29 0 0 1-.966-.395 1.29 1.29 0 0 1-.395-.966c0-.395.132-.702.395-.966a1.29 1.29 0 0 1 .966-.395c.395 0 .702.132.966.395.263.264.395.571.395.966s-.132.703-.395.966Zm-1.668-.22c.176.175.44.307.703.307.263 0 .527-.088.702-.307a1.06 1.06 0 0 0 .308-.747c0-.307-.088-.57-.308-.746a1.036 1.036 0 0 0-.702-.307c-.264 0-.527.087-.703.307a1.06 1.06 0 0 0-.307.746c0 .308.088.571.307.747Zm2.547.57V3.791h.395l1.273 2.064V3.79h.351v2.634h-.351l-1.361-2.15v2.15h-.307Z"/><path fill="#fff" d="M30.27 10.289c-1.053 0-1.888.79-1.888 1.888 0 1.053.834 1.887 1.888 1.887 1.054 0 1.888-.79 1.888-1.887 0-1.142-.834-1.888-1.888-1.888Zm0 2.985c-.57 0-1.053-.483-1.053-1.141 0-.659.482-1.142 1.053-1.142.57 0 1.054.44 1.054 1.142 0 .658-.483 1.141-1.054 1.141Zm-4.083-2.985c-1.053 0-1.888.79-1.888 1.888 0 1.053.835 1.887 1.888 1.887 1.054 0 1.888-.79 1.888-1.887 0-1.142-.834-1.888-1.888-1.888Zm0 2.985c-.57 0-1.053-.483-1.053-1.141 0-.659.482-1.142 1.053-1.142s1.054.44 1.054 1.142c0 .658-.483 1.141-1.054 1.141Zm-4.873-2.415v.79h1.888c-.044.44-.22.79-.44 1.01-.263.264-.702.571-1.448.571-1.185 0-2.063-.922-2.063-2.107 0-1.186.922-2.107 2.063-2.107.615 0 1.098.263 1.449.57l.57-.57c-.482-.44-1.097-.79-1.975-.79-1.58 0-2.942 1.316-2.942 2.897 0 1.58 1.361 2.897 2.942 2.897.878 0 1.493-.263 2.02-.834.526-.527.702-1.273.702-1.844 0-.175 0-.35-.044-.483h-2.722Zm19.932.615c-.176-.439-.615-1.185-1.58-1.185-.967 0-1.757.746-1.757 1.888 0 1.053.79 1.887 1.844 1.887.834 0 1.361-.527 1.537-.834l-.615-.439c-.22.307-.483.527-.922.527-.439 0-.702-.176-.922-.57l2.503-1.054-.088-.22Zm-2.547.615c0-.703.571-1.098.966-1.098.308 0 .615.176.703.395l-1.669.703Zm-2.063 1.8h.834V8.4h-.834v5.488Zm-1.317-3.205c-.22-.22-.57-.44-1.01-.44-.922 0-1.8.835-1.8 1.889 0 1.053.834 1.844 1.8 1.844.44 0 .79-.22.966-.44h.044v.264c0 .702-.395 1.098-1.01 1.098-.483 0-.834-.352-.922-.66l-.702.308c.22.483.746 1.098 1.668 1.098.966 0 1.756-.57 1.756-1.932v-3.336h-.79v.307Zm-.966 2.59c-.57 0-1.054-.483-1.054-1.141 0-.659.483-1.142 1.054-1.142.57 0 1.01.483 1.01 1.142 0 .658-.44 1.141-1.01 1.141Zm10.712-4.873H43.09v5.488h.834v-2.064h1.141c.922 0 1.8-.658 1.8-1.712 0-1.054-.878-1.712-1.8-1.712Zm.044 2.634h-1.185V9.147h1.185c.615 0 .966.527.966.922-.044.483-.395.966-.966.966Zm5.049-.79c-.615 0-1.23.263-1.449.834l.746.307c.176-.307.44-.395.747-.395.439 0 .834.264.878.703v.043c-.132-.087-.483-.219-.834-.219-.79 0-1.58.439-1.58 1.23 0 .746.658 1.229 1.36 1.229.571 0 .834-.264 1.054-.527h.044v.439h.79V11.78c-.088-.966-.834-1.536-1.756-1.536Zm-.088 3.03c-.263 0-.658-.133-.658-.484 0-.439.483-.57.878-.57.35 0 .526.087.746.175-.088.527-.527.878-.966.878Zm4.61-2.899-.922 2.371h-.044l-.966-2.37h-.878l1.449 3.336-.834 1.844h.834l2.239-5.18h-.878Zm-7.376 3.513h.834V8.4h-.834v5.488Z"/><path fill="url(#b)" d="M4.939 4.01c-.132.132-.176.352-.176.615v9.703c0 .263.088.483.22.614l.043.044 5.444-5.444v-.087L4.94 4.01Z"/><path fill="url(#c)" d="m12.226 11.386-1.8-1.8v-.131l1.8-1.8.044.043 2.152 1.23c.614.351.614.922 0 1.273l-2.196 1.185Z"/><path fill="url(#d)" d="m12.27 11.342-1.844-1.844-5.487 5.488c.22.22.526.22.921.044l6.41-3.688Z"/><path fill="url(#e)" d="M12.27 7.655 5.86 4.01c-.395-.22-.702-.176-.921.044l5.487 5.443 1.844-1.843Z"/><path fill="#000" d="m12.226 11.299-6.366 3.6c-.35.219-.658.175-.878 0l-.043.043.043.044c.22.176.527.22.878 0l6.366-3.688Z"/><path fill="#000" d="M4.939 14.899c-.132-.132-.176-.352-.176-.615v.044c0 .263.088.483.22.614V14.9h-.044Zm9.482-4.83-2.195 1.23.044.043 2.152-1.229c.307-.175.438-.395.438-.615 0 .22-.175.396-.438.571Z"/><path fill="#fff" d="m5.86 4.055 8.561 4.873c.264.175.44.351.44.57 0-.219-.132-.439-.44-.614L5.861 4.01c-.615-.352-1.098-.088-1.098.614v.044c0-.658.483-.966 1.098-.614Z"/></g><defs><linearGradient id="b" x1="13.948" x2="7.359" y1="4.403" y2="15.749" gradientUnits="userSpaceOnUse"><stop stop-color="#00A0FF"/><stop offset=".007" stop-color="#00A1FF"/><stop offset=".26" stop-color="#00BEFF"/><stop offset=".512" stop-color="#00D2FF"/><stop offset=".76" stop-color="#00DFFF"/><stop offset="1" stop-color="#00E3FF"/></linearGradient><linearGradient id="c" x1="15.664" x2="-8.46" y1="9.441" y2="9.441" gradientUnits="userSpaceOnUse"><stop stop-color="#FFE000"/><stop offset=".409" stop-color="#FFBD00"/><stop offset=".775" stop-color="orange"/><stop offset="1" stop-color="#FF9C00"/></linearGradient><linearGradient id="d" x1="13.505" x2="-5.161" y1="5.869" y2="18.769" gradientUnits="userSpaceOnUse"><stop stop-color="#FF3A44"/><stop offset="1" stop-color="#C31162"/></linearGradient><linearGradient id="e" x1="2.883" x2="11.243" y1="-2.306" y2="3.445" gradientUnits="userSpaceOnUse"><stop stop-color="#32A071"/><stop offset=".069" stop-color="#2DA771"/><stop offset=".476" stop-color="#15CF74"/><stop offset=".801" stop-color="#06E775"/><stop offset="1" stop-color="#00F076"/></linearGradient><clipPath id="a"><path fill="#fff" d="M.373.498H59.64v18H.373z"/></clipPath></defs></svg>',
          'app-store': '<svg xmlns="http://www.w3.org/2000/svg" width="61" height="19" fill="none"><g clip-path="url(#a)"><path fill="#fff" d="M59.972 16.379a1.712 1.712 0 0 1-1.715 1.713H2.116a1.716 1.716 0 0 1-1.718-1.713V2.716A1.717 1.717 0 0 1 2.116 1h56.14a1.716 1.716 0 0 1 1.716 1.716V16.38Z"/><path fill="#A6A6A6" d="M58.257 18.49H2.116A2.117 2.117 0 0 1 0 16.38V2.717A2.117 2.117 0 0 1 2.116.602h56.14a2.118 2.118 0 0 1 2.116 2.115v13.662c.001 1.165-.95 2.112-2.115 2.112Z"/><path fill="#000" d="M59.972 16.379a1.712 1.712 0 0 1-1.715 1.713H2.116a1.716 1.716 0 0 1-1.718-1.713V2.716A1.717 1.717 0 0 1 2.116 1h56.14a1.716 1.716 0 0 1 1.716 1.716V16.38Z"/><path fill="#fff" d="M13.48 9.452c-.012-1.441 1.182-2.143 1.236-2.175-.676-.986-1.724-1.12-2.092-1.131-.88-.093-1.734.526-2.182.526-.458 0-1.148-.517-1.892-.502-.958.015-1.853.569-2.345 1.43-1.014 1.754-.257 4.333.714 5.752.486.695 1.054 1.47 1.797 1.443.727-.03.999-.463 1.876-.463.87 0 1.124.463 1.882.445.78-.012 1.272-.697 1.741-1.398.562-.796.787-1.58.796-1.621-.018-.006-1.515-.578-1.53-2.306Zm-1.431-4.24c.391-.488.659-1.154.584-1.829-.566.026-1.274.392-1.681.87-.36.421-.683 1.112-.6 1.762.636.047 1.289-.321 1.697-.802Z"/><path fill="url(#b)" d="M58.257.602H28.186l11.778 17.889h18.293a2.12 2.12 0 0 0 2.116-2.114V2.717A2.118 2.118 0 0 0 58.257.601Z"/><path fill="#fff" d="M24.012 14.695h-1.016l-.557-1.749h-1.934l-.53 1.749h-.99l1.918-5.953h1.183l1.926 5.953Zm-1.74-2.482-.504-1.555a19.84 19.84 0 0 1-.3-1.121h-.018a47.12 47.12 0 0 1-.283 1.121l-.495 1.555h1.6Zm6.661.283c0 .73-.198 1.307-.595 1.73a1.745 1.745 0 0 1-1.323.566c-.569 0-.978-.203-1.226-.609v2.253h-.954v-4.623c0-.458-.012-.928-.036-1.41h.84l.053.68h.017c.319-.513.801-.77 1.45-.77.506 0 .928.2 1.267.601.338.401.507.928.507 1.582Zm-.972.035c0-.418-.094-.762-.282-1.034a.978.978 0 0 0-.83-.424.992.992 0 0 0-.641.234 1.085 1.085 0 0 0-.375.614 1.257 1.257 0 0 0-.045.29v.717c0 .312.096.575.287.79.192.216.44.323.747.323.359 0 .639-.139.839-.415.2-.277.3-.642.3-1.095Zm5.91-.035c0 .73-.198 1.307-.594 1.73a1.746 1.746 0 0 1-1.324.566c-.57 0-.978-.203-1.226-.609v2.253h-.954v-4.623c0-.458-.012-.928-.036-1.41h.84l.053.68h.017c.318-.513.8-.77 1.45-.77.505 0 .928.2 1.267.601.338.401.508.928.508 1.582Zm-.971.035c0-.418-.095-.762-.284-1.034a.976.976 0 0 0-.83-.424.996.996 0 0 0-.64.234 1.085 1.085 0 0 0-.376.614 1.28 1.28 0 0 0-.044.29v.717c0 .312.096.575.287.79.191.215.44.323.747.323.36 0 .64-.139.839-.415.2-.277.3-.642.3-1.095Zm6.493.494c0 .507-.177.919-.53 1.237-.387.347-.928.521-1.621.521-.64 0-1.154-.123-1.542-.37l.22-.796c.419.248.878.372 1.379.372.36 0 .64-.082.839-.243a.794.794 0 0 0 .3-.649.831.831 0 0 0-.247-.61c-.165-.164-.438-.318-.822-.459-1.042-.388-1.564-.957-1.564-1.705 0-.488.184-.888.552-1.2.368-.313.856-.47 1.462-.47.542 0 .994.095 1.352.284l-.24.777a2.365 2.365 0 0 0-1.143-.274c-.337 0-.6.083-.79.248a.708.708 0 0 0-.239.54c0 .234.092.429.274.582.159.14.448.294.866.459.512.207.89.447 1.13.724.243.276.364.621.364 1.032Zm3.162-1.907h-1.051v2.084c0 .53.185.795.556.795.17 0 .312-.015.424-.045l.027.725c-.188.07-.436.105-.742.105-.377 0-.672-.115-.884-.345-.212-.23-.318-.615-.318-1.157v-2.164h-.627v-.715h.627v-.786l.937-.283v1.069h1.051v.717Zm4.735 1.395c0 .66-.189 1.202-.565 1.626-.395.436-.919.653-1.573.653-.63 0-1.132-.209-1.506-.626-.374-.418-.561-.945-.561-1.581 0-.665.193-1.21.578-1.634.386-.424.906-.636 1.56-.636.63 0 1.136.21 1.52.627.365.406.547.929.547 1.571Zm-.989.022c0-.393-.085-.73-.255-1.012-.2-.341-.486-.512-.858-.512-.382 0-.675.17-.874.512-.171.282-.256.625-.256 1.03 0 .394.085.732.256 1.013.206.341.494.512.867.512.364 0 .65-.174.857-.52.175-.29.263-.629.263-1.023Zm4.091-1.294c-.099-.018-.2-.027-.3-.026-.336 0-.595.126-.778.38-.158.224-.238.506-.238.848v2.252h-.954v-2.94c0-.451-.008-.902-.028-1.352h.831l.035.821h.026c.102-.282.26-.51.478-.68.199-.15.44-.23.689-.23.088 0 .168.006.238.017l.001.91Zm4.267 1.105c.002.145-.01.29-.035.432h-2.862c.01.424.15.749.415.973.241.2.553.3.936.3.424 0 .81-.068 1.158-.203l.15.661c-.407.178-.886.266-1.44.266-.666 0-1.188-.196-1.569-.587-.379-.392-.57-.918-.57-1.577 0-.647.178-1.186.532-1.615.37-.46.87-.689 1.5-.689.62 0 1.088.23 1.406.689.252.363.379.814.379 1.35Zm-.91-.248a1.29 1.29 0 0 0-.185-.733c-.165-.266-.42-.398-.76-.398a.904.904 0 0 0-.76.389 1.425 1.425 0 0 0-.282.741l1.987.001Zm-33.52-5.46c-.265 0-.494-.014-.685-.036V3.724c.267-.041.537-.061.807-.06 1.094 0 1.598.538 1.598 1.415 0 1.012-.595 1.558-1.72 1.558Zm.16-2.606c-.147 0-.273.01-.377.03v2.189c.056.009.165.013.317.013.717 0 1.125-.408 1.125-1.172 0-.682-.37-1.06-1.064-1.06Zm3.13 2.627c-.616 0-1.016-.46-1.016-1.085 0-.651.408-1.116 1.051-1.116.608 0 1.016.439 1.016 1.081 0 .66-.42 1.12-1.05 1.12Zm.018-1.858c-.339 0-.556.317-.556.76 0 .434.222.75.552.75.33 0 .55-.338.55-.76 0-.429-.216-.75-.546-.75Zm4.55-.3-.66 2.11h-.43l-.274-.916a6.939 6.939 0 0 1-.17-.681h-.009c-.034.23-.1.46-.169.681l-.29.916h-.435l-.621-2.11h.482l.239 1.004c.056.238.104.464.143.677h.009c.034-.178.09-.4.173-.673l.3-1.007h.382l.287.986c.067.229.123.46.17.694h.012c.03-.217.079-.447.143-.694l.257-.986h.46Zm2.429 2.11h-.469V5.4c0-.373-.143-.56-.426-.56-.277 0-.468.239-.468.517V6.61h-.47V5.105c0-.187-.004-.387-.017-.604h.413l.022.326h.013a.758.758 0 0 1 .668-.369c.444 0 .734.339.734.89v1.263Zm1.293 0h-.47V3.534h.47V6.61Zm1.71.048c-.616 0-1.016-.46-1.016-1.085 0-.651.408-1.116 1.05-1.116.608 0 1.016.439 1.016 1.081 0 .66-.42 1.12-1.05 1.12Zm.017-1.858c-.339 0-.556.317-.556.76 0 .434.222.75.551.75.33 0 .552-.338.552-.76 0-.429-.217-.75-.547-.75Zm2.882 1.81-.034-.243h-.012c-.144.196-.352.291-.617.291-.379 0-.647-.265-.647-.62 0-.521.452-.79 1.233-.79v-.04c0-.277-.147-.417-.438-.417a.99.99 0 0 0-.551.157l-.095-.308c.195-.122.438-.183.724-.183.551 0 .83.291.83.873v.777c0 .213.009.378.03.504h-.423Zm-.064-1.05c-.521 0-.782.126-.782.425 0 .221.134.33.321.33.239 0 .46-.182.46-.43V5.56Zm2.734 1.05-.022-.338h-.013c-.135.256-.361.386-.678.386-.508 0-.885-.447-.885-1.077 0-.66.39-1.124.924-1.124.282 0 .482.095.595.287h.01V3.534h.469v2.509c0 .204.005.395.017.568h-.417Zm-.07-1.241c0-.295-.195-.547-.494-.547-.347 0-.56.308-.56.742 0 .425.22.717.55.717.296 0 .504-.257.504-.56V5.37Zm3.446 1.29c-.617 0-1.016-.461-1.016-1.086 0-.651.408-1.116 1.05-1.116.609 0 1.017.439 1.017 1.081 0 .66-.421 1.12-1.051 1.12ZM42.48 4.8c-.338 0-.555.317-.555.76 0 .434.221.75.55.75.33 0 .552-.338.552-.76 0-.429-.216-.75-.547-.75Zm3.555 1.81h-.469V5.4c0-.373-.143-.56-.425-.56-.278 0-.469.239-.469.517V6.61h-.47V5.105c0-.187-.004-.387-.017-.604h.413l.022.326h.013a.757.757 0 0 1 .668-.37c.443 0 .734.34.734.89v1.264Zm3.155-1.758h-.516v1.025c0 .26.091.39.274.39a.925.925 0 0 0 .208-.021l.013.356a1.04 1.04 0 0 1-.364.052c-.37 0-.59-.204-.59-.738V4.853h-.309v-.351h.308v-.387l.46-.139v.525h.517v.352Zm2.483 1.758h-.469V5.41c0-.378-.142-.569-.425-.569-.243 0-.47.165-.47.5V6.61h-.468V3.534h.468V4.8h.01a.711.711 0 0 1 .634-.343c.447 0 .72.347.72.899V6.61Zm2.543-.942H52.81c.009.4.273.625.665.625.208 0 .4-.035.569-.1l.072.326c-.199.087-.434.13-.707.13-.66 0-1.051-.417-1.051-1.063 0-.647.4-1.133.998-1.133.539 0 .877.4.877 1.003a.907.907 0 0 1-.016.212Zm-.43-.334c0-.326-.164-.555-.464-.555-.27 0-.482.234-.513.555h.977Z"/></g><defs><linearGradient id="b" x1="44.279" x2="44.279" y1="18.538" y2="-45.975" gradientUnits="userSpaceOnUse"><stop stop-color="#1A1A1A" stop-opacity=".1"/><stop offset=".123" stop-color="#212121" stop-opacity=".151"/><stop offset=".308" stop-color="#353535" stop-opacity=".227"/><stop offset=".532" stop-color="#575757" stop-opacity=".318"/><stop offset=".783" stop-color="#858585" stop-opacity=".421"/><stop offset="1" stop-color="#B3B3B3" stop-opacity=".51"/></linearGradient><clipPath id="a"><path fill="#fff" d="M0 .498h60.373v18H0z"/></clipPath></defs></svg>',
        },
      },
    }),
    presetRemToPx({ baseFontSize: 4 }),
    presetAttributify(),

    {
      name: 'radix-variants',
      variants: [
        (matcher) => {
          if (!matcher.startsWith('r-'))
            return matcher
          const match = matcher.match(reRadix)
          if (!match)
            return
          const [_, ref, state] = match
          return {
            matcher: matcher.replace(reRadix, ''),
            selector: s => `[${ref}][data-state="${state}"] ${s}`,
          }
        },
        (matcher) => {
          if (!matcher.match(reRadixHocus))
            return matcher
          const match = matcher.match(reRadixHocus)
          if (!match)
            return
          const [_, ref] = match
          return {
            matcher: matcher.replace(reRadixHocus, ''),
            selector: s => `[${ref}]:hover ${s}, [${ref}]:focus-visible ${s}`,
          }
        },
      ],
    },

  ],
  theme: {
    breakpoints: {
      desktop: '768px',
    },
  },
  shortcuts: {
    centered: 'grid place-content-center',
  },
  // TODO Move to nimiq-css?
  variants: [
    (matcher) => {
      if (!matcher.startsWith('hocus'))
        return matcher

      return {
        matcher: matcher.replace(matcher.startsWith('hocus:') ? 'hocus:' : 'hocus', ''),
        selector: s => `${s}:hover, ${s}:focus-visible`,
      }
    },
    (matcher) => {
      if (!matcher.startsWith('group-hocus'))
        return matcher
      return {
        matcher: matcher.replace(matcher.startsWith('group-hocus:') ? 'group-hocus:' : 'group-hocus', ''),
        selector: s => `:is(.group,[group]):is(:hover,:focus-visible) ${s}`,
      }
    },

    // https://github.com/unpreset/unocss-preset-scrollbar/blob/main/src/index.ts#L143C7-L155C9
    (matcher) => {
      if (!variantsRE.test(matcher))
        return
      const variant = matcher.replace(variantsRE, '$1')
      return {
        matcher: matcher.slice(variant.length + 1),
        selector: s => `${s}::-webkit-${variant}`,
      }
    },
  ],
  transformers: [
    transformerDirectives(),
  ],
})
