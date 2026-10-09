import { forwardGocardlessError } from "~~/server/utils/forwardGocardlessError"

export default defineEventHandler(async(event) => {
    const body = await readBody(event)

    try {
        return await $fetch('https://bankaccountdata.gocardless.com/api/v2/token/refresh/', {
            method: 'POST',
            body: {
                refresh: body.refresh,
            },
        })
    } catch (error) {
        forwardGocardlessError(error)
    }
})
