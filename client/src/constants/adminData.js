export const ADMIN_STATS = [
  {
    id: 'new-orders',
    label: '신규주문',
    valueKey: 'newOrders',
    path: '/admin/orders?status=paid',
    icon: 'bell',
    iconColor: '#ef5a31',
    iconBg: 'rgba(239, 90, 49, 0.12)',
  },
  {
    id: 'orders',
    label: '총주문',
    valueKey: 'totalOrders',
    path: '/admin/orders',
    icon: 'cart',
    iconColor: '#3b82f6',
    iconBg: 'rgba(59, 130, 246, 0.12)',
  },
  {
    id: 'products',
    label: '총상품',
    valueKey: 'totalProducts',
    path: '/admin/products',
    icon: 'package',
    iconColor: '#22c55e',
    iconBg: 'rgba(34, 197, 94, 0.12)',
  },
  {
    id: 'sales',
    label: '총매출',
    valueKey: 'totalSales',
    suffix: '원',
    icon: 'trending',
    iconColor: '#f97316',
    iconBg: 'rgba(249, 115, 22, 0.12)',
  },
]

export const QUICK_ACTIONS = [
  {
    id: 'new-product',
    label: '새 상품 등록',
    icon: 'plus',
    variant: 'primary',
    path: '/admin/products/new',
  },
  {
    id: 'products',
    label: '상품 관리하기',
    icon: 'package',
    variant: 'default',
    path: '/admin/products',
  },
  {
    id: 'resources',
    label: '자료실 관리',
    icon: 'eye',
    variant: 'default',
    path: '/admin/resources',
  },
  { id: 'orders', label: '주문 관리', icon: 'eye', variant: 'default', path: '/admin/orders' },
]
