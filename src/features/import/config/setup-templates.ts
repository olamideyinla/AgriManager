// ── Types ──────────────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'boolean'

export interface ColumnDef {
  header: string
  field: string
  required: boolean
  type: ColumnType
  options?: string[]
  description: string
  example: string
  validation?: {
    min?: number
    max?: number
    maxLength?: number
    pattern?: RegExp
  }
}

export interface SetupTemplate {
  id: string
  name: string
  description: string
  filename: string
  columns: ColumnDef[]
  maxRows: number
  instructions: string[]
  icon: string
  comingSoon?: boolean
}

// ── Farm Locations ─────────────────────────────────────────────────────────────

const farmLocations: SetupTemplate = {
  id: 'farm_locations',
  name: 'Farm Locations',
  description: 'Your farm sites or locations. Most small farms have just one.',
  filename: 'agrimanagerx_farm_locations.csv',
  maxRows: 20,
  icon: '📍',
  instructions: [
    'Each row is one farm location or site.',
    'Most farms need only one row here.',
    'If you have multiple farm sites, add one row per site.',
    'Area can be in hectares or acres — specify in the Area Unit column.',
    'GPS coordinates are optional but help with weather integration.',
  ],
  columns: [
    { header: 'Location Name', field: 'name', required: true, type: 'text', description: 'Name of the farm or site', example: 'Main Farm' },
    { header: 'Address', field: 'address', required: false, type: 'text', description: 'Physical address', example: 'Km 5 Nairobi-Namanga Road, Kajiado' },
    { header: 'Total Area', field: 'totalAreaHectares', required: false, type: 'number', description: 'Total farm area', example: '12.5', validation: { min: 0, max: 100000 } },
    { header: 'Area Unit', field: 'areaUnit', required: false, type: 'select', options: ['hectares', 'acres'], description: 'Unit for area (hectares or acres)', example: 'hectares' },
    { header: 'GPS Latitude', field: 'gpsLatitude', required: false, type: 'number', description: 'GPS latitude (decimal)', example: '-1.2921', validation: { min: -90, max: 90 } },
    { header: 'GPS Longitude', field: 'gpsLongitude', required: false, type: 'number', description: 'GPS longitude (decimal)', example: '36.8219', validation: { min: -180, max: 180 } },
    { header: 'Notes', field: 'notes', required: false, type: 'text', description: 'Any extra notes', example: 'Near the main highway', validation: { maxLength: 500 } },
  ],
}

// ── Infrastructure ─────────────────────────────────────────────────────────────

const infrastructure: SetupTemplate = {
  id: 'infrastructure',
  name: 'Houses, Ponds, Fields & Pens',
  description: 'Your physical infrastructure — poultry houses, fish ponds, crop fields, cattle pens, pig pens.',
  filename: 'agrimanagerx_infrastructure.csv',
  maxRows: 100,
  icon: '🏠',
  instructions: [
    'Each row is one house, pond, field, or pen.',
    'The Location Name must match exactly with a name from your Farm Locations file (or an existing location in the app).',
    'For poultry houses: capacity = max number of birds.',
    'For fish ponds: capacity = max number of fish, area = pond surface area.',
    'For crop fields: area in hectares or acres.',
    'Type must be one of: poultry_house, fish_pond, cattle_pen, pig_pen, field, greenhouse, other.',
  ],
  columns: [
    { header: 'Name', field: 'name', required: true, type: 'text', description: 'Name or number (e.g., House 1, Pond A, Field North)', example: 'House 1' },
    { header: 'Type', field: 'type', required: true, type: 'select', options: ['poultry_house', 'fish_pond', 'cattle_pen', 'pig_pen', 'rabbit_hutch', 'field', 'greenhouse', 'other'], description: 'Type of infrastructure', example: 'poultry_house' },
    { header: 'Location Name', field: 'locationName', required: true, type: 'text', description: 'Which farm location this belongs to (must match a name from Farm Locations)', example: 'Main Farm' },
    { header: 'Capacity', field: 'capacity', required: false, type: 'number', description: 'Maximum capacity (birds, fish, animals, or N/A for fields)', example: '5000', validation: { min: 0, max: 10000000 } },
    { header: 'Area', field: 'areaSquareMeters', required: false, type: 'number', description: 'Area (sq meters for houses/ponds, hectares for fields)', example: '500', validation: { min: 0 } },
    { header: 'Area Unit', field: 'areaUnit', required: false, type: 'select', options: ['sqm', 'hectares', 'acres'], description: 'Unit for area', example: 'sqm' },
    { header: 'Status', field: 'status', required: false, type: 'select', options: ['active', 'maintenance', 'empty'], description: 'Current status', example: 'active' },
    { header: 'Description', field: 'description', required: false, type: 'text', description: 'Any extra details', example: 'Open-sided house with curtains', validation: { maxLength: 500 } },
  ],
}

// ── Active Enterprises ─────────────────────────────────────────────────────────

