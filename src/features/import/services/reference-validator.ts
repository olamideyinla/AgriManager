import { db } from '../../../core/database/db'
import { TIERS } from '../../../core/config/tiers'
import type { TierSlug } from '../../../core/config/tiers'
import type { ParseResult } from './csv-parser'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ReferenceError {
  file: string
  rowNumber: number
  message: string
}

export interface ReferenceValidationResult {
  errors: ReferenceError[]
  warnings: ReferenceError[]
  summary: { valid: boolean; errorCount: number; warningCount: number }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getStringSet(result: ParseResult | undefined, field: string): Set<string> {
  if (!result) return new Set()
  return new Set(
    result.validRows
      .map(r => (r[field] as string | null)?.trim().toLowerCase())
      .filter(Boolean) as string[]
  )
}

// ── Main validator ─────────────────────────────────────────────────────────────

export async function validateReferences(
  parsedFiles: Record<string, ParseResult>,
  orgId: string,
  tier: TierSlug,
): Promise<ReferenceValidationResult> {
  const errors: ReferenceError[] = []
  const warnings: ReferenceError[] = []

  // ── Collect names from uploaded files ───────────────────────────────────────
  const uploadedLocationNames = getStringSet(parsedFiles['farm_locations'], 'name')
  const uploadedInfraNames    = getStringSet(parsedFiles['infrastructure'], 'name')
  const uploadedEntNames      = getStringSet(parsedFiles['enterprises'], 'name')

  // ── Collect existing names from IndexedDB ────────────────────────────────────
  const [existingLocations, existingInfra, existingEnts] = await Promise.all([
    db.farmLocations.where('organizationId').equals(orgId).toArray(),
    db.infrastructures.toArray(),
    db.enterpriseInstances.filter(e => e.status === 'active').toArray(),
  ])

  const existingInfraIds = new Set(existingInfra.map(i => i.farmLocationId))
  const locationIds      = new Set(existingLocations.map(l => l.id))
  const validInfra       = existingInfra.filter(i => locationIds.has(i.farmLocationId))

  const existingLocationNames = new Set(existingLocations.map(l => l.name.toLowerCase()))
  const existingInfraNames    = new Set(validInfra.map(i => i.name.toLowerCase()))
  const existingEntNames      = new Set(existingEnts.map(e => e.name.toLowerCase()))

  // All valid location names (uploaded + existing in DB)
  const allLocationNames = new Set([...uploadedLocationNames, ...existingLocationNames])
  const allInfraNames    = new Set([...uploadedInfraNames, ...existingInfraNames])
  const allEntNames      = new Set([...uploadedEntNames, ...existingEntNames])

  // ── Validate Infrastructure → Location refs ──────────────────────────────────
  const infraResult = parsedFiles['infrastructure']
  if (infraResult) {
    for (const err of infraResult.errorRows) {
      // Already has errors — skip reference check for this row
    }
    for (let i = 0; i < infraResult.validRows.length; i++) {
      const row = infraResult.validRows[i]
      const locName = (row['locationName'] as string | null)?.toLowerCase()
      if (locName && !allLocationNames.has(locName)) {
        // If no locations file uploaded and no existing locations, it will use the default
        if (uploadedLocationNames.size === 0 && existingLocationNames.size === 0) {
          warnings.push({
            file: 'Infrastructure',
            rowNumber: i + 2,
            message: `Location "${row['locationName']}" not found — infrastructure will be assigned to your default farm location`,
          })
        } else {
          errors.push({
            file: 'Infrastructure',
            rowNumber: i + 2,
            message: `Location "${row['locationName']}" not found. Check spelling or add it to your Farm Locations file.`,
          })
        }
      }
    }
  }

  // ── Validate Enterprises → Infrastructure refs ────────────────────────────────
  const entResult = parsedFiles['enterprises']
  if (entResult) {
    for (let i = 0; i < entResult.validRows.length; i++) {
      const row = entResult.validRows[i]
      const infraName = (row['infrastructureName'] as string | null)?.toLowerCase()
      if (infraName && !allInfraNames.has(infraName)) {
        warnings.push({
          file: 'Enterprises',
          rowNumber: i + 2,
          message: `Infrastructure "${row['infrastructureName']}" not found. Enterprise will be created but unlinked. You can assign it in Settings.`,
        })
      }
    }
  }

  // ── Validate Animals → Enterprise refs ───────────────────────────────────────
  const animalsResult = parsedFiles['animals']
  if (animalsResult) {
    const animalTagNumbers = getStringSet(animalsResult, 'tagNumber')
    for (let i = 0; i < animalsResult.validRows.length; i++) {
      const row = animalsResult.validRows[i]
      const entName = (row['enterpriseName'] as string | null)?.toLowerCase()
      if (entName && !allEntNames.has(entName)) {
        errors.push({
          file: 'Animals',
          rowNumber: i + 2,
          message: `Enterprise "${row['enterpriseName']}" not found. Animals require a valid enterprise to be imported.`,
        })
      }

      // Sire/dam tag warnings
      const sireTag = (row['sireTag'] as string | null)?.toLowerCase()
      const damTag  = (row['damTag'] as string | null)?.toLowerCase()
      if (sireTag && !animalTagNumbers.has(sireTag)) {
        warnings.push({
          file: 'Animals',
          rowNumber: i + 2,
          message: `Sire tag "${row['sireTag']}" not found in this file — parent link will not be set`,
        })
      }
      if (damTag && !animalTagNumbers.has(damTag)) {
        warnings.push({
          file: 'Animals',
          rowNumber: i + 2,
          message: `Dam tag "${row['damTag']}" not found in this file — parent link will not be set`,
        })
      }
    }
  }

  // ── Tier limit checks ─────────────────────────────────────────────────────────
  const limits = TIERS[tier].limits

  // Count existing records
  const [existingEntCount, existingLocCount, existingInvCount] = await Promise.all([
    db.enterpriseInstances.filter(e => e.status === 'active').count(),
    db.farmLocations.where('organizationId').equals(orgId).count(),
    db.inventoryItems.where('organizationId').equals(orgId).count(),
  ])

  // Farm locations limit
  const newLocCount = parsedFiles['farm_locations']?.validRows.length ?? 0
  if (limits.maxLocations !== -1 && existingLocCount + newLocCount > limits.maxLocations) {
    const overage = existingLocCount + newLocCount - limits.maxLocations
    errors.push({
      file: 'Farm Locations',
      rowNumber: 0,
      message: `Your ${tier === 'free' ? 'Free' : 'Pro'} plan allows ${limits.maxLocations} location${limits.maxLocations !== 1 ? 's' : ''}. You already have ${existingLocCount}. Only ${limits.maxLocations - existingLocCount} more can be imported. Upgrade to import more.`,
    })
    // Trim to the allowed count (handled in processor)
    void overage
  }

  // Enterprise limit
  const newEntCount = parsedFiles['enterprises']?.validRows.length ?? 0
  if (limits.maxEnterprises !== -1 && existingEntCount + newEntCount > limits.maxEnterprises) {
    errors.push({
      file: 'Enterprises',
      rowNumber: 0,
      message: `Your ${tier === 'free' ? 'Free' : 'Pro'} plan allows ${limits.maxEnterprises} active enterprises. You already have ${existingEntCount}. Only ${limits.maxEnterprises - existingEntCount} more can be imported. Upgrade to import more.`,
    })
  }

  // Inventory limit
  const newInvCount = parsedFiles['inventory']?.validRows.length ?? 0
  if (limits.maxInventoryItems !== -1 && existingInvCount + newInvCount > limits.maxInventoryItems) {
    errors.push({
      file: 'Inventory Items',
      rowNumber: 0,
      message: `Your ${tier === 'free' ? 'Free' : 'Pro'} plan allows ${limits.maxInventoryItems} inventory items. You already have ${existingInvCount}. Only ${limits.maxInventoryItems - existingInvCount} more can be imported. Upgrade to import more.`,
    })
  }

  // Animal registry feature
  if (animalsResult && animalsResult.validRows.length > 0) {
    if (tier === 'free') {
      errors.push({
        file: 'Animals',
        rowNumber: 0,
        message: 'Individual animal records require a Pro or X plan. Upgrade to import animals.',
      })
    } else if (limits.maxAnimals !== -1 && animalsResult.validRows.length > limits.maxAnimals) {
      warnings.push({
        file: 'Animals',
        rowNumber: 0,
        message: `Your plan allows ${limits.maxAnimals} animals. Only the first ${limits.maxAnimals} rows will be imported.`,
      })
    }
  }

  void existingInfraIds // used above for filtering

  return {
    errors,
    warnings,
    summary: {
      valid: errors.length === 0,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  }
}
