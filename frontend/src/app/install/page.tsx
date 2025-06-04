'use client'

export default function InstallPage() {
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
            <a
              href="/"
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-16 pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="space-y-8">
            {/* Title */}
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Installing PolyVoice
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Follow these simple steps to get PolyVoice running on your Mac
              </p>
            </div>

            {/* Installation Steps */}
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-slate-700/20 p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Open the Downloaded DMG
                    </h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      Locate the <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">PolyVoice.dmg</code> file in your Downloads folder and double-click to open it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-slate-700/20 p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Drag to Applications
                    </h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      In the opened DMG window, drag the PolyVoice app to the Applications folder shortcut.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-slate-700/20 p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Launch PolyVoice
                    </h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      Open your Applications folder and double-click PolyVoice to launch it.
                    </p>
                    <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>First Launch:</strong> macOS may show a security warning. Click "Open" when prompted, or go to System Preferences → Security & Privacy and click "Open Anyway" if needed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-slate-700/20 p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Grant Permissions
                    </h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      PolyVoice will request two important permissions:
                    </p>
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          <strong>Microphone Access:</strong> Required to record your voice
                        </span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          <strong>Accessibility Access:</strong> Required to insert transcribed text
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step 5 */}
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-slate-700/20 p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white font-bold text-sm">
                    ✓
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Start Using PolyVoice
                    </h3>
                    <p className="mt-2 text-slate-600 dark:text-slate-300">
                      You're all set! Hold the <kbd className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm border">fn</kbd> key anywhere on your Mac and speak to transcribe your voice to text.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* System Requirements */}
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                System Requirements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-300">Operating System</div>
                  <div className="text-slate-600 dark:text-slate-400">macOS 12.0 or later</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-300">Storage</div>
                  <div className="text-slate-600 dark:text-slate-400">Less than 1 MB available space</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-300">Microphone</div>
                  <div className="text-slate-600 dark:text-slate-400">Built-in or external microphone</div>
                </div>
                <div>
                  <div className="font-medium text-slate-700 dark:text-slate-300">Internet</div>
                  <div className="text-slate-600 dark:text-slate-400">Required for transcription</div>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Having trouble? Contact us at{' '}
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