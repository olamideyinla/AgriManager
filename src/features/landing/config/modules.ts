import type { LucideIcon } from 'lucide-react'
import { Beef, Sprout, Tractor, Package, BarChart3, Smartphone } from 'lucide-react'

export type FeatureModule = {
  slug: string
  icon: LucideIcon
  emoji: string
  title: string
  tagline: string
  description: string
  keyFeatures: string[]
  outcome: string
}

/** The six product modules — single source of truth for the homepage overview and the Features page. */
export const FEATURE_MODULES: FeatureModule[] = [
  {
    slug: 'livestock',
    icon: Beef,
    emoji: '🐄',
    title: 'Livestock Management',
    tagline: 'Every animal. Every flock. Fully visible.',
    description:
      'From day-old chicks to breeding herds, track the complete life of your livestock — health, feed, growth, and value — without a single paper record.',
    keyFeatures: [
      'Individual animal and batch/flock records',
      'Health logs, treatments, and vaccination reminders',
      'Feed and water consumption tracking',
      'Weight and growth monitoring against targets',
      'Breeding and reproductive event records',
      'Mortality tracking with cause logging',
      'Sales and revenue per animal or batch',
    ],
    outcome:
      'You know exactly what each animal costs, what it is worth, and what needs attention today — before small problems become dead stock.',
  },
  {
    slug: 'crops',
    icon: Sprout,
    emoji: '🌾',
    title: 'Crop & Field Operations',
    tagline: 'Plan the season. Run the fields. Measure the harvest.',
    description:
      'Every field, every activity, every input — logged and connected, so you finally know which fields make money and which ones eat it.',
    keyFeatures: [
      'Field and plot records with crop assignments',
      'Season planning and activity scheduling',
      'Planting, spraying, and fertilizing logs',
      'Input usage tracked per field',
      'Harvest and yield recording',
      'Cost and yield comparison per field, per season',
    ],
    outcome:
      'No more end-of-season surprises. You see cost per field and yield as it happens — and plan next season with proof, not hope.',
  },
  {
    slug: 'machinery',
    icon: Tractor,
    emoji: '🚜',
    title: 'Machinery & Equipment',
    tagline: 'Keep machines working. Know what they cost.',
    description:
      'Breakdowns during harvest are expensive. So is a machine that quietly costs more than it earns. Track both.',
    keyFeatures: [
      'Full equipment register with history',
      'Service and maintenance schedules with alerts',
      'Fuel and usage logs',
      'Repair and downtime tracking',
      'Running cost per machine',
      'Operator assignment',
    ],
    outcome:
      'Services happen on time, breakdowns drop, and you know exactly when a machine should be repaired, replaced — or sold.',
  },
  {
    slug: 'inventory',
    icon: Package,
    emoji: '📦',
    title: 'Inventory & Inputs',
    tagline: 'Never run out. Never over-order. Never lose track.',
    description:
      'Feed, seed, fertilizer, medicine, spare parts — your stores are money on shelves. Manage them like it.',
    keyFeatures: [
      'Real-time stock levels across all stores',
      'Low-stock alerts and reorder points',
      'Usage tied to animals, fields, and machines',
      'Purchase orders and supplier history',
      'Expiry tracking for feed and medicine',
      'Stock valuation at a glance',
    ],
    outcome:
      'No emergency feed runs. No expired medicine. No mystery shrinkage. Every input is accounted for and connected to what it was used on.',
  },
  {
    slug: 'reports',
    icon: BarChart3,
    emoji: '📊',
    title: 'Reporting & KPIs',
    tagline: "Your farm's numbers. Without the spreadsheet nights.",
    description:
      'Every record your team makes becomes insight automatically. No formulas, no exports, no Sunday evenings with a calculator.',
    keyFeatures: [
      'Live dashboard of farm-wide performance',
      'Cost per animal, per field, per batch',
      'Mortality, growth, and yield trends',
      'Profit and loss by enterprise',
      'Batch comparison and efficiency analysis',
      'Export-ready reports for banks, buyers, and partners',
    ],
    outcome:
      'You walk into every decision — and every bank meeting — with real numbers. The farm stops being a mystery and starts being a business you fully control.',
  },
  {
    slug: 'mobile',
    icon: Smartphone,
    emoji: '📱',
    title: 'Mobile App — Offline-First',
    tagline: 'The whole farm in your pocket. Signal or no signal.',
    description:
      "Farms don't have Wi-Fi in every field. AgriManagerX doesn't need it. Record everything offline; it syncs when you're back in signal.",
    keyFeatures: [
      'Full recording and viewing offline',
      'Automatic sync when connection returns',
      'Fast entry designed for one-hand use',
      'Task lists and alerts for every worker',
      'Works on affordable Android and iOS phones',
      'Installs from the browser — no app store needed',
    ],
    outcome:
      'Records get made where the work happens — not remembered (badly) at the end of the day. Your data is complete because entering it is finally easy.',
  },
]
