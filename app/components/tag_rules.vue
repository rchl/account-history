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

                    <v-btn prepend-icon="mdi-plus" variant="tonal" @click="rules.push({ pattern: '', tag: '' })">
                        Add rule
                    </v-btn>
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
import { compileTagRules, isValidPattern, loadTagRules, saveTagRules, type TagRule } from '~/services/tag_rules'

const props = defineProps<{
    data: Account.DataLine[]
    allTags?: string[]
}>()

const emit = defineEmits<{
    'apply-to-existing': []
}>()

const dialogOpen = ref(false)
const rules = ref<TagRule[]>([])

const canSave = computed(() => rules.value.every(rule => isValidPattern(rule.pattern)))

function openDialog() {
    rules.value = loadTagRules()
    dialogOpen.value = true
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
    const cleaned = rules.value
        .map(rule => ({ pattern: rule.pattern.trim(), tag: (rule.tag ?? '').trim() }))
        .filter(rule => rule.pattern && rule.tag)
    saveTagRules(cleaned)
    dialogOpen.value = false
    if (applyToExisting) {
        emit('apply-to-existing')
    }
}
</script>
