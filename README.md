# account-history

[![Netlify Status](https://api.netlify.com/api/v1/badges/5891a314-0b99-422d-b32c-8bb13272267e/deploy-status)](https://app.netlify.com/projects/account-history-no/deploys)

Connect to Norwegian banks and list and plot bank account transactions.

Live: https://account-history-no.netlify.app

Utilizes gocardless API to communicate with the banks - https://developer.gocardless.com/bank-account-data/endpoints/

## Privacy

Everything runs in your browser and your data never leaves it, apart from the requests needed to talk to gocardless. There are no accounts, no database on the server, and no analytics.

- **Transactions and tags** are stored in your browser's IndexedDB.
- **Gocardless API tokens, linked accounts and tag rules** are stored in your browser's localStorage.
- **Your gocardless secret ID and key** are only used once, to request an access token, and are never stored.

The only server-side code is a thin, stateless proxy (`server/api/gocardless/`) that forwards requests to the [gocardless Bank Account Data API](https://developer.gocardless.com/bank-account-data/endpoints/). That API can't be called directly from a browser, so requests go through this proxy instead. It passes your token and request along and returns the response. It doesn't store any of it. On Netlify it runs as a serverless function.

Clearing the site data in your browser removes everything. To move your tag rules to another browser, use **Export** and **Import** in the Tag rules dialog.

### Self-hosting

If you'd rather not send requests through someone else's proxy, run the app yourself — locally with `pnpm dev`, or deploy your own copy to Netlify (configured in `netlify.toml`).

## Build Setup

``` bash
# install dependencies
$ pnpm install

# serve with hot reload at localhost:3000
$ pnpm dev

# build for production and launch server
$ pnpm build
$ pnpm start

# generate static project
$ pnpm generate
```

For detailed explanation on how things work, checkout [Nuxt.js docs](https://nuxtjs.org).
