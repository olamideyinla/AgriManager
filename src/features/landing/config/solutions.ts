export type Solution = {
  slug: string
  emoji: string
  name: string
  headline: string
  subheadline: string
  problemTitle: string
  problem: string[]
  solutionTitle: string
  solution: string
  workflows: { title: string; desc: string }[]
  benefits: string[]
  closingLine: string
  ctaLabel: string
}

/** Content for the three /solutions/:slug pages. */
export const SOLUTIONS: Solution[] = [
  {
    slug: 'livestock',
    emoji: '🐄',
    name: 'Livestock Operations',
    headline: 'Stop losing animals — and money — to things you couldn’t see coming.',
    subheadline:
      'A live picture of every animal and every flock — health, feed, growth, and losses — wherever you are.',
    problemTitle: 'Livestock farming punishes late information.',
    problem: [
      'A disease noticed two days late spreads through the whole flock.',
      'Feed conversion quietly worsens for weeks before anyone checks.',
      'Mortality lives in a notebook nobody adds up until the batch is sold — and the profit is already gone.',
      "You can't stand in every pen every hour. But right now, if you're not there, you don't know.",
    ],
    solutionTitle: 'See every pen, every day, from anywhere.',
    solution:
      'AgriManagerX gives you a live picture of every animal and every flock — health, feed, growth, and losses — updated by your team as the work happens, visible to you wherever you are.',
    workflows: [
      {
        title: 'Daily records in seconds',
        desc: 'Workers log feed, water, mortality, and observations from their phone, right in the pen — even offline.',
      },
      {
        title: 'Health management',
        desc: 'Vaccination and treatment schedules with automatic reminders, so nothing gets missed.',
      },
      {
        title: 'Growth tracking',
        desc: 'Weights against targets, so underperformance shows up in days, not months.',
      },
      {
        title: 'Batch economics',
        desc: 'Feed cost, medicine cost, and losses per batch, calculated live as records come in.',
      },
      {
        title: 'Sales and traceability',
        desc: 'Full history from arrival to sale, ready for any buyer who asks.',
      },
    ],
    benefits: [
      'Catch mortality spikes and disease early — while intervention is still cheap',
      'Know your real feed conversion and cost per bird or per head',
      'End every batch knowing your exact margin',
      'Build records that make your farm credible to buyers, vets, and lenders',
    ],
    closingLine: "Your animals can't tell you when something's wrong. Your data can.",
    ctaLabel: 'Book a Livestock Demo',
  },
  {
    slug: 'crops',
    emoji: '🌾',
    name: 'Crop & Field Management',
    headline: 'Which of your fields actually make money? Time to know for sure.',
    subheadline:
      'Every activity, every input, and every harvest logged per field — so you see performance building through the season.',
    problemTitle: 'Crop decisions get made months before results arrive.',
    problem: [
      'You spend on seed, fertilizer, labor, and fuel all season — and only find out at harvest whether it worked.',
      "If records are scattered, you can't even learn from it. Next season starts with the same guesses.",
      "Activities slip: spraying happens late, fertilizer runs out mid-application, and nobody's sure what was applied to which field.",
    ],
    solutionTitle: 'Turn your fields into managed units.',
    solution:
      'AgriManagerX logs every activity, every input, and every harvest per field — so you see cost and performance building through the season, not just at the end.',
    workflows: [
      {
        title: 'Season planning',
        desc: "Map fields, assign crops, and schedule the season's activities upfront.",
      },
      {
        title: 'Activity logging',
        desc: 'Planting, spraying, and fertilizing recorded in the field, offline if needed.',
      },
      {
        title: 'Input tracking',
        desc: 'Every bag and liter tied to the field it went on, drawn straight from your inventory.',
      },
      {
        title: 'Harvest recording',
        desc: 'Yields captured per field, compared instantly against cost.',
      },
      {
        title: 'Season review',
        desc: "Field-by-field profitability, ready for next season's planning.",
      },
    ],
    benefits: [
      'Know cost per field while you can still act on it',
      'Never miss a critical spray or application window',
      'Compare fields, crops, and seasons with real data',
      'Plan next season on proof, not memory',
    ],
    closingLine: 'Farm the season with your eyes open.',
    ctaLabel: 'Book a Crop Demo',
  },
  {
    slug: 'machinery',
    emoji: '🚜',
    name: 'Farm Machinery & Assets',
    headline: 'Your machines should earn their keep. Find out which ones do.',
    subheadline:
      'Every machine on the books — service schedules, fuel logs, repair history, and true running cost.',
    problemTitle: "Machinery is usually a farm's biggest investment — and its biggest blind spot.",
    problem: [
      'Services get skipped in busy periods, then the breakdown comes at the worst possible time.',
      'Fuel disappears without records.',
      'Nobody can say what a tractor actually costs per year, so repair-or-replace decisions are pure guesswork.',
    ],
    solutionTitle: 'Put every machine on the books.',
    solution:
      'AgriManagerX tracks every machine with its service schedule, fuel and usage logs, repair history, and true running cost. The system reminds your team before maintenance is due, and shows you the numbers when it is time to decide a machine’s future.',
    workflows: [
      {
        title: 'Asset register',
        desc: 'Every machine, implement, and vehicle with documents and history in one place.',
      },
      {
        title: 'Preventive maintenance',
        desc: 'Service schedules by date or usage, with automatic alerts.',
      },
      {
        title: 'Fuel and usage logs',
        desc: "Quick entries from the operator's phone, totals per machine.",
      },
      {
        title: 'Downtime and repair tracking',
        desc: 'What broke, what it cost, how long it was out.',
      },
      {
        title: 'Cost per machine',
        desc: 'Fuel, parts, service, and repairs rolled into one clear number.',
      },
    ],
    benefits: [
      'Fewer breakdowns — and almost never during harvest',
      'Fuel accounted for, shrinkage visible',
      'Repair-or-replace decisions backed by real cost data',
      'Machines last longer and resale values hold',
    ],
    closingLine: "Machines break down. Your visibility shouldn't.",
    ctaLabel: 'Book a Machinery Demo',
  },
]

export function getSolution(slug: string): Solution | undefined {
  return SOLUTIONS.find((s) => s.slug === slug)
}
