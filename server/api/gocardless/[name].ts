import { forwardGocardlessError } from "~~/server/utils/forwardGocardlessError"

class BankAccountDataApi {
    private API_BASE = 'https://bankaccountdata.gocardless.com/api/v2'
    private _accessToken: string

    constructor(accesToken: string) {
        this._accessToken = accesToken
    }

    async get<T = any>(path: string): Promise<T> {
        return await $fetch(path, { baseURL: this.API_BASE, headers: { Authorization: `Bearer ${this._accessToken}` } })
    }

    async post(path: string, body: any): Promise<any> {
        return await $fetch(path, { method: 'POST', body, baseURL: this.API_BASE, headers: { Authorization: `Bearer ${this._accessToken}` } })
    }

    async delete(path: string): Promise<any> {
        return await $fetch(path, { method: 'DELETE', baseURL: this.API_BASE, headers: { Authorization: `Bearer ${this._accessToken}` } })
    }
}

export default defineEventHandler(async(event) => {
    const name = getRouterParam(event, 'name')
    // const query = getQuery(event)
    const body = event.method === 'POST' ? await readBody(event) : {}
    const api = new BankAccountDataApi(body.accessToken)

    try {
        switch (event.method) {
            case 'GET':
                break

            case 'POST':
                switch (name) {
                    case 'account': {
                        return await api.get(`/accounts/${body.accountId}/`)
                    }
                    case 'account-details': {
                        return await api.get(`/accounts/${body.accountId}/details/`)
                    }
                    case 'account-balances': {
                        return await api.get(`/accounts/${body.accountId}/balances/`)
                    }
                    case 'agreement': {
                        return await api.get(`/agreements/enduser/${body.agreementId}/`)
                    }
                    case 'agreements-create': {
                        return await api.post('/agreements/enduser/', {
                            institution_id: body.institutionId,
                            max_historical_days: body.maxHistoricalDays,
                            access_valid_for_days: body.accessValidForDays,
                            access_scope: body.accessScope,
                        })
                    }
                    case 'institutions': {
                        return await api.get('/institutions/?country=no')
                    }
                    case 'requisitions': {
                        return await api.post('/requisitions/', {
                            redirect: 'http://localhost:3000/',
                            institution_id: body.institutionId,
                            ...(body.agreement ? { agreement: body.agreement } : {}),
                        })
                    }
                    case 'requisitions-delete': {
                        // TODO: pagination
                        return (await api.delete(`/requisitions/${body.id}`))
                    }
                    case 'requisitions-list': {
                        // TODO: pagination
                        return (await api.get('/requisitions/')).results
                    }
                    case 'requisitions-get': {
                        return await api.get(`/requisitions/${body.id}`)
                    }
                    case 'transactions': {
                        return await api.get(`/accounts/${body.accountId}/transactions`)
                    }
                }
                break
        }
    } catch (error) {
        forwardGocardlessError(error)
    }
})
