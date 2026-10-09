import { forwardGocardlessError } from "~~/server/utils/forwardGocardlessError"

export default defineEventHandler(async(event) => {
    const body = await readBody(event)

    try {
        return await $fetch('https://bankaccountdata.gocardless.com/api/v2/token/new/', {
            method: 'POST',
            body: {
                secret_id: body.secretId,
                secret_key: body.secretKey,
            },
        })
    } catch (error) {
        forwardGocardlessError(error)
    }
})
