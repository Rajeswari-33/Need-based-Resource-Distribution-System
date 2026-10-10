export const CATEGORIES = [
  'Clothes & Textiles',
  'Books & Stationery',
  'Electronics & Gadgets',
  'Furniture & Household',
  "Toys & Children's Items",
]

export const CATEGORY_ICON = {
  'Clothes & Textiles': '🧣',
  'Books & Stationery': '📚',
  'Electronics & Gadgets': '🔌',
  'Furniture & Household': '🪑',
  "Toys & Children's Items": '🧸',
}

// Institution types a "recipient center" can be. A center on Setu is a recipient — an
// orphanage, an old-age home, a shelter, an NGO — not a warehouse that redistributes goods.
export const CENTER_TYPES = ['Orphanage', 'Old-age home', "Women's shelter", 'NGO / Trust', 'Community welfare society']

// Exactly one seeded account — the platform admin. Admin cannot be created via registration
// (enforced in AuthContext.register), so this is the only way in as admin. Demo login:
// username "admin", password "Admin@123".
export const seedUsers = [
  {
    id: 'u-admin-1',
    name: 'Platform Admin',
    email: 'admin@setu.org',
    username: 'admin',
    // DEMO ONLY — plain text, not secure. A real deployment would hash this server-side and
    // never keep it in client-readable state.
    password: 'Admin@123',
    phone: '+91 90000 00000',
    role: 'admin',
    city: '',
    verified: true,
    verificationStatus: 'verified',
    verificationDoc: null,
    verificationNote: null,
    mobileVerified: true,
    emailVerified: true,
    address: '',
    joined: new Date().toISOString().slice(0, 10),
    restricted: false,
    flaggedForReview: false,
    flagReasons: [],
  },
]

// A "center" here is the RECIPIENT institution itself (an orphanage, an old-age home, a
// shelter, an NGO) — not a physical drop-off/distribution depot. `approved` reflects whether
// the institution's own registration has been verified by an admin (see verificationStatus /
// verificationDoc — the same document-review pipeline used for individual users, but scoped
// to the institution rather than the coordinator's personal identity).
export const seedCenters = []

// resource.audience decides WHO can claim it:
//   'individual' -> open to individual recipients only (never centers)
//   'center'     -> for registered recipient centers only (never individual recipients)
// resource.centerScope only applies when audience === 'center':
//   'specific'   -> the donor picked ONE registered center; it's pushed straight to that
//                   center's "Incoming Donations" (method: 'center') — no claiming/requesting,
//                   the donor already decided who gets it.
//   'open'       -> not tied to any one center; any approved center may claim it, exactly like
//                   an individual claims an 'individual' item (method: 'direct', but center-only).
export const seedResources = []

export const seedRequests = []

// Delivery task flow: open -> accepted -> delivered -> completed after donor handoff,
// volunteer delivery, and recipient/center receipt confirmations. Field-verification tasks
// are separate: open -> accepted -> completed with a report and verification outcome.
export const seedTasks = []

export const seedNotifications = []

// Per-document-type guidance for the verification forms — a bare "document number" field
// isn't enough on its own since every ID type has a different format, so pairing each type
// with its own hint/placeholder keeps people from guessing what to type.
export const PERSONAL_DOC_TYPES = [
  { type: 'Aadhaar', hint: '12-digit number, no spaces or dashes needed', placeholder: 'e.g. 123456789012' },
  { type: 'PAN Card', hint: '10 characters: 5 letters, 4 digits, 1 letter', placeholder: 'e.g. ABCDE1234F' },
  { type: 'Voter ID (EPIC)', hint: '3 letters followed by 7 digits', placeholder: 'e.g. ABC1234567' },
  { type: 'Driving Licence', hint: 'State code followed by the licence number', placeholder: 'e.g. TN0120230012345' },
  { type: 'Ration Card', hint: 'As printed on your card, including any state prefix', placeholder: 'e.g. TN-RC-88213' },
  { type: 'Passport', hint: '1 letter followed by 7 digits', placeholder: 'e.g. A1234567' },
]

export const CENTER_DOC_TYPES = [
  { type: 'Trust Registration Certificate', hint: 'Registration number issued by the Registrar of Trusts', placeholder: 'e.g. TN/TRUST/2019/00231' },
  { type: 'Society Registration Certificate', hint: 'Registration number under the Societies Registration Act', placeholder: 'e.g. TN/SOC/2021/01187' },
  { type: 'NGO Darpan Registration', hint: 'Unique ID from the NGO Darpan government portal', placeholder: 'e.g. TN/2026/0456123' },
  { type: '12A / 80G Certificate', hint: 'Certificate number issued by the Income Tax Department', placeholder: 'e.g. AABTS1234FE20211' },
  { type: 'Government Recognition Letter', hint: 'Reference number printed on the letter', placeholder: 'e.g. GO(MS) 145/2024' },
]

// Step 2 of center verification — proof that THIS person is actually authorized to represent
// the institution that passed Step 1. Deliberately not the same list as PERSONAL_DOC_TYPES:
// an Aadhaar alone doesn't prove someone works at or represents a given institution.
export const COORDINATOR_AFFILIATION_DOC_TYPES = [
  { type: 'Appointment Letter', hint: 'Reference / letter number from the institution', placeholder: 'e.g. KCH/APPT/2025/014' },
  { type: 'Staff ID Card', hint: 'Employee/staff ID number as printed on the card', placeholder: 'e.g. KCH-STAFF-0231' },
  { type: 'Authorization Letter from Institution', hint: 'Reference number of the authorization letter', placeholder: 'e.g. AUTH/2026/0092' },
  { type: 'Trustee / Board Resolution Copy', hint: 'Resolution or minute number naming this coordinator', placeholder: 'e.g. RES-2025-11-03' },
]
