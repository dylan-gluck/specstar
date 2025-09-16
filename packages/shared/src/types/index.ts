// Core domain types
export interface User {
  id: string
  email: string
  name: string
  emailVerified: boolean
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: string
  name: string
  description?: string
  ownerId: string
  ownerType: 'user' | 'organization'
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  name: string
  content: string
  type?: 'constitution' | 'spec' | 'prd' | 'other'
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export interface Story {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed'
  projectId: string
  createdAt: Date
  updatedAt: Date
}

export interface ApiKey {
  id: string
  key: string
  name: string
  ownerId: string
  ownerType: 'user' | 'organization'
  expiresAt: Date
  createdAt: Date
}