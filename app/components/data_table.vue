<template>
    <div>
        <div v-if="selected.length" class="d-flex align-center ga-2 mb-2">
            <v-btn
                prepend-icon="mdi-tag-multiple"
                color="primary"
                variant="tonal"
                @click="openBulkTagsDialog"
            >
                Tag {{ selected.length }} selected
            </v-btn>
            <v-btn
                prepend-icon="mdi-delete"
                color="error"
                variant="tonal"
                @click="confirmDelete(selected)"
            >
                Delete {{ selected.length }} selected
            </v-btn>
        </div>

        <v-data-table-virtual
            v-model="selected"
            :headers="headers"
            :items="props.data"
            item-value="id"
            height="800"
            density="compact"
            show-select
            return-object
        >
            <template #item.institution="{ item }">
                <v-avatar
                    v-if="institutionFor(item)?.logo"
                    v-tooltip="institutionFor(item)?.name"
                    :image="institutionFor(item)?.logo"
                    size="24"
                />
            </template>

            <template #item.tags="{ item }">
                <div class="d-flex flex-wrap align-center ga-1 py-1">
                    <v-chip
                        v-for="tag in item.tags"
                        :key="tag"
                        size="x-small"
                        :text="tag"
                    />
                    <v-btn
                        v-tooltip="'Edit tags'"
                        color="grey-lighten-1"
                        icon="mdi-tag-plus"
                        size="x-small"
                        variant="text"
                        @click="openTagsDialog(item)"
                    />
                </div>
            </template>

            <template #item.actions="{ item }">
                <v-btn
                    v-tooltip="'Delete transaction'"
                    color="grey-lighten-1"
                    icon="mdi-delete"
                    size="x-small"
                    variant="text"
                    @click="confirmDelete([item])"
                />
            </template>
        </v-data-table-virtual>
    </div>

    <v-dialog v-model="tagsDialogOpen" max-width="500">
        <v-card title="Edit tags" :subtitle="tagsDialogItem?.text">
            <v-form @submit.prevent="saveTags">
                <v-card-text>
                    <v-combobox
                        v-model="tagsDialogValue"
                        :items="props.allTags"
                        label="Tags"
                        multiple
                        chips
                        closable-chips
                        autofocus
                        hide-details
                    />

                    <template v-if="props.allTags?.length">
                        <div class="text-caption text-medium-emphasis mt-4">
                            Existing tags
                        </div>
                        <v-chip-group v-model="tagsDialogValue" column multiple>
                            <v-chip
                                v-for="tag in props.allTags"
                                :key="tag"
                                :value="tag"
                                :text="tag"
                                size="small"
                                filter
                            />
                        </v-chip-group>
                    </template>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />

                    <v-btn
                        text="Cancel"
                        @click="tagsDialogOpen = false"
                    />
                    <v-btn
                        color="primary"
                        text="Save"
                        type="submit"
                    />
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialogOpen" max-width="500">
        <v-card :title="deleteDialogItems.length === 1 ? 'Delete transaction?' : `Delete ${deleteDialogItems.length} transactions?`">
            <v-card-text>
                <p v-if="deleteDialogItems.length === 1">
                    {{ deleteDialogItems[0]?.date.toLocaleDateString() }} · {{ deleteDialogItems[0]?.text }} ·
                    {{ deleteDialogItems[0] && currencyFormatter.format(deleteDialogItems[0].amount) }}
                </p>
                <p class="mt-2 text-medium-emphasis">
                    The transaction data and tags are removed from this browser. Loading transactions from the bank again will re-import it if the bank still returns it.
                </p>
            </v-card-text>

            <v-card-actions>
                <v-spacer />

                <v-btn
                    text="Cancel"
                    @click="deleteDialogOpen = false"
                />
                <v-btn
                    color="error"
                    text="Delete"
                    @click="submitDelete"
                />
            </v-card-actions>
        </v-card>
    </v-dialog>

    <v-dialog v-model="bulkTagsDialogOpen" max-width="500">
        <v-card :title="`Tag ${selected.length} transactions`">
            <v-form @submit.prevent="saveBulkTags">
                <v-card-text>
                    <v-combobox
                        v-model="bulkAddTags"
                        :items="props.allTags"
                        label="Add tags"
                        multiple
                        chips
                        closable-chips
                        autofocus
                        hide-details
                    />

                    <template v-if="props.allTags?.length">
                        <div class="text-caption text-medium-emphasis mt-4">
                            Existing tags
                        </div>
                        <v-chip-group v-model="bulkAddTags" column multiple>
                            <v-chip
                                v-for="tag in props.allTags"
                                :key="tag"
                                :value="tag"
                                :text="tag"
                                size="small"
                                filter
                            />
                        </v-chip-group>
                    </template>

                    <template v-if="selectedTagCounts.length">
                        <div class="text-caption text-medium-emphasis mt-4">
                            Remove tags (used by the selected transactions)
                        </div>
                        <v-chip-group v-model="bulkRemoveTags" column multiple selected-class="text-error">
                            <v-chip
                                v-for="{ tag, count } in selectedTagCounts"
                                :key="tag"
                                :value="tag"
                                :text="`${tag} (${count})`"
                                size="small"
                                filter
                                filter-icon="mdi-close"
                            />
                        </v-chip-group>
                    </template>
                </v-card-text>

                <v-card-actions>
                    <v-spacer />

                    <v-btn
                        text="Cancel"
                        @click="bulkTagsDialogOpen = false"
                    />
                    <v-btn
                        color="primary"
                        text="Apply"
                        type="submit"
                        :disabled="!bulkAddTags.length && !bulkRemoveTags.length"
                    />
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>
</template>

