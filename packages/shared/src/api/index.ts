import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure // Will add auth middleware

// Validation schemas
export const projectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ownerType: z.enum(['user', 'organization'])
})

export const documentSchema = z.object({
  name: z.string().min(1).max(255),
  content: z.string(),
  type: z.enum(['constitution', 'spec', 'prd', 'other']).optional()
})

export const storySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string(),
  status: z.enum(['pending', 'in-progress', 'completed'])
})