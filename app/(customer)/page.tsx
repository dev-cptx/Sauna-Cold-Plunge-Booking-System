import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Welcome' }

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div>
          <p className="text-xl font-black tracking-widest">ANTIGRAVITY</p>
          <p className="text-xs text-gray-500 tracking-[0.35em]">SAUNA & COLD PLUNGE</p>
        </div>
        <Link
          href="/book"
          className="bg-brand-accent text-brand-dark font-bold px-5 py-2 rounded-full text-sm hover:opacity-90 transition-opacity"
        >
          Book Now
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
          RESET.<br />
          <span className="text-brand-accent">RECOVER.</span><br />
          RISE.
        </h1>
        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-xl mx-auto">
          Experience the contrast of our premium sauna and cold plunge facility.
          Sessions designed to restore mind and body.
        </p>
        <Link
          href="/book"
          className="inline-block bg-brand-accent text-brand-dark font-bold px-10 py-4 rounded-full text-lg hover:opacity-90 transition-opacity"
        >
          Book a Session
        </Link>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '🔥', title: 'Premium Sauna',     body: 'Finnish-style dry sauna heated to 80–100 °C. Relax, sweat, and detox.' },
          { icon: '🧊', title: 'Cold Plunge',        body: 'Ice-cold immersion pool maintained at 10–15 °C for maximum recovery.' },
          { icon: '✨', title: 'Contrast Therapy',  body: 'Guided hot-cold cycles that boost circulation and reduce inflammation.' },
        ].map((f) => (
          <div key={f.title} className="bg-brand-navy border border-white/5 rounded-2xl p-6">
            <p className="text-3xl mb-3">{f.icon}</p>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-gray-600 text-xs pb-8">
        © {new Date().getFullYear()} Antigravity. All rights reserved.
      </footer>
    </div>
  )
}
