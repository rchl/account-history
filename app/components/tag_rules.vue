<template>
    <div>
        <v-btn prepend-icon="mdi-tag-arrow-right" @click="openDialog">
            Tag rules
        </v-btn>

        <v-dialog v-model="dialogOpen" scrollable max-width="800">
            <v-card title="Tag rules">
                <v-card-subtitle class="text-wrap">
                    Newly imported transactions whose description matches a pattern (case-insensitive regexp) get the rule's tag.
                </v-card-subtitle>

                <v-card-text>
                    <div
                        v-for="(rule, index) in rules"
                        :key="index"
                        class="d-flex align-start ga-2 mb-2"
                    >
                        <v-text-field
                            v-model="rule.pattern"
                            label="Pattern (regexp)"
                            density="compact"
                            :rules="[v => isValidPattern(v) || 'Invalid regexp']"
                            :hint="matchCountHint(rule)"
                            persistent-hint
                            class="flex-grow-1"
                        />
                        <v-combobox
                            v-model="rule.tag"
                            :items="props.allTags"
                            label="Tag"
                            density="compact"
                            hide-details
                            style="max-width: 220px"
                        />
                        <v-btn
                            v-tooltip="'Remove rule'"
                            icon="mdi-delete"
                            size="small"
                            variant="text"
                            @click="rules.splice(index, 1)"
                        />
                    </div>

                    <div class="d-flex flex-wrap ga-2">
                        <v-btn prepend-icon="mdi-plus" variant="tonal" @click="rules.push({ pattern: '', tag: '' })">
                            Add rule
                        </v-btn>
                        <v-spacer />
                        <v-btn
                            v-tooltip="'Add rules from an exported JSON file'"
                            prepend-icon="mdi-import"
                            variant="text"
                            @click="importInput?.click()"
                        >
                            Import
                        </v-btn>
                        <v-btn
                            v-tooltip="'Download the rules above as a JSON file'"
                            prepend-icon="mdi-export"
                            variant="text"
                            :disabled="!cleanedRules.length"
                            @click="exportRules"
                        >
                            Export
                        </v-btn>
                        <input
                            ref="importInput"
                            type="file"
                            accept=".json,application/json"
                            hidden
                            @change="importRules"
                        >
                    </div>

                    <v-alert
                        v-if="importMessage"
                        :type="importMessage.type"
                        :text="importMessage.text"
                        density="compact"
                        variant="tonal"
                        closable
                        class="mt-4"
                        @click:close="importMessage = null"
                    />
                </v-card-text>

                <v-card-actions>
                    <v-btn
                        v-tooltip="'Save, then add matching tags to all transactions already stored'"
                        text="Save & apply to existing"
                        :disabled="!canSave"
                        @click="save(true)"
                    />

                    <v-spacer />

                    <v-btn
                        text="Cancel"
                        @click="dialogOpen = false"
                    />
                    <v-btn
                        color="primary"
                        text="Save"
                        :disabled="!canSave"
                        @click="save(false)"
                    />
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
import { compileTagRules, isValidPattern, loadTagRules, parseTagRules, saveTagRules, serializeTagRules, type TagRule } from '~/services/tag_rules'

const props = defineProps<{
    data: Account.DataLine[]
    allTags?: string[]
}>()

const emit = defineEmits<{
    'apply-to-existing': []
}>()

const dialogOpen = ref(false)
const rules = ref<TagRule[]>([])

const importInput = ref<HTMLInputElement | null>(null)
const importMessage = ref<{ type: 'success' | 'error', text: string } | null>(null)

const canSave = computed(() => rules.value.every(rule => isValidPattern(rule.pattern)))

// Rules as they'd be saved: trimmed, with incomplete ones dropped.
const cleanedRules = computed(() => rules.value
    .map(rule => ({ pattern: rule.pattern.trim(), tag: (rule.tag ?? '').trim() }))
    .filter(rule => rule.pattern && rule.tag))

function openDialog() {
    rules.value = loadTagRules()
    importMessage.value = null
    dialogOpen.value = true
}

function exportRules() {
    const blob = new Blob([serializeTagRules(cleanedRules.value)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tag-rules.json'
    link.click()
    URL.revokeObjectURL(url)
}

// Appends rules from the chosen file, skipping ones already in the list. They're
// only persisted once the user saves.
async function importRules(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    // Reset so picking the same file again still fires `change`.
    input.value = ''
    if (!file) {
        return
    }

    let imported: TagRule[]
    try {
        imported = parseTagRules(await file.text())
    } catch (error) {
        importMessage.value = { type: 'error', text: `Couldn't import ${file.name}: ${(error as Error).message}` }
        return
    }

    const existing = new Set(rules.value.map(rule => `${rule.pattern}\n${rule.tag}`))
    const added = imported.filter((rule) => {
        const key = `${rule.pattern}\n${rule.tag}`
        if (existing.has(key)) {
            return false
        }
        existing.add(key)
        return true
    })
    rules.value.push(...added)

    const skipped = imported.length - added.length
    importMessage.value = {
        type: 'success',
        text: `Imported ${added.length} rule(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ''}. Save to keep them.`,
    }
}

function matchCountHint(rule: TagRule): string {
    const [compiled] = compileTagRules([{ pattern: rule.pattern, tag: rule.tag || '-' }])
    if (!compiled) {
        return ''
    }
    const count = props.data.filter(line => compiled.regexp.test(line.text)).length
    return `Matches ${count} loaded transaction(s)`
}

function save(applyToExisting: boolean) {
    saveTagRules(cleanedRules.value)
    dialogOpen.value = false
    if (applyToExisting) {
        emit('apply-to-existing')
    }
}
</script>