<script setup lang="ts">
import type { DataTableHeader } from 'vuetify'
import type { TransactionTags } from '~/services/db'

const props = defineProps<{
    data: Account.DataLine[]
    accountInstitutions?: Record<string, { name: string, logo?: string }>
    allTags?: string[]
}>()

const emit = defineEmits<{
    'tags-changed': [changes: TransactionTags[]]
    'delete': [ids: string[]]
}>()

const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'NOK',
})

const headers = ref<DataTableHeader<Account.DataLine>[]>([
    {
        title: 'Bank',
        key: 'institution',
        sortable: false,
        width: 56,
    },
    {
        title: 'Date',
        key: 'date',
        value: (item: Account.DataLine) => item.date.toLocaleDateString(),
        sortRaw: (a: Account.DataLine, b: Account.DataLine) => a.date.valueOf() - b.date.valueOf(),
    },
    { title: 'Description', key: 'text' },
    {
        title: 'Amount',
        key: 'price',
        value: (item: Account.DataLine) => currencyFormatter.format(item.amount),
        sortRaw: (a: Account.DataLine, b: Account.DataLine) => a.amount - b.amount,
    },
    { title: 'Tags', key: 'tags', sortable: false },
    { title: '', key: 'actions', sortable: false, align: 'end', width: 48 },
])
// Selection is owned by the parent so it can clear it.
const selected = defineModel<Account.DataLine[]>('selected', { default: () => [] })
const tagsDialogOpen = ref(false)
const tagsDialogItem = ref<Account.DataLine | null>(null)
const tagsDialogValue = ref<string[]>([])
const deleteDialogOpen = ref(false)
const deleteDialogItems = ref<Account.DataLine[]>([])
const bulkTagsDialogOpen = ref(false)
const bulkAddTags = ref<string[]>([])
const bulkRemoveTags = ref<string[]>([])

// Tags present on the selected transactions, with how many of them use each.
const selectedTagCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const item of selected.value) {
        for (const tag of item.tags) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1)
        }
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([tag, count]) => ({ tag, count }))
})

function normalizeTags(tags: string[]): string[] {
    return [...new Set(tags.map(tag => tag.trim()).filter(Boolean))].sort()
}

function openTagsDialog(item: Account.DataLine) {
    tagsDialogItem.value = item
    tagsDialogValue.value = [...item.tags]
    tagsDialogOpen.value = true
}

function saveTags() {
    if (tagsDialogItem.value) {
        emit('tags-changed', [{ transactionId: tagsDialogItem.value.id, tags: normalizeTags(tagsDialogValue.value) }])
    }
    tagsDialogOpen.value = false
}

function confirmDelete(items: Account.DataLine[]) {
    deleteDialogItems.value = [...items]
    deleteDialogOpen.value = true
}

function submitDelete() {
    emit('delete', deleteDialogItems.value.map(item => item.id))
    deleteDialogOpen.value = false
}

function openBulkTagsDialog() {
    bulkAddTags.value = []
    bulkRemoveTags.value = []
    bulkTagsDialogOpen.value = true
}

function saveBulkTags() {
    const add = normalizeTags(bulkAddTags.value)
    const remove = new Set(bulkRemoveTags.value)
    const changes: TransactionTags[] = []
    for (const item of selected.value) {
        const tags = normalizeTags([...item.tags, ...add]).filter(tag => !remove.has(tag))
        if (tags.join('\n') !== item.tags.join('\n')) {
            changes.push({ transactionId: item.id, tags })
        }
    }
    if (changes.length) {
        emit('tags-changed', changes)
    }
    bulkTagsDialogOpen.value = false
}

function institutionFor(item: Account.DataLine) {
    return props.accountInstitutions?.[item.accountId]
}
</script>
