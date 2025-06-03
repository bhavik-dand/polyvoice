'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function DesktopCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setErrorMessage(`OAuth error: ${error}`)
          return
        }

        if (!code) {
          setStatus('error')
          setErrorMessage('Authorization code not received')
          return
        }

        // Exchange code for token via our API
        console.log('🔄 Exchanging code for token...')
        const response = await fetch('/api/v1/auth/desktop-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            state,
            deviceInfo: {
              deviceId: 'pending', // Will be provided by app
              deviceName: 'Browser Auth',
              osVersion: navigator.userAgent,
              appVersion: '1.0.0'
            }
          })
        })

        console.log('📡 Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('❌ Token exchange failed:', errorData)
          setStatus('error')
          setErrorMessage(errorData.error || 'Authentication failed')
          return
        }

        const data = await response.json()
        console.log('✅ Token exchange successful:', data)
        setToken(data.token)
        setStatus('success')

      } catch (error) {
        setStatus('error')
        setErrorMessage('Network error occurred')
        console.error('Callback error:', error)
      }
    }

    handleCallback()
  }, [searchParams])

  const handleReturnToApp = () => {
    console.log('🔗 Return to app clicked, token:', token ? '✅ Present' : '❌ Missing')
    if (token) {
      const url = `polyvoice://auth?token=${encodeURIComponent(token)}`
      console.log('🚀 Opening URL:', url)
      window.location.href = url
    } else {
      console.error('❌ No token available!')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-xl font-semibold text-gray-800">Processing authentication...</h1>
          <p className="text-gray-600 mt-2">Please wait while we complete your sign-in</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-xl shadow-lg">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentication Failed</h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => window.close()}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-md mx-auto text-center bg-white p-8 rounded-xl shadow-lg">
        <div className="text-green-500 text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Authentication Successful!</h1>
        <p className="text-gray-600 mb-6">
          Click the button below to return to PolyVoice and complete your setup.
        </p>
        <button
          onClick={handleReturnToApp}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors mb-4 w-full"
        >
          Return to PolyVoice
        </button>
        <p className="text-sm text-gray-500">
          You can close this window after clicking the button above.
        </p>
      </div>
    </div>
  )
}