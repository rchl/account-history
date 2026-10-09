const DB_VERSION = 2
const DB_NAME = 'account-db'
const DB_STORE_NAME = 'transactions'
// Tags live in their own store so re-importing (upserting) transactions doesn't wipe them.
const DB_TAGS_STORE_NAME = 'tags'

export type TransactionItem = {
    accountId: string
    id: string
    date: Date
    text: string
    amount: number
    currency: string
}

export type TransactionTags = {
    transactionId: string
    tags: string[]
}

export class Database {
    private _db: IDBDatabase
    // private _closed: boolean

    static async open(): Promise<Database> {
        return await new Promise((resolve) => {
            const openRequest = window.indexedDB.open(DB_NAME, DB_VERSION)

            openRequest.addEventListener('error', () => {
                resolve(Promise.reject(new Error('Error opening the database')))
            })

            openRequest.addEventListener('upgradeneeded', (event) => {
                const db = openRequest.result

                if (event.oldVersion === 0) {
                    const store = db.createObjectStore(DB_STORE_NAME, { keyPath: 'id' })
                    store.createIndex('date', 'date')
                    store.createIndex('text', 'text')
                    store.createIndex('amount', 'amount')
                    store.createIndex('accountId', 'accountId')
                }

                if (event.oldVersion < 2) {
                    db.createObjectStore(DB_TAGS_STORE_NAME, { keyPath: 'transactionId' })
                }
            })

            openRequest.addEventListener('blocked', () => {
                resolve(Promise.reject(new Error('Error opening the database: blocked')))
            })

            openRequest.addEventListener('success', () => {
                const db = new Database(openRequest.result)
                resolve(db)
            })
        })
    }

    constructor(db: IDBDatabase) {
        this._db = db
        // this._closed = false

        // this._db.addEventListener('close', () => { this._closed = true })
        // this._db.addEventListener('error', (event) => { console.error(`Database error: ${event.target}`) })
    }

    public getSchema(): string[] {
        const store = this._db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME)
        return [String(store.keyPath), ...Array.from(store.indexNames)]
    }

    public async getAll(): Promise<TransactionItem[]> {
        const store = this._db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME)

        return await new Promise((resolve) => {
            const getAllRequest = store.getAll()

            getAllRequest.addEventListener('success', () => {
                resolve(getAllRequest.result)
            })

            getAllRequest.addEventListener('error', () => {
                resolve(Promise.reject(new Error('Error getting items')))
            })
        })
    }

    public async getAllTags(): Promise<Map<string, string[]>> {
        const store = this._db.transaction(DB_TAGS_STORE_NAME).objectStore(DB_TAGS_STORE_NAME)

        return await new Promise((resolve) => {
            const getAllRequest = store.getAll()

            getAllRequest.addEventListener('success', () => {
                const entries = getAllRequest.result as TransactionTags[]
                resolve(new Map(entries.map(entry => [entry.transactionId, entry.tags])))
            })

            getAllRequest.addEventListener('error', () => {
                resolve(Promise.reject(new Error('Error getting tags')))
            })
        })
    }

    // Sets the tags of one or more transactions in a single transaction. Empty tags remove the entry.
    public async setTags(entries: TransactionTags[]): Promise<boolean> {
        return await new Promise((resolve) => {
            const transaction = this._db.transaction(DB_TAGS_STORE_NAME, 'readwrite')

            transaction.addEventListener('complete', () => {
                resolve(true)
            })

            transaction.addEventListener('error', function() {
                resolve(Promise.reject(new Error(`Error setting tags: ${this.error?.message}`)))
            })

            const store = transaction.objectStore(DB_TAGS_STORE_NAME)
            for (const entry of entries) {
                if (entry.tags.length) {
                    store.put(entry)
                } else {
                    store.delete(entry.transactionId)
                }
            }
        })
    }

    // Upserts the items and resolves with the ids of those that weren't stored before.
    public async addItems(items: TransactionItem[]): Promise<string[]> {
        return await new Promise((resolve) => {
            const transaction = this._db.transaction(DB_STORE_NAME, 'readwrite')
            const errors: string[] = []
            const newIds: string[] = []

            transaction.addEventListener('complete', () => {
                resolve(newIds)
            })

            transaction.addEventListener('error', function() {
                if (this.error) {
                    errors.push(`Transaction error: ${this.error.message}`)
                }
                resolve(Promise.reject(new Error(`Error adding item: ${errors.join('\n')}`)))
            })

            const store = transaction.objectStore(DB_STORE_NAME)
            for (const item of items) {
                // Requests run in order, so this sees the store before the put below.
                const keyRequest = store.getKey(item.id)
                keyRequest.addEventListener('success', () => {
                    if (keyRequest.result === undefined) {
                        newIds.push(item.id)
                    }
                })
                // Use put (upsert) so re-fetching already-stored transactions overwrites
                // them by id instead of failing the transaction with a constraint error.
                const request = store.put(item)
                request.addEventListener('error', function() {
                    if (this.error) {
                        errors.push(this.error.message)
                    }
                })
            }
        })
    }

    // Deletes the transactions along with their tags.
    public async deleteItems(keys: string[]): Promise<boolean> {
        return await new Promise((resolve) => {
            const transaction = this._db.transaction([DB_STORE_NAME, DB_TAGS_STORE_NAME], 'readwrite')
            const errors: string[] = []

            transaction.addEventListener('complete', () => {
                resolve(true)
            })

            transaction.addEventListener('error', function() {
                if (this.error) {
                    errors.push(this.error.message)
                }
                resolve(Promise.reject(new Error(`Error deleting items: ${errors.join('\n')}`)))
            })

            const store = transaction.objectStore(DB_STORE_NAME)
            const tagsStore = transaction.objectStore(DB_TAGS_STORE_NAME)
            for (const key of keys) {
                const request = store.delete(key)
                request.addEventListener('error', function() {
                    if (this.error) {
                        errors.push(this.error.message)
                    }
                })
                tagsStore.delete(key)
            }
        })
    }
}
