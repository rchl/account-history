import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
    ssr: false,
    modules: [
        'vuetify-nuxt-module',
    ],
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    silenceDeprecations: [
                        'color-functions',
                        'global-builtin',
                        'import',
                    ],
                },
            },
        },
    },
    vue: {
        runtimeCompiler: true,
    },
})