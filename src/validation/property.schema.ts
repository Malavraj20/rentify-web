import { z } from 'zod'
import { isValidImageUrl } from './image.schema.js'

const nonNegativeInt = (label: string) =>
  z.number().int(`${label} must be an integer`).min(0, `${label} must not be negative`)

const optionalText = (max: number) =>
  z.string().trim().min(1, 'Must not be empty').max(max)

const propertyImageRef = z
  .string()
  .trim()
  .min(1, 'Image reference must not be empty')
  .max(2_000_000, 'Image reference is too long')
  .refine(
    isValidImageUrl,
    'Image must be a valid http(s) URL or image data URL',
  )

const propertyBaseSchema = z.object({
  title: z.string().trim().min(1, 'Title must not be empty').max(200),
  description: z
    .string()
    .trim()
    .min(1, 'Description must not be empty')
    .max(5000),
  type: z.string().trim().min(1, 'Type must not be empty').max(50),
  listingFor: z.enum(['rent', 'sale', 'both']),
  price: z
    .number()
    .int('Price must be an integer')
    .positive('Price must be greater than zero'),
  sellingPrice: nonNegativeInt('Selling price').optional(),
  location: z.string().trim().min(1, 'Location must not be empty').max(200),
  address: z.string().trim().min(1, 'Address must not be empty').max(500),
  city: z.string().trim().min(1, 'City must not be empty').max(100),
  state: optionalText(100).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'Pincode must be 4-10 digits')
    .optional(),
  bedrooms: z
    .number()
    .int('Bedrooms must be an integer')
    .min(0, 'Bedrooms must not be negative')
    .max(20),
  bathrooms: z
    .number()
    .int('Bathrooms must be an integer')
    .min(0, 'Bathrooms must not be negative')
    .max(20),
  size: z
    .number()
    .int('Size must be an integer')
    .positive('Size must be greater than zero'),
  furnishing: z.string().trim().min(1, 'Furnishing must not be empty').max(50),
  amenities: z
    .array(z.string().trim().min(1, 'Amenity must not be empty').max(100))
    .max(50)
    .optional(),
  securityDeposit: nonNegativeInt('Security deposit'),
  maintenance: nonNegativeInt('Maintenance'),
  otherCharges: nonNegativeInt('Other charges').optional(),
  available: z.boolean().optional(),
  availableFrom: z.coerce.date().nullish(),
  floor: optionalText(50).optional(),
  totalFloors: optionalText(50).optional(),
  parking: optionalText(100).optional(),
  commute: optionalText(100).optional(),
  latitude: z
    .number('Latitude must be a number')
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z
    .number('Longitude must be a number')
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  status: z.enum(['draft', 'active']).optional(),
  images: z
    .array(propertyImageRef)
    .max(30, 'A property may have at most 30 images')
    .optional(),
})

const hasLatLngPair = (data: { latitude?: number; longitude?: number }) =>
  (data.latitude === undefined) === (data.longitude === undefined)

export const createPropertySchema = propertyBaseSchema.refine(hasLatLngPair, {
  message: 'Latitude and longitude must be supplied together',
  path: ['latitude'],
})

export const updatePropertySchema = propertyBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required for update',
  })
  .refine(hasLatLngPair, {
    message: 'Latitude and longitude must be supplied together',
    path: ['latitude'],
  })

export const propertyIdSchema = z.string().trim().min(1, 'Property id is required')

const optionalPositiveInt = (label: string) =>
  z.coerce
    .number(`${label} must be a number`)
    .int(`${label} must be an integer`)
    .min(0, `${label} must not be negative`)

export const propertyQuerySchema = z.object({
  page: z.coerce
    .number('page must be a number')
    .int('page must be an integer')
    .min(1, 'page must be at least 1')
    .default(1),
  limit: z.coerce
    .number('limit must be a number')
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(10),
  search: z.string().trim().max(200, 'search must be at most 200 characters').optional(),
  city: z.string().trim().max(100, 'city must be at most 100 characters').optional(),
  location: z.string().trim().max(200, 'location must be at most 200 characters').optional(),
  listingFor: z.enum(['rent', 'sale', 'both'], 'listingFor must be rent, sale, or both').optional(),
  type: z.string().trim().max(50, 'type must be at most 50 characters').optional(),
  minPrice: optionalPositiveInt('minPrice').optional(),
  maxPrice: optionalPositiveInt('maxPrice').optional(),
  minSellingPrice: optionalPositiveInt('minSellingPrice').optional(),
  maxSellingPrice: optionalPositiveInt('maxSellingPrice').optional(),
  bedrooms: z.coerce
    .number('bedrooms must be a number')
    .int('bedrooms must be an integer')
    .min(0, 'bedrooms must not be negative')
    .max(20, 'bedrooms must be at most 20')
    .optional(),
  bathrooms: z.coerce
    .number('bathrooms must be a number')
    .int('bathrooms must be an integer')
    .min(0, 'bathrooms must not be negative')
    .max(20, 'bathrooms must be at most 20')
    .optional(),
  furnishing: z.string().trim().max(50, 'furnishing must be at most 50 characters').optional(),
  available: z
    .enum(['true', 'false'], 'available must be true or false')
    .transform((value) => value === 'true')
    .optional(),
})

export type CreatePropertyInput = z.infer<typeof createPropertySchema>
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>
export type PropertyQueryInput = z.infer<typeof propertyQuerySchema>
