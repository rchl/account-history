import type { FetchError } from 'ofetch'

/**
 * Re-throws an error from a gocardless `$fetch` call as an H3 error, preserving
 * the upstream status code and forwarding gocardless's `{ summary, detail }`
 * body so the client can surface it. The body is available on the client as
 * `error.data.data`.
 */
export function forwardGocardlessError(error: unknown): never {
    const fetchError = error as FetchError

    throw createError({
        statusCode: fetchError.statusCode || 500,
        statusMessage: fetchError.data?.summary || fetchError.statusMessage,
        data: fetchError.data,
    })
}
