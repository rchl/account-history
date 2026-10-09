export type TokenResponse = {
    access: string
    access_expires: number
    refresh: string
    refresh_expires: number
}

export type EndUserAgreement = {
    id: string
    created: string
    institution_id: string
    max_historical_days: number
    access_valid_for_days: number
    access_scope: string[]
    accepted: string | null
}

export type AccountDetail = {
    account: {
        resourceId: string
        iban: string
        currency: string
        ownerName: string
        name: string
        product: string
        cashAccountType: string
        additionalAccountData: {
            secondaryIdentification: string
        }
    }
}

export type AccountInstitution = {
    id: string
    institutionName: string
    institutionLogo?: string
}

export type Balance = {
    balanceAmount: { amount: string, currency: string }
    balanceType: string
    referenceDate?: string
    lastChangeDateTime?: string
}

export type Account = {
  bban: string
  created: string
  iban: string
  id: string
  institution_id: string
  last_accessed: string,
  name: string
  owner_name: string
  status: string
}

export type Institution = {
    bic?: string
    countries: string[];
    id: string;
    logo?: string;
    name: string;
    transaction_total_days: string
    max_access_valid_for_days: string
};

export type Requisition = {
    account_selection: boolean
    accounts: string[]
    agreement: string
    created: string
    id: string
    institution_id: string
    link: string
    redirect: string
    redirect_immediate: boolean
    reference: string
    ssn: string | null
    status: string
    user_language: string
}

export type RequisitionExtended = Requisition & { institution: Institution | undefined } & { accountsInfo: Account[] }

export type Transaction = {
    additionalInformation: string,
    bankTransactionCode: string,
    bookingDate: string,
    checkId: string
    creditorId: string
    creditorName: string
    debtorAccount: { iban: string },
    debtorName: string,
    endToEndId: string
    entryReference: string
    internalTransactionId: string
    mandateId: string
    proprietaryBankTransactionCode: string
    remittanceInformationUnstructured: string
    transactionAmount: { currency: string, amount: string },
    transactionId: string,
    valueDate: string,
}

export type TransactionsResponse = {
    last_updated: string
    transactions: {
        booked: Transaction[]
        pending: Transaction[]
    }
}

export const RequisitionStatusMap: Record<string, string> = {
    CR: 'CREATED',
    GC: 'GIVING_CONSENT',
    UA: 'UNDERGOING_AUTHENTICATION',
    RJ: 'REJECTED',
    SA: 'SELECTING_ACCOUNTS',
    GA: 'GRANTING_ACCESS',
    LN: 'LINKED',
    EX: 'EXPIRED',
}
