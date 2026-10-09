<template>
    <div>
        <v-btn :loading="integrationsLoading" @click="openConnectToBankDialog">
            Bank Integrations
        </v-btn>

        <div v-if="loadingDataPromise" class="text-center alert alert-secondary m-3" role="alert">
            <v-progress-circular color="primary" indeterminate /><br>
            Loading data...
        </div>

        <v-dialog v-model="gocardlessModalOpen" scrollable location="top" max-width="1000">
            <template #default="{ isActive }">
                <v-card>
                    <v-toolbar>
                        <v-toolbar-title>Integrations</v-toolbar-title>
                    </v-toolbar>

                    <v-card-text>
                        <v-tabs
                            v-model="gocardlessModalTab"
                            align-tabs="center"
                        >
                            <v-tab :value="1">
                                Connected
                            </v-tab>
                            <v-tab :value="2">
                                Add
                            </v-tab>
                        </v-tabs>

                        <v-tabs-window v-model="gocardlessModalTab">
                            <v-tabs-window-item :key="1" :value="1">
                                <v-container fluid>
                                    <v-card
                                        v-for="item in requisitions"
                                        :key="item.reference"
                                        :prepend-avatar="item.institution ? item.institution.logo : undefined"
                                        class="mb-4"
                                        :title="item.institution ? item.institution.name : item.institution_id"
                                    >
                                        <v-card-text>
                                            <div>Created {{ new Date(item.created).toLocaleString() }}</div>
                                            <div>Redirect: {{ item.redirect }}</div>
                                            <div>Link: {{ item.link }}</div>
                                            <div>Status: {{ RequisitionStatusMap[item.status] || item.status }}</div>

                                            <v-sheet border rounded class="mt-2">
                                                <v-data-table
                                                    :headers="accountsHeaders"
                                                    :items="item.accountsInfo"
                                                    hide-default-footer
                                                >
                                                    <template #top>
                                                        <v-toolbar flat density="compact">
                                                            <v-toolbar-title>
                                                                <v-icon color="medium-emphasis" icon="mdi-account" size="x-small" start />
                                                                Accounts
                                                            </v-toolbar-title>
                                                        </v-toolbar>
                                                    </template>

                                                    <template #item.created="{ value }">
                                                        {{ new Date(value).toLocaleString() }}
                                                    </template>

                                                    <template #item.invertSign="{ item }">
                                                        <div class="d-flex justify-center">
                                                            <v-checkbox-btn
                                                                v-tooltip="'Invert the sign of imported transactions (e.g. for credit card accounts)'"
                                                                :model-value="invertedAccountIds.has(item.id)"
                                                                density="compact"
                                                                @update:model-value="setAccountInverted(item.id, !!$event)"
                                                            />
                                                        </div>
                                                    </template>

                                                    <template #item.actions="{ item }">
                                                        <div class="d-flex ga-1 justify-end">
                                                            <v-btn
                                                                v-tooltip="'Show account info'"
                                                                color="grey-lighten-1"
                                                                icon="mdi-information"
                                                                size="x-small"
                                                                variant="text"
                                                                :loading="isAccountActionLoading(item.id, 'info')"
                                                                @click="showAccountInfo(item.id)"
                                                            />
                                                            <v-btn
                                                                v-tooltip="'Show balances'"
                                                                color="grey-lighten-1"
                                                                icon="mdi-scale-balance"
                                                                size="x-small"
                                                                variant="text"
                                                                :loading="isAccountActionLoading(item.id, 'balances')"
                                                                @click="showAccountBalances(item.id)"
                                                            />
                                                            <v-btn
                                                                v-tooltip="'Load transactions'"
                                                                color="grey-lighten-1"
                                                                icon="mdi-download-circle"
                                                                size="x-small"
                                                                variant="text"
                                                                @click="loadTransactions(item.id)"
                                                            />
                                                        </div>
                                                    </template>
                                                </v-data-table>
                                            </v-sheet>
                                        </v-card-text>
                                        <v-card-actions>
                                            <v-btn :loading="loadingAgreementId === item.agreement" @click="showAgreemenentInfo(item.agreement)">
                                                Agreement info
                                            </v-btn>
                                            <v-btn
                                                color="primary"
                                                text="Renew"
                                                @click="renewRequisition(item)"
                                            />
                                            <v-btn
                                                color="red-accent-4"
                                                text="Delete"
                                                variant="text"
                                                @click="deleteRequisition(item.id)"
                                            />
                                        </v-card-actions>
                                    </v-card>
                                </v-container>
                            </v-tabs-window-item>

                            <v-tabs-window-item :key="2" :value="2">
                                <v-container fluid>
                                    <v-row align="center" justify="center" dense>
                                        <v-col
                                            v-for="item in institutions"
                                            :key="item.id"
                                            cols="12"
                                            md="6"
                                        >
                                            <v-card
                                                :prepend-avatar="item.logo"
                                                class="mx-auto"
                                                :title="item.name"
                                                link
                                                @click="connectToBank(item)"
                                            />
                                        </v-col>
                                    </v-row>
                                </v-container>
                            </v-tabs-window-item>
                        </v-tabs-window>
                    </v-card-text>

                    <v-divider class="mt-2" />

                    <v-card-actions>
                        <v-spacer />

                        <v-btn
                            text="Close"
                            @click="isActive.value = false"
                        />
                    </v-card-actions>
                </v-card>
            </template>
        </v-dialog>

        <v-dialog v-model="infoDialogOpen" scrollable max-width="600">
            <template #default="{ isActive }">
                <v-card :title="infoDialogTitle">
                    <v-card-text>
                        <template v-for="section in infoDialogSections" :key="section.title">
                            <div class="text-subtitle-1 font-weight-medium mt-4 mb-1">
                                {{ section.title }}
                            </div>
                            <v-table>
                                <tbody>
                                    <tr v-for="value, key in section.data" :key="key">
                                        <td>{{ key }}</td>
                                        <td>{{ value }}</td>
                                    </tr>
                                </tbody>
                            </v-table>
                        </template>
                    </v-card-text>

                    <v-card-actions>
                        <v-spacer />

                        <v-btn
                            text="Close"
                            @click="isActive.value = false"
                        />
                    </v-card-actions>
                </v-card>
            </template>
        </v-dialog>

        <v-dialog v-model="errorDialogOpen" max-width="500">
            <v-card :title="errorDialog.summary">
                <v-card-text>
                    <p>{{ errorDialog.detail }}</p>
                    <p v-if="errorDialog.isInvalidToken" class="mt-2">
                        Get a new token to continue. You'll be asked for your gocardless
                        API ID and Secret Key.
                    </p>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />

                    <v-btn
                        text="Close"
                        @click="errorDialogOpen = false"
                    />
                    <v-btn
                        v-if="errorDialog.isInvalidToken"
                        color="primary"
                        text="Get new token"
                        @click="openTokenForm"
                    />
                </v-card-actions>
            </v-card>
        </v-dialog>

        <v-dialog v-model="tokenFormOpen" max-width="500" persistent>
            <v-card title="Get gocardless API token">
                <v-form @submit.prevent="submitTokenForm">
                    <v-card-text>
                        <p class="mb-4">
                            Enter your gocardless API credentials. You can create these in the
                            gocardless Bank Account Data portal under Developers → User secrets.
                        </p>

                        <v-text-field
                            v-model="tokenForm.secretId"
                            label="API ID (Secret ID)"
                            :rules="[v => !!v || 'API ID is required']"
                            autofocus
                            required
                        />
                        <v-text-field
                            v-model="tokenForm.secretKey"
                            label="Secret Key"
                            type="password"
                            :rules="[v => !!v || 'Secret Key is required']"
                            required
                        />

                        <v-alert
                            v-if="tokenFormError"
                            type="error"
                            density="compact"
                            class="mt-2"
                            :text="tokenFormError"
                        />
                    </v-card-text>

                    <v-card-actions>
                        <v-spacer />

                        <v-btn
                            text="Cancel"
                            :disabled="tokenFormLoading"
                            @click="cancelTokenForm"
                        />
                        <v-btn
                            color="primary"
                            text="Get token"
                            type="submit"
                            :loading="tokenFormLoading"
                            :disabled="!tokenForm.secretId || !tokenForm.secretKey"
                        />
                    </v-card-actions>
                </v-form>
            </v-card>
        </v-dialog>

        <v-dialog v-model="connectDialogOpen" max-width="500">
            <v-card :title="connectInstitution ? `Connect ${connectInstitution.name}` : 'Connect'">
                <v-form @submit.prevent="submitConnect">
                    <v-card-text>
                        <p class="mb-4">
                            Choose how many days of transaction history to request. This bank allows up to
                            {{ connectInstitution?.transaction_total_days }} days.
                        </p>

                        <v-text-field
                            v-model.number="connectMaxHistoricalDays"
                            label="Days of transaction history"
                            type="number"
                            min="1"
                            :max="connectInstitution?.transaction_total_days"
                            density="compact"
                            hide-details
                        />
                    </v-card-text>

                    <v-card-actions>
                        <v-spacer />

                        <v-btn
                            text="Cancel"
                            @click="connectDialogOpen = false"
                        />
                        <v-btn
                            color="primary"
                            text="Connect"
                            type="submit"
                            :disabled="!connectMaxHistoricalDays"
                        />
                    </v-card-actions>
                </v-form>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import type { FetchError } from 'ofetch'
