<template>
    <v-container>
        <div class="d-flex align-start ga-2 mb-3">
            <api-controls @data-loaded="onApiDataLoaded" @accounts-loaded="onAccountsLoaded" />
            <tag-rules :data="rawData" :all-tags="allTags" @apply-to-existing="applyTagRulesToStored" />
        </div>
        <div class="mb-3">
            <div v-if="dbError" class="alert alert-danger mt-1" role="alert">
                {{ dbError }}
            </div>
        </div>
        <range-controls @range-selected="processData2" />
        <v-select
            v-model="selectedAccountIds"
            :items="accountFilterItems"
            item-title="title"
            item-value="value"
            label="Filter by account"
            density="compact"
            variant="outlined"
            multiple
            chips
            clearable
            hide-details
            class="mb-3"
        >
            <template #item="{ props, item }">
                <v-list-item
                    v-bind="props"
                    :prepend-avatar="item.raw.logo"
                />
            </template>
            <template #chip="{ props, item }">
                <v-chip
                    v-bind="props"
                    :prepend-avatar="item.raw.logo"
                    :text="item.raw.title"
                />
            </template>
        </v-select>
        <v-select
            v-model="selectedTags"
            :items="tagFilterItems"
            label="Filter by tag"
            density="compact"
            variant="outlined"
            multiple
            chips
            clearable
            hide-details
            class="mb-3"
        />

        <div v-if="rawData.length" class="mb-3">
            <div class="mb-1 d-flex ga-3 text-body-2">
                <div class="flex-grow-1 rounded pa-3 bg-green-lighten-3">
                    <div>Total income: {{ summary.income }}</div>
                    <div>Average income per {{ timeGrouping }}: {{ averageIncome }}</div>
                </div>
                <div class="flex-grow-1 rounded pa-3 bg-orange-lighten-3">
                    <div>Total expenses: {{ summary.expenses }}</div>
                    <div>Average expenses per {{ timeGrouping }}: {{ averageSpendings }}</div>
                </div>
            </div>

            <chartist
                id="monthly-chart"
                class="mb-4 chartist-tooltip"
                type="Bar"
                ratio="none"
                :data="chartData"
                :options="chartOptions"
            />

            <div class="mb-4">
                <v-btn-toggle
                    v-model="timeGrouping"
                    class="mr-2"
                    color="primary"
                    variant="outlined"
                    mandatory
                    divided
                    density="compact"
                >
                    <v-btn value="year">
                        Group by year
                    </v-btn>
                    <v-btn value="month">
                        Group by month
                    </v-btn>
                </v-btn-toggle>

                <v-btn-toggle
                    v-model="incomeGrouping"
                    color="primary"
                    variant="outlined"
                    mandatory
                    divided
                    density="compact"
                >
                    <v-btn :value="false">
                        Separate income & expenses
                    </v-btn>
                    <v-btn :value="true">
                        Group income+expenses
                    </v-btn>
                </v-btn-toggle>
            </div>
        </div>
        <div v-else class="alert alert-secondary m-3" role="alert">
            No data
        </div>
        <v-btn v-if="selectedProcessedData.length" class="mb-3" color="outline-primary" @click="selectedProcessedData = []">
            Unselect {{ selectedProcessedData.length }} selected item(s)
        </v-btn>
        <data-table
            v-model:selected="selectedProcessedData"
            :data="accountFilteredData"
            :account-institutions="accountInstitutions"
            :all-tags="allTags"
            class="m-3"
            @tags-changed="onTagsChanged"
            @delete="onDeleteTransactions"
        />
    </v-container>
</template>

<script setup lang="ts">
import 'chartist/dist/chartist.min.css'
import { Database, type TransactionItem, type TransactionTags } from '~/services/db'
import { compileTagRules, loadTagRules, matchTags } from '~/services/tag_rules'
import { formatCurrency } from '~/services/utils'
import type { AccountInstitution } from '~/types/gocardless'

const title = ref('account-history')
const description = ref('Show the money')

useHead({
    title,
    meta: [{
        name: 'description',
        content: description,
    }],
})

const route = useRoute()
const router = useRouter()

const rawData = ref<Account.DataLine[]>([])
const processedData = ref<Account.DataLine[]>([])
const selectedProcessedData = ref<Account.DataLine[]>([])
const selectedAccountIds = ref<string[]>(
    [route.query.accounts].flat().filter((value): value is string => typeof value === 'string'),
)
const selectedTags = ref<string[]>(
    [route.query.tags].flat().filter((value): value is string => typeof value === 'string'),
)
const appliedFilter = ref<{ from: string, to: string, filter: string }>({ from: '', to: '', filter: '' })

// Remember the account filter in the URL so it survives reloads and can be shared.
watch(selectedAccountIds, (ids) => {
    router.replace({
        query: {
            ...route.query,
            accounts: ids.length ? ids : undefined,
        },
    })
})

watch(selectedTags, (tags) => {
    router.replace({
        query: {
            ...route.query,
            tags: tags.length ? tags : undefined,
        },
    })
})

