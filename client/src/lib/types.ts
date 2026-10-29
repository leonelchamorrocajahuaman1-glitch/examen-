export type BottleShape = 'CLASSIC' | 'SQUARE' | 'TALL' | 'ROUND' | 'WINE' | 'CHAMPAGNE' | 'CAN';
export type Role = 'CUSTOMER' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'BANK_TRANSFER' | 'TEST';
export type PaymentStatus = 'PENDING' | 'PAID' | 'TEST_APPROVED' | 'FAILED' | 'REFUNDED';
export type DeliveryMethod = 'STANDARD' | 'EXPRESS' | 'PICKUP';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone: string | null;
  documentId: string | null;
  birthDate: string | null;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  accentColor: string;
  isAlcoholic: boolean;
  sortOrder: number;
  productCount?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  description?: string | null;
  isPremium: boolean;
  productCount?: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: Pick<Brand, 'id' | 'name' | 'slug' | 'country' | 'isPremium'>;
  category: Pick<Category, 'id' | 'name' | 'slug' | 'accentColor' | 'isAlcoholic'>;
  shortDescription: string;
  description: string;
  presentation: string;
  volumeMl: number;
  abv: number | null;
  origin: string | null;
  tastingNotes: string[];
  priceCents: number;
  salePriceCents: number | null;
  finalPriceCents: number;
  stock: number;
  inStock: boolean;
  isActive: boolean;
  isFeatured: boolean;
  soldCount: number;
  accentColor: string;
  bottleShape: BottleShape;
  images: ProductImage[];
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DeliveryOption {
  id: DeliveryMethod;
  name: string;
  description: string;
  eta: string;
  priceCents: number;
  requiresAddress: boolean;
  freeOverCents: number | null;
}

export interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  instructions?: string;
  isTest: boolean;
}

export interface StoreConfig {
  name: string;
  legalAge: number;
  currency: string;
  contact: { email: string; phone: string; address: string; hours: string };
  freeShippingThresholdCents: number | null;
  maxQtyPerItem: number;
  deliveryOptions: DeliveryOption[];
  paymentOptions: PaymentOption[];
  paymentsTestMode: boolean;
}

export interface QuoteLine {
  productId: string;
  quantity: number;
  available: boolean;
  issue: string | null;
  maxQuantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  product: Product | null;
}

export interface Quote {
  lines: QuoteLine[];
  hasIssues: boolean;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  coupon: { code: string | null; valid: boolean; message: string | null };
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string | null;
  district: string;
  city: string;
  region: string;
  reference: string | null;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  brandName: string;
  volumeMl: number;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  product?: {
    slug: string;
    accentColor: string;
    bottleShape: BottleShape;
    images: ProductImage[];
  } | null;
}

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  number: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string | null;
  shipRecipient: string | null;
  shipPhone: string | null;
  shipLine1: string | null;
  shipLine2: string | null;
  shipDistrict: string | null;
  shipCity: string | null;
  shipRegion: string | null;
  shipReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  events?: OrderEvent[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotalCents: number;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}