const enterprises: SetupTemplate = {
  id: 'enterprises',
  name: 'Active Batches, Flocks, Herds & Crops',
  description: 'Your currently active production cycles — the flock in each house, the fish in each pond, the crop in each field.',
  filename: 'agrimanagerx_active_enterprises.csv',
  maxRows: 100,
  icon: '🐔',
  instructions: [
    'Each row is one active production cycle.',
    'Infrastructure Name must match exactly with a name from your Infrastructure file (or existing infrastructure in the app).',
    'Enterprise Type must be one of: layers, broilers, cattle_dairy, cattle_beef, pigs_breeding, pigs_growfinish, fish, crop_annual, crop_perennial.',
    'Dates must be in YYYY-MM-DD format (e.g., 2025-09-15).',
    'Current Stock should be the number alive or active RIGHT NOW.',
    "You can leave Expected End Date blank if you don't know.",
  ],
  columns: [
    { header: 'Name', field: 'name', required: true, type: 'text', description: 'Batch or flock name (e.g., Batch 12, Flock A, Tomato Season 2)', example: 'Flock A' },
    { header: 'Enterprise Type', field: 'enterpriseType', required: true, type: 'select', options: ['layers', 'broilers', 'cattle_dairy', 'cattle_beef', 'pigs_breeding', 'pigs_growfinish', 'fish', 'crop_annual', 'crop_perennial', 'rabbit', 'custom_animal'], description: 'Type of enterprise', example: 'layers' },
    { header: 'Infrastructure Name', field: 'infrastructureName', required: true, type: 'text', description: 'Which house, pond, field, or pen (must match a name from Infrastructure)', example: 'House 1' },
    { header: 'Start Date', field: 'startDate', required: true, type: 'date', description: 'When this batch/flock/crop started (YYYY-MM-DD)', example: '2025-09-15' },
    { header: 'Initial Stock', field: 'initialStockCount', required: true, type: 'number', description: 'Starting number (birds placed, fish stocked, seeds planted, animals)', example: '5000', validation: { min: 0, max: 10000000 } },
    { header: 'Current Stock', field: 'currentStockCount', required: true, type: 'number', description: 'Number alive/active right now', example: '4850', validation: { min: 0, max: 10000000 } },
    { header: 'Breed or Variety', field: 'breedOrVariety', required: false, type: 'text', description: 'Breed, strain, or crop variety', example: 'Hy-Line Brown' },
    { header: 'Source', field: 'source', required: false, type: 'text', description: 'Where stock came from (hatchery, supplier, own breeding)', example: 'Kenchic Hatchery' },
    { header: 'Expected End Date', field: 'expectedEndDate', required: false, type: 'date', description: 'Expected sale, harvest, or depletion date (YYYY-MM-DD)', example: '2027-03-15' },
    { header: 'Notes', field: 'notes', required: false, type: 'text', description: 'Any extra details', example: 'First flock in this house', validation: { maxLength: 500 } },
  ],
}

// ── Inventory ──────────────────────────────────────────────────────────────────

const inventory: SetupTemplate = {
  id: 'inventory',
  name: 'Inventory Items',
  description: 'Your feed, medication, fertilizer, seeds, and other supplies — current stock on hand.',
  filename: 'agrimanagerx_inventory.csv',
  maxRows: 200,
  icon: '📦',
  instructions: [
    'Each row is one inventory item you stock.',
    'Current Stock is what you have on hand right now.',
    'Reorder Point is optional — the app will alert you when stock falls below this level.',
    'Unit Cost is the cost per unit (per bag, per kg, per liter) — used for financial tracking.',
    'Category must be one of: feed, medication, fertilizer, seed, chemical, fuel, packaging, other.',
  ],
  columns: [
    { header: 'Item Name', field: 'name', required: true, type: 'text', description: 'Product name', example: 'Layer Mash — Unga Feeds' },
    { header: 'Category', field: 'category', required: true, type: 'select', options: ['feed', 'medication', 'fertilizer', 'seed', 'chemical', 'fuel', 'packaging', 'other'], description: 'Item category', example: 'feed' },
    { header: 'Unit', field: 'unitOfMeasurement', required: true, type: 'text', description: 'Unit of measurement (bags, kg, liters, bottles, sachets)', example: 'bags' },
    { header: 'Current Stock', field: 'currentStock', required: true, type: 'number', description: 'How much you have right now', example: '45', validation: { min: 0 } },
    { header: 'Reorder Point', field: 'reorderPoint', required: false, type: 'number', description: 'Alert when stock falls below this', example: '10', validation: { min: 0 } },
    { header: 'Unit Cost', field: 'unitCost', required: false, type: 'number', description: 'Cost per unit in your currency', example: '2200', validation: { min: 0 } },
    { header: 'Supplier', field: 'supplierName', required: false, type: 'text', description: 'Main supplier for this item', example: 'Feeds Distributors Ltd' },
    { header: 'Notes', field: 'notes', required: false, type: 'text', description: 'Any extra details', example: '50kg bags', validation: { maxLength: 500 } },
  ],
}

// ── Contacts ───────────────────────────────────────────────────────────────────

