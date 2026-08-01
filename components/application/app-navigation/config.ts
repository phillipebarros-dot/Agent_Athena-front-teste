import { ChatCircle, ChartBar, GearSix, ShieldCheck, Question } from '@phosphor-icons/react';

export type NavItemType = {
  label: string;
  href: string;
  icon: any;
  badge?: number | string;
};

export const navItems = [
  { label: 'Chat', href: '/chat', icon: ChatCircle },
  { label: 'Dashboard', href: '/admin', icon: ChartBar },
  { label: 'Auditoria', href: '/admin?tab=visao', icon: ShieldCheck },
  { label: 'Ajuda', href: '/faq', icon: Question },
];

export const footerItems = [
  { label: 'Configurações', href: '/admin?tab=config', icon: GearSix },
];
