import apiClient from "./apiClient";

export const walletService = {
  getWallet: () =>
    apiClient.get("/wallets").then(r => r.data.data.wallet),

  getTransactions: (page = 1, limit = 20, type = undefined) =>
    apiClient
      .get("/wallets/transactions", { params: { page, limit, ...(type ? { type } : {}) } })
      .then(r => r.data.data),

  // Initiate a VNPay wallet top-up. Returns { payUrl, txnRef }.
  depositVnpay: (amount) =>
    apiClient.post("/wallets/deposit/vnpay", { amount }).then(r => r.data.data),

  // Submit a withdrawal request. Payload: { amount, bank_account_id? } or { amount, bank_name, account_number, owner_name, note? }
  withdraw: (payload) =>
    apiClient.post("/wallets/withdraw", payload).then(r => r.data.data),

  // Bank accounts
  getBankAccounts: () =>
    apiClient.get("/wallets/bank-accounts").then(r => r.data.data.accounts),

  addBankAccount: (data) =>
    apiClient.post("/wallets/bank-accounts", data).then(r => r.data.data.account),

  deleteBankAccount: (id) =>
    apiClient.delete(`/wallets/bank-accounts/${id}`).then(r => r.data.data),
};
