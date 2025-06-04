import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { UserService } from '@/lib/user-service'

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID_WEB!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET_WEB!,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Only handle Google OAuth
        if (account?.provider !== 'google') {
          return false
        }

        // Create or update user in our database
        await UserService.createFromGoogleProfile({
          id: user.id,
          email: user.email!,
          name: user.name!,
          picture: user.image || undefined
        }, 'web')

        return true
      } catch (error) {
        console.error('Error during sign in:', error)
        return false
      }
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token.sub) {
        const user = await UserService.findByGoogleId(token.sub)
        if (user) {
          session.user.id = user._id!.toString()
          session.user.platforms = user.platforms
          session.user.status = user.status
        }
      }
      return session
    },
    async jwt({ token, user, account }) {
      // Store Google ID in token for session callback
      if (account?.provider === 'google' && user) {
        token.sub = user.id
      }
      return token
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt'
  }
})

export { handler as GET, handler as POST }