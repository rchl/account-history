<template>
    <v-form @submit.prevent="onFilterChanged">
        <v-row>
            <v-col cols="3">
                <v-text-field v-model="fromDate" type="date" label="From" @change="onFilterChanged" />
            </v-col>
            <v-col cols="3">
                <v-text-field v-model="toDate" type="date" label="To" @change="onFilterChanged" />
            </v-col>
            <v-col cols="4">
                <v-text-field
                    v-model="filter"
                    label="Filter text (regex)"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    hide-details
                />
            </v-col>
            <v-col cols="2">
                <v-btn class="mt-2" type="submit" color="primary">
                    Apply
                </v-btn>
            </v-col>
        </v-row>
    </v-form>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const fromDate = ref(typeof route.query.from === 'string' ? route.query.from : '')
const toDate = ref(typeof route.query.to === 'string' ? route.query.to : '')
const filter = ref(typeof route.query.q === 'string' ? route.query.q : '')

const emit = defineEmits<{
    'range-selected': [fromDate: string, toDate: string, filter: string]
}>()

function requestData() {
    // Remember the applied period/query in the URL so it survives reloads and can be shared.
    router.replace({
        query: {
            ...route.query,
            from: fromDate.value || undefined,
            to: toDate.value || undefined,
            q: filter.value || undefined,
        },
    })
    emit('range-selected', fromDate.value, toDate.value, filter.value)
}

function onFilterChanged() {
    requestData()
}

onMounted(() => {
    nextTick(requestData)
})
</script>