import type { DataTableHeader } from 'vuetify'
import { RequisitionStatusMap, type Institution, type Requisition, type TransactionsResponse, type TokenResponse, type RequisitionExtended, type Account, type AccountDetail, type AccountInstitution, type Balance, type EndUserAgreement } from '~/types/gocardless'
import { Database, type TransactionItem } from '~/services/db'

const emit = defineEmits<{
    'data-loaded': [items: TransactionItem[], newIds: string[]],
    'accounts-loaded': [accounts: AccountInstitution[]],
}>()

const ACCOUNTS_STORAGE_KEY = 'gocardlessAccounts'
const INVERTED_ACCOUNTS_STORAGE_KEY = 'gocardlessInvertedAccounts'

let db: Database | null = null
const gocardlessApiToken = ref(window.localStorage.gocardlessApiToken || '')
const gocardlessModalOpen = ref(false)
const gocardlessModalTab = ref(null)
const infoDialogOpen = ref(false)
const errorDialogOpen = ref(false)
const errorDialog = ref<{ summary: string, detail: string, isInvalidToken: boolean }>({ summary: '', detail: '', isInvalidToken: false })
const tokenFormOpen = ref(false)
const tokenForm = ref({ secretId: '', secretKey: '' })
const tokenFormLoading = ref(false)
const tokenFormError = ref('')
// Action to resume once the user has provided valid credentials via the token form.
let afterTokenAction: (() => void) | null = null
const integrationsLoading = ref(false)
const loadingAgreementId = ref<string | null>(null)
const loadingAccountAction = ref<{ accountId: string, action: 'info' | 'balances' } | null>(null)
const infoDialogSections = ref<{ title: string, data: Record<string, any> }[]>([])
const infoDialogTitle = ref('')
const institutions = ref<Institution[]>([])
const requisitions = ref<RequisitionExtended[]>([])
const loadingDataPromise = ref<Promise<TransactionsResponse> | null>(null)
const connectDialogOpen = ref(false)
const connectInstitution = ref<Institution | null>(null)
const connectMaxHistoricalDays = ref(90)
// Accounts (e.g. credit cards) whose transaction amounts are sign-inverted on import.
const invertedAccountIds = ref(new Set<string>(JSON.parse(window.localStorage.getItem(INVERTED_ACCOUNTS_STORAGE_KEY) || '[]')))

