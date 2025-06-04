'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function DownloadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [downloadTracked, setDownloadTracked] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const handleDownload = async () => {
    // Track download
    try {
      await fetch('/api/v1/user/download-tracked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: 'macos',
          version: '1.0.0'
        })
      })
      setDownloadTracked(true)
    } catch (error) {
      console.error('Failed to track download:', error)
    }

    // Simulate download (you'll replace this with actual download link)
    const link = document.createElement('a')
    link.href = '/PolyVoice.dmg' // This would be your actual app file
    link.download = 'PolyVoice.dmg'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect to home
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Header */}
      <header className="relative z-10 px-6 pt-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                <span className="text-sm font-bold text-white">PV</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">PolyVoice</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {session.user?.image && (
                  <Image 
                    src={session.user.image} 
                    alt={session.user.name || 'User'} 
                    className="h-8 w-8 rounded-full"
                    width={32}
                    height={32}
                  />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {session.user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-16 pb-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="space-y-8">
            {/* Welcome Message */}
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Welcome, {session.user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                You&apos;re all set to download PolyVoice for macOS.
              </p>
            </div>

            {/* Download Card */}
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl border border-white/20 dark:border-slate-700/20 p-8">
                <div className="text-center space-y-6">
                  <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                    <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      PolyVoice for macOS
                    </h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      Version 1.0.0 • Compatible with macOS 12.0 and later
                    </p>
                  </div>

                  {downloadTracked ? (
                    <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                      <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">Download Started!</span>
                      </div>
                      <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                        Your download should begin automatically. Check your Downloads folder.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleDownload}
                      className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200"
                    >
                      Download PolyVoice.dmg
                    </button>
                  )}

                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    File size: ~15 MB • No subscription required
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="mx-auto max-w-3xl">
              <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Next Steps:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-slate-700 dark:text-slate-300">1. Install</div>
                    <div className="text-slate-600 dark:text-slate-400">Open the .dmg file and drag PolyVoice to Applications</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-slate-700 dark:text-slate-300">2. Grant Permissions</div>
                    <div className="text-slate-600 dark:text-slate-400">Allow microphone and accessibility access when prompted</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-slate-700 dark:text-slate-300">3. Start Using</div>
                    <div className="text-slate-600 dark:text-slate-400">Hold fn key anywhere and speak to transcribe</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Need help? Contact us at{' '}
                <a href="mailto:support@polyvoice.app" className="text-blue-600 dark:text-blue-400 hover:underline">
                  support@polyvoice.app
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}