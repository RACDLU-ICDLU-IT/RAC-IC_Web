import React from 'react';
import {
  Home, User, CalendarDays, Calendar, Presentation, Bell, Settings,
  Users, UserCheck, CheckSquare, FolderOpen, Newspaper, Image as ImageIcon,
  HeartHandshake, Megaphone, Inbox, Palette, LucideIcon, FileText, CreditCard,
  Zap, HandCoins, Trophy, Bot, Share2, Shield, Star, Award, Book, Briefcase,
  Camera, Clipboard, Database, Globe, Layers, Mail, Map, MessageSquare,
  Package, Phone, PieChart, Video, Wallet
} from 'lucide-react';

/**
 * Auto-discovers every .tsx file directly under pages/admin/ and pages/dashboard/.
 * Drop a new file in either folder, its default export becomes selectable in the
 * admin panel's Pages tab immediately — no import, no map edit, no deploy-time wiring.
 *
 * Filename = component_key used in page_registry (e.g. AdminDonationRequests.tsx -> "AdminDonationRequests").
 *
 * Excluded automatically: files under pages/admin/ that take route params (e.g. forms
 * builder/responses screens) still need fixed routes — those stay hardcoded in App.tsx.
 */
const adminModules = import.meta.glob('../pages/admin/*.tsx', { eager: true }) as Record<string, { default: React.ComponentType<any> }>;
const dashboardModules = import.meta.glob('../pages/dashboard/*.tsx', { eager: true }) as Record<string, { default: React.ComponentType<any> }>;

function toComponentMap(modules: Record<string, { default: React.ComponentType<any> }>) {
  const map: Record<string, React.ComponentType<any>> = {};
  for (const path in modules) {
    const match = path.match(/([^/]+)\.tsx$/);
    if (!match) continue;
    const name = match[1];
    if (modules[path]?.default) map[name] = modules[path].default;
  }
  return map;
}

export const COMPONENT_MAP: Record<string, React.ComponentType<any>> = {
  ...toComponentMap(dashboardModules),
  ...toComponentMap(adminModules),
};

/** Icon whitelist — pick from this fixed set in the admin Pages editor. */
export const ICON_MAP: Record<string, LucideIcon> = {
  Home, User, CalendarDays, Calendar, Presentation, Bell, Settings, Users, UserCheck,
  CheckSquare, FolderOpen, Newspaper, ImageIcon, HeartHandshake, Megaphone, Inbox,
  Palette, FileText, CreditCard, Zap, HandCoins, Trophy, Bot, Share2, Shield,
  Star, Award, Book, Briefcase, Camera, Clipboard, Database, Globe, Layers,
  Mail, Map, MessageSquare, Package, Phone, PieChart, Video, Wallet,
};

export const ICON_NAMES = Object.keys(ICON_MAP);
export const COMPONENT_NAMES = Object.keys(COMPONENT_MAP).sort();

export interface PageRegistryRow {
  id: string;
  tenant_id: string;
  mode: 'admin' | 'member';
  path: string;
  page_key: string;
  label: string;
  icon: string;
  section: string | null;
  component_key: string;
  sort_order: number;
  is_builtin: boolean;
}

export type PermAction = 'view' | 'edit' | 'delete';
