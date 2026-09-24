import type { AuthUser, Owner, Role } from '../types'
import { readJson } from '../utils/storage'

// PRODUCTION SAFEGUARD: Frontend-only demo fixtures for UI labels/fallbacks.
// Never imported by the Express API. Never written to PostgreSQL.
// Do not use these accounts as real credentials or seed them into the database.
export const owners: Owner[] = [
  {
    id: 'own-rajesh',
    name: 'Rajesh Patel',
    email: 'rajesh.patel@example.in',
    role: 'Property Owner',
    phone: '+91 98250 11223',
  },
  {
    id: 'own-priya',
    name: 'Priya Shah',
    email: 'priya.shah@example.in',
    role: 'Property Owner',
    phone: '+91 98795 44551',
  },
  {
    id: 'own-amit',
    name: 'Amit Mehta',
    email: 'amit.mehta@example.in',
    role: 'Property Owner',
    phone: '+91 99043 77882',
  },
  {
    id: 'own-neha',
    name: 'Neha Desai',
    email: 'neha.desai@example.in',
    role: 'Property Owner',
    phone: '+91 97263 90112',
  },
  {
    id: 'own-rahul',
    name: 'Rahul Patel',
    email: 'rahul.patel@example.in',
    role: 'Property Owner',
    phone: '+91 90999 65430',
  },
  {
    id: 'own-pooja',
    name: 'Pooja Shah',
    email: 'pooja.shah@example.in',
    role: 'Property Owner',
    phone: '+91 94270 33119',
  },
]

function registeredUsers(): AuthUser[] {
  const list = readJson<AuthUser[]>('rentify:registeredUsers', [])
  return Array.isArray(list) ? list : []
}

export function getOwnerById(id: string): Owner | undefined {
  const fromOwners = owners.find((owner) => owner.id === id)
  if (fromOwners) return fromOwners
  const account =
    mockUsers.find((user) => user.id === id && user.role === 'owner') ??
    registeredUsers().find((user) => user.id === id && user.role === 'owner')
  if (account) {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      role: 'Property Owner',
      phone: account.phone,
    }
  }
  return undefined
}

export const mockUsers: AuthUser[] = [
  {
    id: 'usr-ananya',
    name: 'Ananya Sharma',
    email: 'ananya@example.in',
    role: 'tenant',
    phone: '+91 98795 12345',
    preferredLocation: 'Alkapuri',
    budget: 22000,
    preferredBedrooms: 2,
    createdAt: '2026-06-12',
  },
  {
    id: 'usr-kunal',
    name: 'Kunal Joshi',
    email: 'kunal.joshi@example.in',
    role: 'tenant',
    phone: '+91 99043 22110',
    preferredLocation: 'Gotri',
    budget: 18000,
    preferredBedrooms: 1,
    createdAt: '2026-07-02',
  },
  {
    id: 'usr-sneha',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@example.in',
    role: 'tenant',
    phone: '+91 97263 55441',
    preferredLocation: 'Akota',
    budget: 25000,
    preferredBedrooms: 2,
    createdAt: '2026-07-21',
  },
  {
    id: 'usr-devang',
    name: 'Devang Trivedi',
    email: 'devang.trivedi@example.in',
    role: 'tenant',
    phone: '+91 90999 88112',
    preferredLocation: 'Manjalpur',
    budget: 15000,
    preferredBedrooms: 1,
    createdAt: '2026-08-15',
  },
  {
    id: 'usr-vivek',
    name: 'Vivek Mehta',
    email: 'vivek.mehta@example.in',
    role: 'buyer',
    phone: '+91 94270 77119',
    preferredLocation: 'Gotri',
    budget: 4500000,
    createdAt: '2026-05-14',
  },
  {
    id: 'own-rajesh',
    name: 'Rajesh Patel',
    email: 'rajesh.patel@example.in',
    role: 'owner',
    phone: '+91 98250 11223',
    createdAt: '2026-01-10',
  },
  {
    id: 'own-priya',
    name: 'Priya Shah',
    email: 'priya.shah@example.in',
    role: 'owner',
    phone: '+91 98795 44551',
    createdAt: '2026-02-14',
  },
  {
    id: 'own-amit',
    name: 'Amit Mehta',
    email: 'amit.mehta@example.in',
    role: 'owner',
    phone: '+91 99043 77882',
    createdAt: '2026-03-05',
  },
  {
    id: 'own-neha',
    name: 'Neha Desai',
    email: 'neha.desai@example.in',
    role: 'owner',
    phone: '+91 97263 90112',
    createdAt: '2026-04-19',
  },
  {
    id: 'own-rahul',
    name: 'Rahul Patel',
    email: 'rahul.patel@example.in',
    role: 'owner',
    phone: '+91 90999 65430',
    createdAt: '2026-05-08',
  },
  {
    id: 'own-pooja',
    name: 'Pooja Shah',
    email: 'pooja.shah@example.in',
    role: 'owner',
    phone: '+91 94270 33119',
    createdAt: '2026-05-27',
  },
  {
    id: 'usr-admin',
    name: 'Rentify Admin',
    email: 'admin@rentify.in',
    role: 'admin',
    phone: '+91 264 241 0000',
    createdAt: '2026-01-01',
  },
]

export const roleLabels: Record<Role, string> = {
  tenant: 'Tenant',
  buyer: 'Buyer',
  owner: 'Property Owner',
  admin: 'Admin',
}
