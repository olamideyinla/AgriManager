import { db } from '../../../core/database/db'
import { newId, nowIso } from '../../../shared/types/base'
import { TIERS } from '../../../core/config/tiers'
import type { TierSlug } from '../../../core/config/tiers'
import type { ParseResult } from './csv-parser'
import type { InfrastructureType } from '../../../shared/types'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean
  created: {
    locations: number
    infrastructure: number
    enterprises: number
    inventory: number
    contacts: number
    animals: number
  }
  errors: string[]
  warnings: string[]
}

export type ImportProgressCallback = (step: string, done: number, total: number) => void

// ── Helpers ────────────────────────────────────────────────────────────────────

const ACRES_TO_HECTARES = 0.404686

function acresToHa(val: number, unit: string | null): number {
  if (!unit) return val
  const u = unit.toLowerCase()
  if (u === 'acres') return val * ACRES_TO_HECTARES
  return val
}

function sqmFromArea(val: number, unit: string | null): number {
  if (!unit) return val
  const u = unit.toLowerCase()
  if (u === 'hectares') return val * 10000
  if (u === 'acres') return val * 4046.86
  return val // sqm already
}

// ── Main processor ─────────────────────────────────────────────────────────────

export async function processSetupImport(
  parsedFiles: Record<string, ParseResult>,
  orgId: string,
  defaultFarmLocationId: string,
  tier: TierSlug,
  onProgress?: ImportProgressCallback,
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    created: { locations: 0, infrastructure: 0, enterprises: 0, inventory: 0, contacts: 0, animals: 0 },
    errors: [],
    warnings: [],
  }

  const limits = TIERS[tier].limits
  const ts = nowIso()

  // Maps for linking parent → child by name
  const locationNameToId = new Map<string, string>()
  const infraNameToId    = new Map<string, string>()
  const entNameToId      = new Map<string, string>()

  // Pre-load existing entities into maps
  const [existingLocs, existingInfra, existingEnts, existingInvItems, existingContacts] = await Promise.all([
    db.farmLocations.where('organizationId').equals(orgId).toArray(),
    db.infrastructures.toArray(),
    db.enterpriseInstances.filter(e => e.status === 'active').toArray(),
    db.inventoryItems.where('organizationId').equals(orgId).toArray(),
    db.contacts.where('organizationId').equals(orgId).toArray(),
  ])

  for (const loc of existingLocs) locationNameToId.set(loc.name.toLowerCase(), loc.id)
  for (const inf of existingInfra) infraNameToId.set(inf.name.toLowerCase(), inf.id)
  for (const ent of existingEnts) entNameToId.set(ent.name.toLowerCase(), ent.id)

  const existingInvByKey = new Map(existingInvItems.map(i => [`${i.name.toLowerCase()}|${i.category}`, i]))
  const existingContactByKey = new Map(existingContacts.map(c => [`${c.name.toLowerCase()}|${c.phone?.toLowerCase() ?? ''}`, c]))

  // ── Step 1: Farm Locations ─────────────────────────────────────────────────

  onProgress?.('Farm locations', 0, 6)
  const locFile = parsedFiles['farm_locations']
  if (locFile) {
    let allowed = locFile.validRows
    if (limits.maxLocations !== -1) {
      const existing = existingLocs.length
      const canAdd = Math.max(0, limits.maxLocations - existing)
      if (allowed.length > canAdd) {
        result.warnings.push(`Only ${canAdd} of ${allowed.length} locations imported (plan limit: ${limits.maxLocations})`)
        allowed = allowed.slice(0, canAdd)
      }
    }

    for (const row of allowed) {
      const name = row['name'] as string
      if (!name) continue

      // Duplicate check
      if (locationNameToId.has(name.toLowerCase())) {
        result.warnings.push(`Location "${name}" already exists — skipped`)
        continue
      }

      const areaVal = row['totalAreaHectares'] as number | null
      const areaUnit = row['areaUnit'] as string | null
      const areaHa = areaVal != null ? acresToHa(areaVal, areaUnit) : undefined

      const id = newId()
      try {
        await db.farmLocations.add({
          id,
          organizationId: orgId,
          name,
          address: (row['address'] as string) || undefined,
          gpsLatitude: (row['gpsLatitude'] as number) || undefined,
          gpsLongitude: (row['gpsLongitude'] as number) || undefined,
          totalAreaHectares: areaHa,
          status: 'active',
          createdAt: ts,
          updatedAt: ts,
          syncStatus: 'pending',
        })
        locationNameToId.set(name.toLowerCase(), id)
        result.created.locations++
      } catch (e) {
        result.errors.push(`Failed to create location "${name}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ── Step 2: Infrastructure ─────────────────────────────────────────────────

  onProgress?.('Infrastructure', 1, 6)
  const infraFile = parsedFiles['infrastructure']
  if (infraFile) {
    for (const row of infraFile.validRows) {
      const name = row['name'] as string
      const locName = (row['locationName'] as string | null)?.toLowerCase()

      if (!name) continue

      // Duplicate check
      if (infraNameToId.has(name.toLowerCase())) {
        result.warnings.push(`Infrastructure "${name}" already exists — skipped`)
        continue
      }

      // Resolve location
      const farmLocationId =
        (locName && locationNameToId.get(locName)) ??
        defaultFarmLocationId

      if (!farmLocationId) {
        result.errors.push(`Cannot create infrastructure "${name}": no farm location found`)
        continue
      }

      const areaVal  = row['areaSquareMeters'] as number | null
      const areaUnit = row['areaUnit'] as string | null
      const areaSqm  = areaVal != null ? sqmFromArea(areaVal, areaUnit) : undefined

      const rawType = (row['type'] as string) || 'other'
      const status  = (row['status'] as string) || 'active'

      const id = newId()
      try {
        await db.infrastructures.add({
          id,
          farmLocationId,
          name,
          type: rawType as InfrastructureType,
          capacity: (row['capacity'] as number) || undefined,
          areaSquareMeters: areaSqm,
          description: (row['description'] as string) || undefined,
          status: status as 'active' | 'maintenance' | 'empty',
          createdAt: ts,
          updatedAt: ts,
          syncStatus: 'pending',
        })
        infraNameToId.set(name.toLowerCase(), id)
        result.created.infrastructure++
      } catch (e) {
        result.errors.push(`Failed to create infrastructure "${name}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ── Step 3: Enterprises ────────────────────────────────────────────────────

  onProgress?.('Active enterprises', 2, 6)
  const entFile = parsedFiles['enterprises']
  if (entFile) {
    let allowed = entFile.validRows
    if (limits.maxEnterprises !== -1) {
      const existing = existingEnts.length
      const canAdd = Math.max(0, limits.maxEnterprises - existing)
      if (allowed.length > canAdd) {
        result.warnings.push(`Only ${canAdd} of ${allowed.length} enterprises imported (plan limit: ${limits.maxEnterprises})`)
        allowed = allowed.slice(0, canAdd)
      }
    }

    for (const row of allowed) {
      const name = row['name'] as string
      const infraName = (row['infrastructureName'] as string | null)?.toLowerCase()

      if (!name) continue

      // Duplicate check (same name + same infra)
      if (entNameToId.has(name.toLowerCase())) {
        result.warnings.push(`Enterprise "${name}" already exists — skipped`)
        continue
      }

      const infrastructureId = (infraName && infraNameToId.get(infraName)) ?? undefined

      if (!infrastructureId) {
        result.warnings.push(`Enterprise "${name}": infrastructure "${row['infrastructureName']}" not found — created without infrastructure link`)
      }

      const id = newId()
      try {
        await db.enterpriseInstances.add({
          id,
          infrastructureId: infrastructureId ?? '',
          enterpriseType: row['enterpriseType'] as any,
          name,
          startDate: row['startDate'] as string,
          expectedEndDate: (row['expectedEndDate'] as string) || undefined,
          status: 'active',
          initialStockCount: (row['initialStockCount'] as number) ?? 0,
          currentStockCount: (row['currentStockCount'] as number) ?? 0,
          breedOrVariety: (row['breedOrVariety'] as string) || undefined,
          source: (row['source'] as string) || undefined,
          notes: (row['notes'] as string) || undefined,
          createdAt: ts,
          updatedAt: ts,
          syncStatus: 'pending',
        })
        entNameToId.set(name.toLowerCase(), id)
        result.created.enterprises++
      } catch (e) {
        result.errors.push(`Failed to create enterprise "${name}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ── Step 4: Inventory ──────────────────────────────────────────────────────

  onProgress?.('Inventory items', 3, 6)
  const invFile = parsedFiles['inventory']
  if (invFile) {
    let allowed = invFile.validRows
    if (limits.maxInventoryItems !== -1) {
      const existing = existingInvItems.length
      const canAdd = Math.max(0, limits.maxInventoryItems - existing)
      if (allowed.length > canAdd) {
        result.warnings.push(`Only ${canAdd} of ${allowed.length} inventory items imported (plan limit: ${limits.maxInventoryItems})`)
        allowed = allowed.slice(0, canAdd)
      }
    }

    // Auto-create supplier contacts from inventory rows (collect first)
    const supplierNames = new Map<string, string>() // name → id

    for (const row of allowed) {
      const name     = row['name'] as string
      const category = (row['category'] as string) || 'other'

      if (!name) continue

      const key = `${name.toLowerCase()}|${category}`
      if (existingInvByKey.has(key)) {
        result.warnings.push(`Inventory item "${name}" (${category}) already exists — skipped`)
        continue
      }

      // Auto-create supplier contact
      const supplierName = (row['supplierName'] as string)?.trim()
      let supplierId: string | undefined
      if (supplierName) {
        const supKey = `${supplierName.toLowerCase()}|`
        if (existingContactByKey.has(supKey)) {
          supplierId = existingContactByKey.get(supKey)?.id
        } else if (supplierNames.has(supplierName.toLowerCase())) {
          supplierId = supplierNames.get(supplierName.toLowerCase())
        } else {
          // Create a supplier contact
          supplierId = newId()
          try {
            await db.contacts.add({
              id: supplierId,
              organizationId: orgId,
              name: supplierName,
              type: 'supplier',
              createdAt: ts,
              updatedAt: ts,
              syncStatus: 'pending',
            })
            supplierNames.set(supplierName.toLowerCase(), supplierId)
            result.created.contacts++
          } catch {
            supplierId = undefined
          }
        }
      }

      const id = newId()
      try {
        await db.inventoryItems.add({
          id,
          organizationId: orgId,
          name,
          category: category as any,
          unitOfMeasurement: (row['unitOfMeasurement'] as string) || 'units',
          currentStock: (row['currentStock'] as number) ?? 0,
          reorderPoint: (row['reorderPoint'] as number) || undefined,
          createdAt: ts,
          updatedAt: ts,
          syncStatus: 'pending',
        })

        // Create opening stock transaction
        const stockVal = (row['currentStock'] as number) ?? 0
        const unitCost = (row['unitCost'] as number) || undefined
        if (stockVal > 0) {
          await db.inventoryTransactions.add({
            id: newId(),
            inventoryItemId: id,
            type: 'stockIn',
            quantity: stockVal,
            unitCost,
            supplierId,
            reference: 'Opening balance (CSV import)',
            date: ts.slice(0, 10),
            recordedBy: 'import',
            createdAt: ts,
            updatedAt: ts,
            syncStatus: 'pending',
          })
        }

        result.created.inventory++
        existingInvByKey.set(key, { id } as any)
      } catch (e) {
        result.errors.push(`Failed to create inventory item "${name}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ── Step 5: Contacts ───────────────────────────────────────────────────────

  onProgress?.('Contacts', 4, 6)
  const contactFile = parsedFiles['contacts']
  if (contactFile) {
    for (const row of contactFile.validRows) {
      const name  = row['name'] as string
      const phone = (row['phone'] as string)?.trim().toLowerCase() ?? ''

      if (!name) continue

      const key = `${name.toLowerCase()}|${phone}`
      if (existingContactByKey.has(key)) {
        result.warnings.push(`Contact "${name}" already exists — skipped`)
        continue
      }

      const id = newId()
      try {
        await db.contacts.add({
          id,
          organizationId: orgId,
          name,
          type: (row['type'] as any) || 'other',
          phone: (row['phone'] as string) || undefined,
          email: (row['email'] as string) || undefined,
          address: (row['address'] as string) || undefined,
          notes: (row['notes'] as string) || undefined,
          createdAt: ts,
          updatedAt: ts,
          syncStatus: 'pending',
        })
        result.created.contacts++
        existingContactByKey.set(key, { id } as any)
      } catch (e) {
        result.errors.push(`Failed to create contact "${name}": ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // ── Step 6: Animals ─────────────────────────────────────────────────────────
  // Note: animals table not yet in schema — log a warning if file provided
  onProgress?.('Animals', 5, 6)
  const animalsFile = parsedFiles['animals']
  if (animalsFile && animalsFile.validRows.length > 0) {
    if (tier === 'free') {
      result.warnings.push('Individual animal records require a Pro plan — animals were not imported')
    } else {
      result.warnings.push('Individual animal records (coming soon) — animals were not imported in this version')
    }
  }

  onProgress?.('Done', 6, 6)
  result.success = result.errors.length === 0 || result.created.locations + result.created.infrastructure + result.created.enterprises + result.created.inventory + result.created.contacts > 0

  return result
}
