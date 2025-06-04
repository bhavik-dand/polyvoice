import { DefaultSession } from 'next-auth'
import { User } from '@/lib/schemas'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      platforms?: User['platforms']
      status?: User['status']
    } & DefaultSession['user']
  }
}