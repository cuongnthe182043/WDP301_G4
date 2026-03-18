import apiClient from "./apiClient";

export const walletService = {
  getWallet:       ()                   => apiClient.get("/wallets").then(r => r.data.data.wallet),
  getTransactions: (page = 1, limit = 20) =>
    apiClient.get("/wallets/transactions", { params: { page, limit } }).then(r => r.data.data),
};