const accountsHeaders: DataTableHeader[] = [
    { title: 'ID', key: 'id', align: 'start' },
    { title: 'Name', key: 'name' },
    { title: 'Created', key: 'created' },
    { title: 'Status', key: 'status', align: 'end' },
    { title: 'Invert sign', key: 'invertSign', align: 'center', sortable: false },
    { title: 'Actions', key: 'actions', align: 'end', sortable: false },
]

onMounted(async() => {
    // const query = new URLSearchParams(location.search)
    // const ref = query.get('ref')
    // if (ref) {
    //     await fetchBankRef(ref)
    // }

    // Surface any previously-loaded account → institution mapping so the parent can
    // show bank names/logos without having to re-open the integrations dialog.
    const stored = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
    if (stored) {
        emit('accounts-loaded', JSON.parse(stored))
    }

    db = await Database.open()
})

function emitAccounts() {
    const accounts: AccountInstitution[] = requisitions.value.flatMap(requisition =>
        requisition.accountsInfo.map(account => ({
            id: account.id,
            institutionName: requisition.institution?.name ?? requisition.institution_id,
            institutionLogo: requisition.institution?.logo,
        })),
    )
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
    emit('accounts-loaded', accounts)
}

// async function fetchBankRef(ref: string) {
//     const response = await gocardlessRequest('/requisitions-get', { id: ref })
//     console.info(response)
// }

