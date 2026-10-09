import VueChartist from 'vue-chartist'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(VueChartist)
})
