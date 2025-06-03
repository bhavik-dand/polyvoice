"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // No automatic redirect - users can visit landing page when logged in

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 pt-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                <span className="text-sm font-bold text-white">PV</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">PolyVoice</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                How it Works
              </a>
              <a href="#download" className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                Download
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative">
        <div className="mx-auto max-w-7xl px-6 pt-16 pb-24 text-center lg:pt-32">
          <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-7xl">
              Voice to Text,
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}Everywhere
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Transform your voice into text instantly across any macOS application. 
              Simply hold the fn key and speak - PolyVoice handles the rest with AI-powered transcription.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {status === 'loading' ? (
                <div className="rounded-lg bg-slate-200 dark:bg-slate-700 px-8 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Loading...
                </div>
              ) : session ? (
                <button 
                  onClick={() => router.push('/download')}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:from-green-700 hover:to-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Go to Download Page
                </button>
              ) : (
                <button 
                  onClick={() => signIn('google', { callbackUrl: '/download' })}
                  className="inline-flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google to Download
                </button>
              )}
              <button className="rounded-lg border border-slate-300 dark:border-slate-600 px-8 py-3 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Watch Demo
              </button>
            </div>
          </div>

          {/* Visual Demo */}
          <div className={`mt-16 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-2xl border border-white/20 dark:border-slate-700/20 p-8">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Press and hold fn key...</div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-slate-600 dark:text-slate-300">Recording...</span>
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                    <div className="typewriter text-slate-800 dark:text-slate-200">
                      Hello, this is a demonstration of PolyVoice transcription in real-time.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Powerful Features
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Everything you need for seamless voice-to-text transcription
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group relative rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-xl border border-slate-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <span className="text-2xl">🎤</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">System-wide Integration</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Works across all macOS applications. No need to switch between apps or copy-paste.
                </p>
              </div>
              
              <div className="group relative rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-xl border border-slate-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Lightning Fast</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Real-time transcription powered by OpenAI&apos;s latest models for instant results.
                </p>
              </div>
              
              <div className="group relative rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-xl border border-slate-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Privacy First</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Your audio data is processed securely and never stored permanently.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                How it Works
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Three simple steps to transform your voice into text
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Press & Hold</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Hold down the fn key anywhere in macOS to start recording
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Speak Naturally</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Talk normally while seeing visual feedback in our elegant interface
                </p>
              </div>
              
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Release & Type</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300">
                  Release the key and watch your words appear instantly
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Download Section */}
        <section id="download" className="py-24 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Transform Your Workflow?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Download PolyVoice for macOS and experience the future of voice input.
            </p>
            <div className="mt-8">
              {status === 'loading' ? (
                <div className="rounded-lg bg-white/80 px-8 py-3 text-sm font-semibold text-blue-600/60">
                  Loading...
                </div>
              ) : (
                <button 
                  onClick={() => signIn('google')}
                  className="inline-flex items-center rounded-lg bg-white px-8 py-3 text-sm font-semibold text-blue-600 shadow-lg hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google to Download
                </button>
              )}
            </div>
            <p className="mt-4 text-sm text-blue-200">
              Free download • Works with any macOS application • No subscription required
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600">
                  <span className="text-sm font-bold text-white">PV</span>
                </div>
                <span className="text-xl font-bold text-white">PolyVoice</span>
              </div>
              <p className="text-sm text-slate-400">
                © 2024 PolyVoice. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>

      <style jsx>{`
        .typewriter {
          overflow: hidden;
          white-space: nowrap;
          animation: typewriter 3s steps(60, end) infinite;
        }
        
        @keyframes typewriter {
          0% { width: 0; }
          50% { width: 100%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}
