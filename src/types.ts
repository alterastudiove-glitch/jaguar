export type UserRole = 'client' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  phone?: string;
  location?: string;
  cedula?: string;
  createdAt: string;
}

export type PrintingTechnique = 'DTF' | 'Vinil' | 'Sublimación' | 'Transfer';

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  wholesalePrice: number;
  wholesaleThreshold: number;
  imageUrl: string; // Featured image
  images: string[]; // Gallery (up to 4)
  colorMap?: Record<string, string>; // Maps hex colors to specific image URLs
  category: string;
  type?: 'standard' | 'service' | 'package' | 'print';
  colors: string[];
  sizes: string[];
  techniques: (PrintingTechnique | string)[];
  specs?: {
    material?: string;
    weight?: string;
    fit?: string;
    gender?: string;
    care?: string;
    dimensions?: string;
    packageDetails?: { label: string; price: number }[];
    [key: string]: any;
  };
}

export interface Category {
  id: string;
  name: string;
  order: number;
  isExternalLink?: boolean;
}

export type OrderStatus = 'recibido' | 'validando' | 'produccion' | 'listo' | 'entregado';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  customization: {
    color: string;
    size: string;
    technique: PrintingTechnique | string;
    locations: string[]; // ['chest', 'back', 'sleeve']
    images: string[];
    material?: string;
    packageItems?: string[];
    description?: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  securityCode: string;
  paymentReference?: string;
  depositPaid: boolean;
  createdAt: string;
  updatedAt: string;
}
