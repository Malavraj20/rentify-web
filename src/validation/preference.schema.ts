import { z } from 'zod'

const preferenceString = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(200, `${label} must be at most 200 characters`)

export const renterPreferencesSchema = z
  .object({
    budget: preferenceString('Budget'),
    propertyType: preferenceString('Property type'),
    occupants: preferenceString('Occupants'),
    pets: preferenceString('Pets'),
    furnishing: preferenceString('Furnishing'),
  })
  .strict()

export const buyerPreferencesSchema = z
  .object({
    budget: preferenceString('Budget'),
    propertyType: preferenceString('Property type'),
    purpose: preferenceString('Purpose'),
    furnishing: preferenceString('Furnishing'),
    priority: preferenceString('Priority'),
  })
  .strict()

export type RenterPreferencesInput = z.infer<typeof renterPreferencesSchema>
export type BuyerPreferencesInput = z.infer<typeof buyerPreferencesSchema>
