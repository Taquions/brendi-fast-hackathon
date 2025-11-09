export interface HealthResponse {
  status: string
  message: string
  timestamp: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}

export interface OrderProduct {
  productId: string
  name: string
  description?: string
  price: number
  quantity: number
  notes?: string
  isPizza?: boolean
  picture?: string
  orderCustoms?: Array<{
    type: string
    description?: string
    chosenQuantity?: number
    id: string
    title: string
    [key: string]: any
  }>
}
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
export interface ChatRequest {
  messages: ChatMessage[];
}

export interface Order {
  id: string
  uuid: string
  code: string
  totalPrice: number
  products: OrderProduct[]
  createdAt?: string
  status?: string
  [key: string]: any
}

export interface ProductSales {
  productId: string
  productName: string
  totalQuantity: number
  totalRevenue: number
  orderCount: number
}

export interface RevenueAnalysis {
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  topProducts: ProductSales[]
}
