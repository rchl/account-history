export type TagRule = {
    pattern: string
    tag: string
}

export type CompiledTagRule = {
    regexp: RegExp
    tag: string
}

const STORAGE_KEY = 'tagRules'

export function loadTagRules(): TagRule[] {
    try {
        return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

export function saveTagRules(rules: TagRule[]) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export function isValidPattern(pattern: string): boolean {
    try {
        // eslint-disable-next-line no-new
        new RegExp(pattern, 'i')
        return true
    } catch {
        return false
    }
}

// Compiles rules into case-insensitive regexps, skipping incomplete or invalid ones.
export function compileTagRules(rules: TagRule[]): CompiledTagRule[] {
    return rules
        .filter(rule => rule.pattern && rule.tag && isValidPattern(rule.pattern))
        .map(rule => ({ regexp: new RegExp(rule.pattern, 'i'), tag: rule.tag }))
}

export function matchTags(text: string, rules: CompiledTagRule[]): string[] {
    return rules.filter(rule => rule.regexp.test(text)).map(rule => rule.tag)
}