const contacts: SetupTemplate = {
  id: 'contacts',
  name: 'Contacts',
  description: 'Your buyers, suppliers, vets, employees, and other contacts.',
  filename: 'agrimanagerx_contacts.csv',
  maxRows: 500,
  icon: '👤',
  instructions: [
    'Each row is one contact — a person or company you do business with.',
    'Type must be one of: buyer, supplier, vet, extension_officer, employee, transporter, other.',
    'Phone should include country code (e.g., +254 for Kenya, +234 for Nigeria).',
  ],
  columns: [
    { header: 'Name', field: 'name', required: true, type: 'text', description: 'Full name or company name', example: 'Mama Mboga Grocers' },
    { header: 'Type', field: 'type', required: true, type: 'select', options: ['buyer', 'supplier', 'vet', 'extension_officer', 'employee', 'transporter', 'other'], description: 'Contact type', example: 'buyer' },
    { header: 'Phone', field: 'phone', required: false, type: 'text', description: 'Phone number (with country code if possible)', example: '+254712345678' },
    { header: 'Email', field: 'email', required: false, type: 'text', description: 'Email address', example: 'info@mamamboga.co.ke' },
    { header: 'Address', field: 'address', required: false, type: 'text', description: 'Physical address', example: 'Wakulima Market, Nairobi' },
    { header: 'Notes', field: 'notes', required: false, type: 'text', description: 'Any extra details', example: 'Collects eggs every Tuesday and Friday', validation: { maxLength: 500 } },
  ],
}

// ── Animals (Coming Soon) ──────────────────────────────────────────────────────

const animals: SetupTemplate = {
  id: 'animals',
  name: 'Individual Animals',
  description: 'For cattle and pig operations — individual animal records with tag numbers and breeding info.',
  filename: 'agrimanagerx_animals.csv',
  maxRows: 1000,
  icon: '🐄',
  comingSoon: true,
  instructions: [
    'Each row is one animal.',
    'Tag Number must be unique — this is how the app identifies each animal.',
    'Enterprise Name must match exactly with an enterprise from your Active Enterprises file (or existing in the app).',
    'Sire Tag and Dam Tag should match other Tag Numbers in this file if the parents are in your herd.',
    'Date of Birth can be approximate if exact date is unknown.',
    'Status defaults to "active" if left blank.',
    'This template is only for individually tracked animals (cattle, pigs, goats, sheep) — not for poultry or fish.',
  ],
  columns: [
    { header: 'Tag Number', field: 'tagNumber', required: true, type: 'text', description: 'Ear tag or ID number', example: 'C-047' },
    { header: 'Name', field: 'name', required: false, type: 'text', description: 'Animal name (if any)', example: 'Bella' },
    { header: 'Species', field: 'species', required: true, type: 'select', options: ['cattle', 'pig', 'goat', 'sheep'], description: 'Species', example: 'cattle' },
    { header: 'Breed', field: 'breed', required: false, type: 'text', description: 'Breed name', example: 'Friesian' },
    { header: 'Sex', field: 'sex', required: true, type: 'select', options: ['male', 'female'], description: 'Sex', example: 'female' },
    { header: 'Date of Birth', field: 'dateOfBirth', required: false, type: 'date', description: 'Date of birth or estimated DOB (YYYY-MM-DD)', example: '2022-03-10' },
    { header: 'Sire Tag', field: 'sireTag', required: false, type: 'text', description: 'Tag number of the father (if known and in this list)', example: 'B-012' },
    { header: 'Dam Tag', field: 'damTag', required: false, type: 'text', description: 'Tag number of the mother (if known and in this list)', example: 'C-023' },
    { header: 'Enterprise Name', field: 'enterpriseName', required: true, type: 'text', description: 'Which herd or pen (must match an enterprise name from Active Enterprises)', example: 'Dairy Herd A' },
    { header: 'Status', field: 'status', required: false, type: 'select', options: ['active', 'sold', 'deceased', 'culled'], description: 'Current status', example: 'active' },
    { header: 'Purchase Date', field: 'purchaseDate', required: false, type: 'date', description: 'Date purchased (if not born on farm)', example: '2022-06-01' },
    { header: 'Purchase Price', field: 'purchasePrice', required: false, type: 'number', description: 'Purchase price in local currency', example: '85000', validation: { min: 0 } },
    { header: 'Current Weight (kg)', field: 'currentWeightKg', required: false, type: 'number', description: 'Last known weight in kg', example: '450', validation: { min: 0, max: 5000 } },
    { header: 'Notes', field: 'notes', required: false, type: 'text', description: 'Any extra details', example: 'Good milker, calm temperament', validation: { maxLength: 500 } },
  ],
}

// ── Exports ────────────────────────────────────────────────────────────────────

export const SETUP_TEMPLATES: SetupTemplate[] = [
  farmLocations,
  infrastructure,
  enterprises,
  inventory,
  contacts,
  animals,
]

export const TEMPLATE_MAP: Record<string, SetupTemplate> = Object.fromEntries(
  SETUP_TEMPLATES.map(t => [t.id, t])
)

export const IMPORT_ORDER: string[] = [
  'farm_locations',
  'infrastructure',
  'enterprises',
  'inventory',
  'contacts',
  'animals',
]
