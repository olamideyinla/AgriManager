import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useCurrency } from '../../../shared/hooks/useCurrency'
import { calculateDepreciation } from '../services/machinery-calculator'
import type { Machine } from '../../../shared/types'

const FUEL_LABEL: Record<string, string> = {
  petrol: 'Petrol', diesel: 'Diesel', electric: 'Electric', solar: 'Solar', manual: 'Manual', none: 'None',
}

export function OverviewTab({ machine }: { machine: Machine }) {
  const navigate = useNavigate()
  const { fmt } = useCurrency()
  const dep = calculateDepreciation(machine)

  const insuranceDaysLeft = machine.insuranceExpiryDate
    ? differenceInCalendarDays(parseISO(machine.insuranceExpiryDate), new Date())
    : null

  return (
    <div className="p-4 space-y-4">
      {/* Machine details */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-700">Machine Details</p>
          <button onClick={() => navigate(`/machinery/${machine.id}/edit`)} className="text-xs text-primary-600 font-medium">
            Edit
          </button>
        </div>
        {[
          ['Make', machine.make],
          ['Model', machine.model],
          ['Serial Number', machine.serialNumber],
          ['Year', machine.yearOfManufacture],
          ['Fuel Type', machine.fuelType ? FUEL_LABEL[machine.fuelType] : null],
          ['Fuel Capacity', machine.fuelCapacityLiters ? `${machine.fuelCapacityLiters} L` : null],
          ['Avg Consumption', machine.averageFuelConsumption],
        ].filter(([, v]) => v != null && v !== '').map(([label, value]) => (
          <div key={label as string} className="flex justify-between text-sm">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-800">{value}</span>
          </div>
        ))}
      </div>

      {/* Purchase info */}
      {(machine.purchaseDate || machine.purchasePrice != null) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-1">Purchase Info</p>
          {machine.purchaseDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Purchase Date</span>
              <span className="font-medium text-gray-800">{machine.purchaseDate}</span>
            </div>
          )}
          {machine.purchasePrice != null && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Purchase Price</span>
              <span className="font-medium text-gray-800">{fmt(machine.purchasePrice)}</span>
            </div>
          )}
        </div>
      )}

      {/* Depreciation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Depreciation</p>
        <div className="flex items-stretch divide-x divide-gray-100">
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-primary-700">{fmt(dep.currentBookValue)}</p>
            <p className="text-xs text-gray-500">Book Value</p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-lg font-bold text-gray-800">{fmt(dep.annualDepreciation)}</p>
            <p className="text-xs text-gray-500">Annual Dep.</p>
          </div>
        </div>
        {dep.method === 'straight_line' && (
          <>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, dep.percentDepreciated)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-center">
              {dep.percentDepreciated.toFixed(0)}% of useful life consumed
            </p>
          </>
        )}
      </div>

      {/* Assignment */}
      {(machine.assignedLocationId || machine.assignedEnterpriseIds.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-1">Assignment</p>
          <p className="text-xs text-gray-500">
            {machine.assignedEnterpriseIds.length > 0
              ? `Used by ${machine.assignedEnterpriseIds.length} enterprise${machine.assignedEnterpriseIds.length !== 1 ? 's' : ''}`
              : 'Not assigned to a specific enterprise'}
          </p>
        </div>
      )}

      {/* Insurance */}
      {(machine.insuranceProvider || machine.insuranceExpiryDate) && (
        <div className={`rounded-2xl border p-4 space-y-2 ${
          insuranceDaysLeft != null && insuranceDaysLeft <= 30
            ? 'bg-amber-50 border-amber-200'
            : 'bg-white border-gray-100 shadow-sm'
        }`}>
          <p className="text-sm font-semibold text-gray-700">Insurance</p>
          {machine.insuranceProvider && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Provider</span>
              <span className="font-medium text-gray-800">{machine.insuranceProvider}</span>
            </div>
          )}
          {machine.insurancePolicyNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Policy Number</span>
              <span className="font-medium text-gray-800">{machine.insurancePolicyNumber}</span>
            </div>
          )}
          {machine.insuranceExpiryDate && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expires</span>
              <span className={`font-medium ${insuranceDaysLeft != null && insuranceDaysLeft <= 30 ? 'text-amber-700' : 'text-gray-800'}`}>
                {machine.insuranceExpiryDate}
              </span>
            </div>
          )}
          {insuranceDaysLeft != null && insuranceDaysLeft <= 30 && (
            <p className="text-xs font-medium text-amber-700">
              ⚠ Expires in {insuranceDaysLeft} day{insuranceDaysLeft !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {machine.notes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-1">Notes</p>
          <p className="text-sm text-gray-600">{machine.notes}</p>
        </div>
      )}
    </div>
  )
}
