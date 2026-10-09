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

export function serializeTagRules(rules: TagRule[]): string {
    return JSON.stringify(rules.map(({ pattern, tag }) => ({ pattern, tag })), null, 2)
}

// Parses an exported rules file. Throws if it isn't a JSON array of `{ pattern, tag }` strings.
export function parseTagRules(json: string): TagRule[] {
    let parsed: unknown
    try {
        parsed = JSON.parse(json)
    } catch {
        throw new Error('File is not valid JSON.')
    }
    if (!Array.isArray(parsed)) {
        throw new TypeError('Expected a JSON array of tag rules.')
    }
    return parsed.map((item, index) => {
        if (typeof item?.pattern !== 'string' || typeof item?.tag !== 'string') {
            throw new TypeError(`Rule ${index + 1} must have string "pattern" and "tag" fields.`)
        }
        return { pattern: item.pattern, tag: item.tag }
    })
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
