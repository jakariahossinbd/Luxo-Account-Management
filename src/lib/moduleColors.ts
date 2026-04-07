/**
 * Module color scheme for admin panel
 * Used for sidebar, cards, and visual identification
 */

export const moduleColors = {
  salesPayment: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    hover: 'hover:bg-emerald-100',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  purchase: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    icon: 'text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
    hover: 'hover:bg-violet-100',
    button: 'bg-violet-600 hover:bg-violet-700 text-white',
  },
  productService: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    hover: 'hover:bg-blue-100',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  accounting: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    hover: 'hover:bg-amber-100',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  reports: {
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    text: 'text-pink-700',
    icon: 'text-pink-600',
    badge: 'bg-pink-100 text-pink-700',
    hover: 'hover:bg-pink-100',
    button: 'bg-pink-600 hover:bg-pink-700 text-white',
  },
  sellerManage: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    text: 'text-cyan-700',
    icon: 'text-cyan-600',
    badge: 'bg-cyan-100 text-cyan-700',
    hover: 'hover:bg-cyan-100',
    button: 'bg-cyan-600 hover:bg-cyan-700 text-white',
  },
} as const;

export type ModuleKey = keyof typeof moduleColors;

export const getModuleColors = (module: ModuleKey) => moduleColors[module];
