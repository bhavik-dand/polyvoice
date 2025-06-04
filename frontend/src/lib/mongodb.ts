import { MongoClient, Db, Collection, MongoClientOptions } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local')
}

const uri = process.env.MONGODB_URI

// Determine if we're connecting to Atlas (cloud) or local MongoDB
const isAtlas = uri.includes('mongodb+srv://') || uri.includes('.mongodb.net')

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
  maxPoolSize: 10,
  retryWrites: true,
  w: 'majority' as const,
  // Only use TLS for Atlas connections
  ...(isAtlas && {
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
  })
}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable to preserve the value
  // across module reloads caused by HMR (Hot Module Replacement)
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options)
    globalWithMongo._mongoClientPromise = client.connect().catch((error) => {
      console.error('MongoDB connection error in development:', error)
      throw error
    })
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable
  client = new MongoClient(uri, options)
  clientPromise = client.connect().catch((error) => {
    console.error('MongoDB connection error in production:', error)
    throw error
  })
}

// Database helper function
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise
  return client.db('polyvoice')
}

// Collection helpers
export async function getUsersCollection(): Promise<Collection> {
  const db = await getDatabase()
  return db.collection('users')
}

export async function getSessionsCollection(): Promise<Collection> {
  const db = await getDatabase()
  return db.collection('sessions')
}

export default clientPromise