const db = ref<Database | null>(null)
const dbData = ref<TransactionItem[]>([])
const dbError = ref('')

const accountInstitutions = ref<Record<string, { name: string, logo?: string }>>({})

const chartData = ref<Account.ChartData>({ labels: [], series: [[], []] })
const chartOptions = ref<any>(null)
const timeGrouping = ref<'month' | 'year'>('month')
const incomeGrouping = ref(false)
const highValue = ref(0)
const lowValue = ref(0)
const averageIncome = ref('0')
const averageSpendings = ref('0')

const accountIds = computed<string[]>(() => [...new Set(rawData.value.map(line => line.accountId))])

const accountFilterItems = computed(() => accountIds.value.map((id) => {
    const institution = accountInstitutions.value[id]
    return {
        value: id,
        title: institution?.name ?? id,
        logo: institution?.logo,
    }
}))

// Sentinel filter value matching transactions without any tags.
const UNTAGGED = '__untagged__'

const allTags = computed<string[]>(() => [...new Set(rawData.value.flatMap(line => line.tags))].sort())

const tagFilterItems = computed(() => [
    { value: UNTAGGED, title: '(untagged)' },
    ...allTags.value.map(tag => ({ value: tag, title: tag })),
])

const accountFilteredData = computed<Account.DataLine[]>(() => {
    const accountIds = selectedAccountIds.value
    const tags = selectedTags.value
    if (!accountIds.length && !tags.length) {
        return processedData.value
    }
    return processedData.value.filter(line =>
        (!accountIds.length || accountIds.includes(line.accountId)) &&
        (!tags.length || (line.tags.length ? line.tags.some(tag => tags.includes(tag)) : tags.includes(UNTAGGED))))
})

const visibleData = computed<Account.DataLine[]>(() => {
    if (selectedProcessedData.value.length) {
        return selectedProcessedData.value
    }
    return accountFilteredData.value
})

const summary = computed(() => {
    let income = 0
    let expenses = 0
    for (const lineData of visibleData.value) {
        if (lineData.amount > 0) {
            income += lineData.amount
        } else {
            expenses += Math.abs(lineData.amount)
        }
    }
    return {
        income: formatCurrency(income),
        expenses: formatCurrency(expenses),
    }
})

onMounted(async() => {
    db.value = await Database.open()
    await dbGetAll()
    processData2()
})

watch(rawData, () => processData2())
watch([visibleData, timeGrouping, incomeGrouping], () => onDataChanged())

function parseInputDate(date: string, ceil = false) {
    const match = date.match(/(\d+)-(\d+)-(\d+)/)
    if (!match) {
        return new Date(0)
    }
    const components: [number, number, number] = [match[1], match[2], match[3]].map(c => Number.parseInt(c))
    if (ceil) {
        return new Date(components[0], components[1] - 1, components[2], 23, 59, 59)
    }
    return new Date(components[0], components[1] - 1, components[2])
}

async function onApiDataLoaded(items: TransactionItem[], newIds: string[]) {
    const tagsById = await db.value?.getAllTags()
    const lines = items.map(item => ({ ...item, tags: tagsById?.get(item.id) ?? [] }))
    onDbDataLoaded(lines)
    // Only auto-tag newly imported transactions so re-imports don't undo manual tag removals.
    const newIdSet = new Set(newIds)
    await applyTagRules(lines.filter(line => newIdSet.has(line.id)))
}

// Adds tags from the configured tag rules to the given transactions (never removes tags).
async function applyTagRules(lines: Account.DataLine[]) {
    const rules = compileTagRules(loadTagRules())
    if (!rules.length) {
        return
    }
    const changes: TransactionTags[] = []
    for (const line of lines) {
        const tags = [...new Set([...line.tags, ...matchTags(line.text, rules)])].sort()
        if (tags.length !== line.tags.length) {
            changes.push({ transactionId: line.id, tags })
        }
    }
    if (changes.length) {
        await onTagsChanged(changes)
    }
}

async function applyTagRulesToStored() {
    if (!db.value) {
        return
    }
    const [items, tagsById] = await Promise.all([db.value.getAll(), db.value.getAllTags()])
    await applyTagRules(items.map(item => ({ ...item, date: new Date(item.date), tags: tagsById.get(item.id) ?? [] })))
}

async function onTagsChanged(changes: TransactionTags[]) {
    try {
        await db.value?.setTags(changes)
    } catch (error) {
        dbError.value = (error as Error).message
        return
    }
    const tagsById = new Map(changes.map(change => [change.transactionId, change.tags]))
    for (const line of rawData.value) {
        const tags = tagsById.get(line.id)
        if (tags) {
            line.tags = tags
        }
    }
}

async function onDeleteTransactions(ids: string[]) {
    try {
        await db.value?.deleteItems(ids)
    } catch (error) {
        dbError.value = (error as Error).message
        return
    }
    const deleted = new Set(ids)
    rawData.value = rawData.value.filter(line => !deleted.has(line.id))
    selectedProcessedData.value = selectedProcessedData.value.filter(line => !deleted.has(line.id))
}