// Closing the error dialog without proceeding to the token form abandons the pending action.
watch(errorDialogOpen, (open) => {
    if (!open && !tokenFormOpen.value) {
        afterTokenAction = null
    }
})

function setAccountInverted(accountId: string, inverted: boolean) {
    const ids = new Set(invertedAccountIds.value)
    if (inverted) {
        ids.add(accountId)
    } else {
        ids.delete(accountId)
    }
    invertedAccountIds.value = ids
    window.localStorage.setItem(INVERTED_ACCOUNTS_STORAGE_KEY, JSON.stringify([...ids]))
}

function openTokenForm() {
    tokenForm.value = { secretId: '', secretKey: '' }
    tokenFormError.value = ''
    errorDialogOpen.value = false
    tokenFormOpen.value = true
}

async function submitTokenForm() {
    if (!tokenForm.value.secretId || !tokenForm.value.secretKey) {
        return
    }

    tokenFormLoading.value = true
    tokenFormError.value = ''
    try {
        const token = await $fetch<TokenResponse>('/api/gocardless/token', {
            method: 'POST',
            body: { secretId: tokenForm.value.secretId, secretKey: tokenForm.value.secretKey },
        })
        gocardlessApiToken.value = token.access
        window.localStorage.setItem('gocardlessApiToken', token.access)
        window.localStorage.setItem('gocardlessRefreshToken', token.refresh)
        tokenFormOpen.value = false
        const action = afterTokenAction
        afterTokenAction = null
        action?.()
    } catch (error) {
        const fetchError = error as FetchError
        const payload = fetchError?.data?.data ?? fetchError?.data ?? {}
        const { summary, detail } = parseGocardlessError(payload)
        tokenFormError.value = detail || summary || fetchError?.data?.statusMessage ||
            'Failed to get a token. Please check your credentials and try again.'
    } finally {
        tokenFormLoading.value = false
    }
}

function cancelTokenForm() {
    afterTokenAction = null
    tokenFormOpen.value = false
}

// gocardless errors come in two shapes: a top-level `{ summary, detail }`, or one
// keyed by the offending field, e.g. `{ reference: { summary, detail }, status_code }`.
// Returns the combined summary/detail across whichever shape is present.
function parseGocardlessError(payload: any): { summary: string, detail: string } {
    if (payload?.summary || payload?.detail) {
        return { summary: payload.summary ?? '', detail: payload.detail ?? '' }
    }

    const nested = Object.values(payload ?? {}).filter(
        (value): value is { summary?: string, detail?: string } =>
            !!value && typeof value === 'object' && ('summary' in value || 'detail' in value),
    )

    return {
        summary: nested.map(entry => entry.summary).filter(Boolean).join(' '),
        detail: nested.map(entry => entry.detail).filter(Boolean).join(' '),
    }
}

function showRequestError(error: unknown) {
    const fetchError = error as FetchError
    // Our server forwards gocardless's error body under `data.data`,
    // and its `summary` is mirrored to the envelope's `statusMessage`.
    const payload = fetchError?.data?.data ?? fetchError?.data ?? {}
    const statusMessage = fetchError?.data?.statusMessage
    const { summary, detail } = parseGocardlessError(payload)
    errorDialog.value = {
        summary: summary || statusMessage || 'Request failed',
        detail: detail || fetchError?.message || 'An unexpected error occurred. Please try again.',
        // Only an expired/invalid token can be resolved by getting a new one.
        isInvalidToken: fetchError?.statusCode === 401 && statusMessage === 'Invalid token',
    }
    errorDialogOpen.value = true
}

