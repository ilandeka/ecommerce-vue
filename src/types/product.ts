export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  available: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