function onAccountsLoaded(accounts: AccountInstitution[]) {
    accountInstitutions.value = Object.fromEntries(
        accounts.map(account => [account.id, { name: account.institutionName, logo: account.institutionLogo }]),
    )
}

function onDbDataLoaded(data: Account.DataLine[]): void {
    rawData.value = data
}

async function dbGetAll() {
    if (db.value) {
        dbData.value = await db.value.getAll()
        const tagsById = await db.value.getAllTags()
        dbData.value.sort((a, b) => b.date.valueOf() - a.date.valueOf())
        const items = dbData.value.map(dbItem => ({
            id: dbItem.id,
            accountId: dbItem.accountId,
            amount: dbItem.amount,
            currency: dbItem.currency,
            date: new Date(dbItem.date),
            text: dbItem.text,
            tags: tagsById.get(dbItem.id) ?? [],
        }))
        onDbDataLoaded(items)
    }
}

function processData2(from?: string, to?: string, filter?: string) {
    // range-controls passes explicit args when the user applies a filter; internal
    // re-processing (data load, mount) passes none — reuse the last applied values then.
    if (from !== undefined || to !== undefined || filter !== undefined) {
        appliedFilter.value = { from: from || '', to: to || '', filter: filter || '' }
    }
    const { from: appliedFrom, to: appliedTo, filter: appliedText } = appliedFilter.value
    const regexpFilter = appliedText ? new RegExp(appliedText, 'i') : null
    const fromDate = appliedFrom ? parseInputDate(appliedFrom) : null
    const toDate = appliedTo ? parseInputDate(appliedTo, true) : null
    processedData.value = rawData.value.filter(
        line => (!fromDate || line.date >= fromDate) &&
                (!toDate || line.date <= toDate) &&
                (!regexpFilter || regexpFilter.test(line.text)))
}

function onDataChanged() {
    const grouped = processData()

    if (incomeGrouping.value) {
        for (const data of grouped.data) {
            const total = data.income - data.expenses
            if (total >= 0) {
                data.income = total
                data.expenses = 0
            } else {
                data.income = 0
                data.expenses = total
            }
        }
    }

    chartData.value = {
        // Labels on the X-axis
        labels: grouped.data.map(month => month.label).reverse(),
        series: [
            grouped.data.map(data => ({
                meta: data.label,
                value: data.expenses,
            })).reverse(),
            grouped.data.map(data => ({
                meta: data.label,
                value: data.income,
            })).reverse(),
        ],
    }

    chartOptions.value = {
        axisX: {
            // showGrid: true,
            labelInterpolationFnc: (v: number) => Math.abs(v) >= 1000 ? `${v / 1000}k` : v,
        },
        axisY: {
            offset: 100,
            // labelInterpolationFnc: (label, index) => index % 1 ? null : label.replace('-', ' '),
        },
        height: grouped.data.length * 50 + 25,
        horizontalBars: true,
        // high: this.highValue,
        // low: this.lowValue,
        // stackBars: true,
        // stackMode: 'overlap',
        plugins: [
            // ChartistTooltip({
            //     anchorToPoint: true,
            //     transformTooltipTextFnc: value => this.formatCurrency(value),
            // }),
        ],
        seriesBarDistance: 10,
    }
}

function processData(): Account.ProcessedData {
    const outputData: Account.ProcessedDataLine[] = []
    let lastFormattedDate
    let totalIncome = 0
    let totalSpendings = 0
    let series = 0
    let seriesData: Account.ProcessedDataLine = { income: 0, expenses: 0, label: '' }
    highValue.value = 0
    lowValue.value = 0
    for (const lineData of visibleData.value) {
        const date = new Date(lineData.date)
        const formattedDate = timeGrouping.value === 'month'
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            : `${date.getFullYear()}`

        if (lastFormattedDate !== formattedDate) {
            lastFormattedDate = formattedDate
            series++
            seriesData = {
                income: 0,
                expenses: 0,
                label: formattedDate,
            }
            outputData.push(seriesData)
        }
        if (lineData.amount > 0) {
            totalIncome += lineData.amount
            seriesData.income += lineData.amount
            if (seriesData.income > highValue.value) {
                highValue.value = seriesData.income
            }
        } else {
            totalSpendings += Math.abs(lineData.amount)
            seriesData.expenses += Math.abs(lineData.amount)
            if (seriesData.expenses < lowValue.value) {
                lowValue.value = seriesData.expenses
            }
        }
    }
    averageIncome.value = formatCurrency(Math.round(totalIncome / series), 'NOK')
    averageSpendings.value = formatCurrency(Math.round(totalSpendings / series), 'NOK')
    return { data: outputData, averageIncome: averageIncome.value, averageSpendings: averageSpendings.value }
}

onDataChanged()
</script>

<style lang="css">
  /* series-a = expenses */
  .ct-series-a .ct-bar {
    stroke: #ffcc80 !important;
  }

  /* series-b = income */
  .ct-series-b .ct-bar {
    stroke: #A5D6A7 !important;
  }

  .chartist-tooltip {
    font-size: small;
    font-weight: normal;
  }
</style>
