export type PropertyType = 'haus' | 'wohnung' | 'grundstueck'
export type ListingStatus = 'draft' | 'pending' | 'published' | 'paused' | 'sold' | 'expired' | 'blocked'
export type EnergyState = 'vorhanden' | 'folgt' | 'nicht_erforderlich'
export type EnergyKind = 'bedarf' | 'verbrauch'
export type ContactMode = 'nachricht' | 'login_email' | 'login_telefon'
export type ReportReason = 'betrug' | 'falsche_angaben' | 'urheberrecht' | 'makler' | 'unzulaessig' | 'sonstiges'
export type ModerationAction = 'freigeben' | 'sperren' | 'zurueckweisen'

export interface Photo {
  id: string
  path: string
  url: string
  position: number
  alt?: string
}

export interface Listing {
  id: string
  ownerId: string
  status: ListingStatus
  type: PropertyType
  title: string
  description: string
  postalCode: string
  city: string
  district?: string
  street?: string
  priceEur: number
  livingAreaM2?: number
  plotAreaM2?: number
  rooms?: number
  yearBuilt?: number
  energyState?: EnergyState
  energyKind?: EnergyKind
  energyValue?: number
  energyCarrier?: string
  energyClass?: string
  contactMode: ContactMode
  addressVerified: boolean
  createdAt: string
  publishedAt?: string
  expiresAt?: string
  photos: Photo[]
  owner?: { firstName?: string; memberSince: string; phoneVerified: boolean }
}

/** Alles, was der Inserent im Formular eingibt (inkl. nicht öffentlicher Felder). */
export interface ListingInput {
  type: PropertyType
  title: string
  description: string
  postalCode: string
  city: string
  district: string
  street: string
  houseNo: string
  priceEur: number | null
  livingAreaM2: number | null
  plotAreaM2: number | null
  rooms: number | null
  yearBuilt: number | null
  energyState: EnergyState | ''
  energyKind: EnergyKind | ''
  energyValue: number | null
  energyCarrier: string
  energyClass: string
  contactMode: ContactMode
  contactEmail: string
  contactPhone: string
}

export interface SearchFilter {
  q?: string
  type?: PropertyType | ''
  priceMax?: number
  areaMin?: number
  roomsMin?: number
  sort?: 'neu' | 'preis_auf' | 'preis_ab'
}

export interface User {
  id: string
  email: string
  displayName: string
  phone: string
  phoneVerified: boolean
  isAdmin: boolean
  trustLevel: number
}

export interface Message {
  id: string
  listingId: string
  listingTitle: string
  senderId: string
  body: string
  createdAt: string
  mine: boolean
}

export interface Report {
  id: string
  listingId: string
  listingTitle: string
  reason: ReportReason
  details: string
  reporterEmail?: string
  createdAt: string
  state: 'offen' | 'entschieden'
}

export type ContactTopic = 'frage' | 'hinweis' | 'datenschutz' | 'sonstiges'

/** Nachricht aus dem allgemeinen Kontaktformular (nicht zu einem Inserat). */
export interface ContactMessage {
  id: string
  name: string
  email: string
  topic: ContactTopic
  body: string
  createdAt: string
}

export interface ContactInfo {
  mode: ContactMode
  email: string | null
  phone: string | null
}

export interface ModerationEntry {
  id: string
  listingId: string
  action: ModerationAction
  reasonText: string
  createdAt: string
}

export interface Api {
  readonly mode: 'demo' | 'live'
  getUser(): Promise<User | null>
  onAuthChange(cb: (u: User | null) => void): void
  /** live: schickt einen Anmeldelink per E-Mail; demo: meldet sofort an */
  signIn(email: string): Promise<{ sent: boolean }>
  signOut(): Promise<void>
  updateProfile(p: { displayName: string; phone: string }): Promise<void>

  search(f: SearchFilter): Promise<Listing[]>
  get(id: string): Promise<Listing | null>
  mine(): Promise<Listing[]>
  /** Gibt auch die nicht öffentlichen Felder zurück (nur für den Inserenten). */
  getInput(id: string): Promise<ListingInput | null>
  saveDraft(input: ListingInput, id?: string): Promise<string>
  addPhoto(listingId: string, blob: Blob, alt?: string): Promise<Photo>
  removePhoto(listingId: string, photoId: string): Promise<void>
  /** Einreichen, pausieren, „verkauft“ melden … – die Datenbank entscheidet, was erlaubt ist. */
  setStatus(id: string, status: ListingStatus): Promise<ListingStatus>
  deleteListing(id: string): Promise<void>

  revealContact(id: string): Promise<ContactInfo>
  sendMessage(listingId: string, body: string): Promise<void>
  inbox(): Promise<Message[]>
  toggleSaved(listingId: string): Promise<boolean>
  saved(): Promise<Listing[]>
  isSaved(listingId: string): Promise<boolean>

  report(r: { listingId: string; reason: ReportReason; details: string; name: string; email: string }): Promise<void>
  moderationLog(): Promise<ModerationEntry[]>
  /** Allgemeines Kontaktformular – auch ohne Konto. */
  sendContact(c: { name: string; email: string; topic: ContactTopic; body: string }): Promise<void>

  adminQueue(): Promise<{ pending: Listing[]; reports: Report[]; contacts: ContactMessage[] }>
  closeContact(id: string): Promise<void>
  moderate(p: { listingId: string; action: ModerationAction; reasonCode: string; reasonText: string; reportId?: string }): Promise<void>
  stats(): Promise<{ published: number }>
}
