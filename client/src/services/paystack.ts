// Add Paystack inline script types
declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        ref: string;
        metadata?: Record<string, any>;
        callback: (response: any) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess?: (response: any) => void;
  onClose?: () => void;
}

export interface PaystackResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export const paystack = {
  initializePayment: async (email: string, orderId: string): Promise<PaystackResponse> => {
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookie
        body: JSON.stringify({ email, orderId }),
      });

      if (!response.ok) {
        throw new Error('Payment initialization failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  },

  verifyPayment: async (reference: string): Promise<any> => {
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookie
        body: JSON.stringify({ reference }),
      });

      if (!response.ok) {
        throw new Error('Payment verification failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  },

  openPaystackModal: (config: PaystackConfig) => {
    // Load Paystack inline script if not already loaded
    if (!window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => {
        initializePaystackPayment(config);
      };
      document.head.appendChild(script);
    } else {
      initializePaystackPayment(config);
    }

    function initializePaystackPayment(config: PaystackConfig) {
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: config.amount * 100, // Convert to kobo
        currency: config.currency,
        ref: config.reference,
        metadata: config.metadata,
        callback: function(response: any) {
          config.onSuccess?.(response);
        },
        onClose: function() {
          config.onClose?.();
        }
      });
      
      handler.openIframe();
    }
  },

  // Mobile Money payment simulation
  initiateMobileMoneyPayment: async (
    amount: number,
    phoneNumber: string,
    network: 'mtn' | 'vodafone' | 'airteltigo',
    orderId: string
  ): Promise<{ success: boolean; reference?: string; message: string }> => {
    try {
      // In production, integrate with actual mobile money APIs
      console.log(`Initiating ${network.toUpperCase()} Mobile Money payment:`, {
        amount,
        phoneNumber,
        orderId,
      });

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success
      const reference = `momo_${Date.now()}_${orderId}`;
      return {
        success: true,
        reference,
        message: 'Mobile Money payment initiated successfully. Please check your phone and enter your PIN to complete the transaction.',
      };
    } catch (error) {
      console.error('Mobile Money payment error:', error);
      return {
        success: false,
        message: 'Mobile Money payment failed. Please try again.',
      };
    }
  },
};
