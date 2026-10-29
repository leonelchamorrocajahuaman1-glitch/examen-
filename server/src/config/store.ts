import type { DeliveryMethod, PaymentMethod } from '@prisma/client';
import { config } from './env.js';

export const LEGAL_AGE = 18;

export const MAX_QTY_PER_ITEM = 24;
export const MAX_CART_LINES = 40;

export interface DeliveryOption {
  id: DeliveryMethod;
  name: string;
  description: string;
  eta: string;
  priceCents: number;
  requiresAddress: boolean;
  freeOverCents: number | null;
}

export const deliveryOptions: DeliveryOption[] = [
  {
    id: 'STANDARD',
    name: 'Delivery estándar',
    description: 'Lima Metropolitana',
    eta: '24 a 48 horas',
    priceCents: config.SHIPPING_STANDARD_CENTS,
    requiresAddress: true,
    freeOverCents: config.FREE_SHIPPING_THRESHOLD_CENTS || null,
  },
  {
    id: 'EXPRESS',
    name: 'Delivery express',
    description: 'Lima Metropolitana, zonas con cobertura',
    eta: '2 a 4 horas',
    priceCents: config.SHIPPING_EXPRESS_CENTS,
    requiresAddress: true,
    freeOverCents: null,
  },
  {
    id: 'PICKUP',
    name: 'Recojo en tienda',
    description: config.STORE_ADDRESS,
    eta: 'Listo en 2 horas',
    priceCents: 0,
    requiresAddress: false,
    freeOverCents: null,
  },
];

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  instructions?: string;
  isTest: boolean;
}

/** Solo se exponen los métodos que están realmente configurados. */
export function getPaymentOptions(): PaymentOption[] {
  const options: PaymentOption[] = [];
  if (config.CASH_ON_DELIVERY_ENABLED) {
    options.push({
      id: 'CASH_ON_DELIVERY',
      name: 'Pago contra entrega',
      description: 'Paga en efectivo o con tarjeta (POS) al recibir tu pedido.',
      isTest: false,
    });
  }
  if (config.BANK_TRANSFER_INFO) {
    options.push({
      id: 'BANK_TRANSFER',
      name: 'Transferencia / Yape / Plin',
      description: 'Confirmamos tu pedido cuando verificamos el pago.',
      instructions: config.BANK_TRANSFER_INFO,
      isTest: false,
    });
  }
  if (config.PAYMENTS_TEST_MODE) {
    options.push({
      id: 'TEST',
      name: 'Pago de prueba',
      description: 'MODO DE PRUEBA: el pedido se aprueba sin realizar ningún cobro real.',
      isTest: true,
    });
  }
  return options;
}

export function getDeliveryOption(id: DeliveryMethod) {
  return deliveryOptions.find((d) => d.id === id);
}

export function storePublicConfig() {
  return {
    name: 'NEON LIQUOR',
    legalAge: LEGAL_AGE,
    currency: 'PEN',
    contact: {
      email: config.STORE_EMAIL,
      phone: config.STORE_PHONE,
      address: config.STORE_ADDRESS,
      hours: config.STORE_HOURS,
    },
    freeShippingThresholdCents: config.FREE_SHIPPING_THRESHOLD_CENTS || null,
    maxQtyPerItem: MAX_QTY_PER_ITEM,
    deliveryOptions,
    paymentOptions: getPaymentOptions(),
    paymentsTestMode: config.PAYMENTS_TEST_MODE,
  };
}
