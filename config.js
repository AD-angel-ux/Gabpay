// Configuration de l'application GabPayApp
const config = {
  // URL de base de l'API backend
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.77:3000',
  
  // Endpoints de l'API
  endpoints: {
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      profile: '/api/auth/profile'
    },
    transactions: {
      create: '/api/transactions',
      history: '/api/transactions/history'
    },
    bills: {
      list: '/api/bills',
      unpaid: '/api/bills/unpaid',
      pay: '/api/bills/pay'
    },
    savings: {
      balance: '/api/savings',
      deposit: '/api/savings/deposit',
      withdraw: '/api/savings/withdraw'
    },
    notifications: {
      list: '/api/notifications'
    }
  }
};

// Fonction utilitaire pour construire les URLs complètes
export const getApiUrl = (endpoint) => {
  return `${config.API_BASE_URL}${endpoint}`;
};

export default config;