async function refreshAccessToken() {
    const refresh = window.localStorage.gocardlessRefreshToken
    if (!refresh) {
        clearTokens()
        throw new Error('No gocardless refresh token available. Get a new API token first.')
    }

    try {
        const token = await $fetch<TokenResponse>('/api/gocardless/token-refresh', { method: 'POST', body: { refresh } })
        gocardlessApiToken.value = token.access
        window.localStorage.setItem('gocardlessApiToken', token.access)
    } catch (error) {
        // Refresh token is invalid/expired — clear stored tokens so the user can re-authenticate.
        clearTokens()
        throw error
    }
}

function clearTokens() {
    gocardlessApiToken.value = ''
    window.localStorage.removeItem('gocardlessApiToken')
    window.localStorage.removeItem('gocardlessRefreshToken')
}

async function openConnectToBankDialog() {
    if (integrationsLoading.value) {
        return
    }

    integrationsLoading.value = true
    try {
        await apiGetInstitutions()
        await apiGetRequisitions()
    } catch {
        // Errors are surfaced via the error dialog in gocardlessRequest;
        // don't open the integrations dialog on failure. If the user goes on
        // to provide new credentials, retry opening it afterwards.
        afterTokenAction = openConnectToBankDialog
        return
    } finally {
        integrationsLoading.value = false
    }
    gocardlessModalOpen.value = true
}

function connectToBank(item: Institution) {
    connectInstitution.value = item
    // Default to the maximum history the bank supports.
    connectMaxHistoricalDays.value = Number(item.transaction_total_days) || 90
    connectDialogOpen.value = true
}

async function submitConnect() {
    const institution = connectInstitution.value
    if (!institution) {
        return
    }

    // Create an agreement with the requested history, then a requisition that uses it.
    const agreement = await gocardlessRequest<EndUserAgreement>('/agreements-create', {
        institutionId: institution.id,
        maxHistoricalDays: connectMaxHistoricalDays.value,
        accessScope: ['balances', 'details', 'transactions'],
    })
    const response = await gocardlessRequest<Requisition>('/requisitions', {
        institutionId: institution.id,
        agreement: agreement.id,
    })
    location.assign(response.link)
}

async function renewRequisition(item: Requisition) {
    // The existing agreement is expired and cannot be reused, so create a fresh one
    // for the same institution, replicating the original's access terms.
    const oldAgreement = await gocardlessRequest<EndUserAgreement>('/agreement', { agreementId: item.agreement })
    const newAgreement = await gocardlessRequest<EndUserAgreement>('/agreements-create', {
        institutionId: item.institution_id,
        maxHistoricalDays: oldAgreement.max_historical_days,
        accessValidForDays: oldAgreement.access_valid_for_days,
        accessScope: oldAgreement.access_scope,
    })
    const response = await gocardlessRequest<Requisition>('/requisitions', {
        institutionId: item.institution_id,
        agreement: newAgreement.id,
    })
    location.assign(response.link)
}

async function apiGetRequisitions() {
    const result = await gocardlessRequest<Requisition[]>('/requisitions-list')
    const extendedResult: RequisitionExtended[] = []
    for (const item of result) {
        const accountsInfo = await Promise.all(item.accounts.map(accountId => gocardlessRequest<Account>('/account', { accountId })))
        extendedResult.push({
            ...item,
            accountsInfo,
            institution: getInstitutionById(item.institution_id),
        })
    }
    requisitions.value = extendedResult
    emitAccounts()
}

async function apiGetInstitutions() {
    institutions.value = await gocardlessRequest<Institution[]>('/institutions')
}

function getInstitutionById(id: string): Institution | undefined {
    return institutions.value.find(item => item.id === id)
}

async function deleteRequisition(id: string) {
    await gocardlessRequest('/requisitions-delete/', { id })
    await apiGetRequisitions()
}

