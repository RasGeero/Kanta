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
  initializePayment: async (amount: number, email: string, orderId: string): Promise<PaystackResponse> => {
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, email, orderId }),
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
    // In production, use the actual Paystack inline script
    // For now, we'll simulate the payment flow
    const simulatePayment = () => {
      const confirmed = window.confirm(
        `Pay ₵${config.amount} to ${config.email}?\n\nThis is a simulation. In production, this would open the Paystack payment modal.`
      );
      
      if (confirmed) {
        const mockResponse = {
          reference: config.reference,
          status: 'success',
          transaction: config.reference,
        };
        config.onSuccess?.(mockResponse);
      } else {
        config.onClose?.();
      }
    };

    // Simulate modal delay
    setTimeout(simulatePayment, 500);
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
