import { describe, it, expect } from 'vitest'
import { TIERS, tierHasFeature, isAtLimit } from '../tiers'

describe('TIERS config', () => {
  it('has three tiers: free, pro, x', () => {
    expect(Object.keys(TIERS)).toEqual(['free', 'pro', 'x'])
  })

  it('free tier has monthlyUsd of 0', () => {
    expect(TIERS.free.monthlyUsd).toBe(0)
  })

  it('pro tier has monthlyUsd of 10 and annualUsd of 100', () => {
    expect(TIERS.pro.monthlyUsd).toBe(10)
    expect(TIERS.pro.annualUsd).toBe(100)
  })

  it('x tier has null monthlyUsd', () => {
    expect(TIERS.x.monthlyUsd).toBeNull()
  })

  it('free has maxEnterprises of 3', () => {
    expect(TIERS.free.limits.maxEnterprises).toBe(3)
  })

  it('x has unlimited limits (-1)', () => {
    expect(TIERS.x.limits.maxEnterprises).toBe(-1)
    expect(TIERS.x.limits.maxLocations).toBe(-1)
    expect(TIERS.x.limits.maxUsers).toBe(-1)
  })
})

describe('tierHasFeature', () => {
  it('free can do daily_entry', () => {
    expect(tierHasFeature('free', 'daily_entry')).toBe(true)
  })

  it('free cannot do decision_tools', () => {
    expect(tierHasFeature('free', 'decision_tools')).toBe(false)
  })

  it('pro can do decision_tools', () => {
    expect(tierHasFeature('pro', 'decision_tools')).toBe(true)
  })

  it('pro can do free features (daily_entry)', () => {
    expect(tierHasFeature('pro', 'daily_entry')).toBe(true)
  })

  it('pro cannot do x-only features (api_access)', () => {
    expect(tierHasFeature('pro', 'api_access')).toBe(false)
  })

  it('x can do all features', () => {
    expect(tierHasFeature('x', 'api_access')).toBe(true)
    expect(tierHasFeature('x', 'decision_tools')).toBe(true)
    expect(tierHasFeature('x', 'daily_entry')).toBe(true)
  })
})

describe('isAtLimit', () => {
  it('free at limit when enterprises >= 3', () => {
    expect(isAtLimit('free', 'maxEnterprises', 3)).toBe(true)
    expect(isAtLimit('free', 'maxEnterprises', 4)).toBe(true)
  })

  it('free not at limit when enterprises < 3', () => {
    expect(isAtLimit('free', 'maxEnterprises', 2)).toBe(false)
    expect(isAtLimit('free', 'maxEnterprises', 0)).toBe(false)
  })

  it('x is never at limit', () => {
    expect(isAtLimit('x', 'maxEnterprises', 999999)).toBe(false)
    expect(isAtLimit('x', 'maxUsers', 999999)).toBe(false)
  })

  it('pro at limit when enterprises >= 10', () => {
    expect(isAtLimit('pro', 'maxEnterprises', 10)).toBe(true)
    expect(isAtLimit('pro', 'maxEnterprises', 9)).toBe(false)
  })

  it('pro has unlimited inventory items', () => {
    expect(isAtLimit('pro', 'maxInventoryItems', 9999)).toBe(false)
  })
})