async function loadTransactions(accountId: string) {
    gocardlessModalOpen.value = false
    let response: TransactionsResponse | null = null
    try {
        loadingDataPromise.value = gocardlessRequest<TransactionsResponse>('/transactions', { accountId })
        response = await loadingDataPromise.value
    } catch {
        return
    } finally {
        loadingDataPromise.value = null
    }
    const { transactions } = response
    const sign = invertedAccountIds.value.has(accountId) ? -1 : 1
    const data: TransactionItem[] = transactions.booked.map(t => ({
        accountId,
        id: t.internalTransactionId,
        amount: sign * Number.parseFloat(t.transactionAmount.amount),
        currency: t.transactionAmount.currency,
        date: new Date(t.bookingDate),
        text: [t.creditorName, t.entryReference, t.additionalInformation].filter(item => item).join(', '),
    }))

    // Save in DB
    const newIds = await db?.addItems(data) ?? []

    emit('data-loaded', data, newIds)
}

async function showAgreemenentInfo(agreementId: string) {
    if (loadingAgreementId.value) {
        return
    }

    loadingAgreementId.value = agreementId
    let agreement: Record<string, any>
    try {
        agreement = await gocardlessRequest<Record<string, any>>('/agreement', { agreementId })
    } finally {
        loadingAgreementId.value = null
    }
    infoDialogTitle.value = 'Agreement'
    infoDialogSections.value = [{ title: 'Agreement', data: agreement }]
    infoDialogOpen.value = true
}

function isAccountActionLoading(accountId: string, action: 'info' | 'balances') {
    return loadingAccountAction.value?.accountId === accountId && loadingAccountAction.value.action === action
}

// Runs an account action while tracking it as loading. Ignores the call if another action is in flight.
async function withAccountActionLoading<T>(accountId: string, action: 'info' | 'balances', fn: () => Promise<T>): Promise<T | undefined> {
    if (loadingAccountAction.value) {
        return
    }

    loadingAccountAction.value = { accountId, action }
    try {
        return await fn()
    } finally {
        loadingAccountAction.value = null
    }
}

async function showAccountInfo(accountId: string) {
    const result = await withAccountActionLoading(accountId, 'info', () => Promise.all([
        gocardlessRequest<Account>('/account', { accountId }),
        gocardlessRequest<AccountDetail>('/account-details', { accountId }),
    ]))
    if (!result) {
        return
    }
    const [account, details] = result
    infoDialogTitle.value = 'Account'
    infoDialogSections.value = [
        { title: 'Account', data: account },
        { title: 'Details', data: details.account },
    ]
    infoDialogOpen.value = true
}

async function showAccountBalances(accountId: string) {
    const result = await withAccountActionLoading(accountId, 'balances', () =>
        gocardlessRequest<{ balances: Balance[] }>('/account-balances', { accountId }))
    if (!result) {
        return
    }
    const { balances } = result
    infoDialogTitle.value = 'Balances'
    infoDialogSections.value = balances.map((balance, index) => ({
        title: balance.balanceType || `Balance ${index + 1}`,
        data: {
            amount: `${balance.balanceAmount.amount} ${balance.balanceAmount.currency}`,
            ...(balance.referenceDate ? { referenceDate: balance.referenceDate } : {}),
            ...(balance.lastChangeDateTime ? { lastChangeDateTime: balance.lastChangeDateTime } : {}),
        },
    }))
    infoDialogOpen.value = true
}

async function gocardlessRequest<T>(path: string, body: any = {}, isRetry = false): Promise<T> {
    try {
        return await $fetch(`/api/gocardless${path}`, { method: 'POST', body: { accessToken: window.localStorage.gocardlessApiToken, ...body } })
    } catch (error) {
        if ((error as FetchError).statusCode === 401 && !isRetry) {
            try {
                await refreshAccessToken()
                return await gocardlessRequest<T>(path, body, true)
            } catch {
                // Auto-refresh failed — fall through to surface the original error.
            }
        }
        // Surface the gocardless error (summary/detail) in the error dialog.
        showRequestError(error)
        throw error
    }
}
</script>
