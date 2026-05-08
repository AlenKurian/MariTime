'use client'

import { useState } from 'react'
import { Upload, BookOpen, ArrowRightCircle, ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import UploadSection from '@/components/UploadSection'
import VaultSection from '@/components/VaultSection'
import PortSelectionSection from '@/components/PortSelectionSection'
import { Document } from '@/lib/types'

type Section = 'home' | 'upload' | 'vault' | 'ports' | 'about' | 'contact' | 'profile'

const CARDS = [
  {
    id: 'upload' as Section,
    icon: Upload,
    iconBg: 'bg-[#1E1B4B]',
    title: 'Upload Documents',
    description:
      'Securely upload files in any format. We support PDF, DOCX, images, and more.',
    cta: 'Choose Files',
    ctaStyle: 'bg-white/10 hover:bg-white/[0.15] text-white',
  },
  {
    id: 'vault' as Section,
    icon: BookOpen,
    iconBg: 'bg-[#2E1065]',
    title: 'View Vault',
    description:
      'Access your uploaded files. View details, manage, or download them to your device.',
    cta: 'Browse Files',
    ctaStyle: 'bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-lg shadow-violet-900/40',
  },
  {
    id: 'ports' as Section,
    icon: ArrowRightCircle,
    iconBg: 'bg-[#1E1B4B] border border-violet-600/30',
    title: 'Set Route',
    description:
      'Configure the starting point and final destination for your document package.',
    cta: 'Select Locations',
    ctaStyle: 'bg-white/10 hover:bg-white/[0.15] text-white',
  },
]

export default function HomePage() {
  const [active, setActive] = useState<Section>('home')
  const [vaultRefresh, setVaultRefresh] = useState(0)

  const handleUploaded = (_docs: Document[]) => {
    setVaultRefresh((n) => n + 1)
    setTimeout(() => setActive('vault'), 500)
  }

  const isLanding = active === 'home' || active === 'about' || active === 'contact' || active === 'profile'

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B1E] relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-800/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-indigo-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl" />
      </div>

      <Header activeSection={active} onNavigate={(s) => setActive(s as Section)} />

      {/* ── Landing / Info pages ── */}
      {isLanding && (
        <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-16 relative z-10">
          {active === 'home' && (
            <>
              {/* Hero */}
              <div className="text-center mb-20 animate-slide-up">
                <h1 className="text-6xl sm:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
                  <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
                    Seamless Workflow
                  </span>
                  <br />
                  <span className="text-white">For Your Documents</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
                  Upload, manage, and route your documents with our premium logistics
                  platform. Built for speed, designed for elegance.
                </p>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl animate-fade-in">
                {CARDS.map((card) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.id}
                      className="group bg-[#12122A]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-8 flex flex-col gap-6
                        hover:border-violet-500/30 hover:bg-[#12122A] transition-all duration-300 cursor-default"
                    >
                      <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5 text-violet-400" />
                      </div>

                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-2">{card.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">{card.description}</p>
                      </div>

                      <button
                        onClick={() => setActive(card.id)}
                        className={`w-full py-3 px-5 rounded-xl text-sm transition-all duration-200 ${card.ctaStyle}`}
                      >
                        {card.cta}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {active === 'about' && (
            <div className="max-w-2xl text-center animate-fade-in">
              <h2 className="text-4xl font-extrabold text-white mb-4">About MaritimeDocs</h2>
              <p className="text-gray-400 leading-relaxed">
                MaritimeDocs is an AI-powered maritime documentation platform that streamlines
                the upload, extraction, and port-compliance matching of shipping documents using
                OCR and large language models.
              </p>
            </div>
          )}

          {active === 'contact' && (
            <div className="max-w-2xl text-center animate-fade-in">
              <h2 className="text-4xl font-extrabold text-white mb-4">Contact</h2>
              <p className="text-gray-400">For support or enquiries, reach out at{' '}
                <span className="text-violet-400">support@maritimedocs.io</span>
              </p>
            </div>
          )}

          {active === 'profile' && (
            <div className="max-w-2xl text-center animate-fade-in">
              <h2 className="text-4xl font-extrabold text-white mb-4">Profile</h2>
              <p className="text-gray-400">User profile management coming soon.</p>
            </div>
          )}
        </main>
      )}

      {/* ── App sections ── */}
      {!isLanding && (
        <main className="flex-1 relative z-10 pt-24 pb-12">
          {/* Back button */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
            <button
              onClick={() => setActive('home')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-violet-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </button>
          </div>

          {/* Section wrapper — light surface so existing component styles render correctly */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl animate-fade-in min-h-[60vh]">
              {active === 'upload' && <UploadSection onUploaded={handleUploaded} />}
              {active === 'vault'  && <VaultSection refreshTrigger={vaultRefresh} />}
              {active === 'ports'  && <PortSelectionSection />}
            </div>
          </div>
        </main>
      )}

      <Footer />
    </div>
  )
}
