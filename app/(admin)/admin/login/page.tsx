'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result?.error) {
      setError('Invalid email or password.')
      setLoading(false)
    } else {
      router.push('/admin/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-white font-black text-2xl tracking-widest">ANTIGRAVITY</h1>
          <p className="text-gray-500 text-xs tracking-[0.35em] mt-1">ADMIN PORTAL</p>
        </div>

        <div className="bg-brand-navy rounded-2xl p-8 shadow-2xl border border-white/5">
          <h2 className="text-white font-bold text-lg mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                     className="w-full bg-brand-dark border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent"
                     placeholder="admin@example.com" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                     className="w-full bg-brand-dark border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-accent" />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
                    className="w-full bg-brand-accent text-brand-dark font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-60 mt-2">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
