'use client'

interface HeaderProps {
  activeSection: string
  onNavigate: (section: string) => void
}

export default function Header({ activeSection, onNavigate }: HeaderProps) {
  return (
    <header className="w-full flex items-center justify-between px-8 py-5 absolute top-0 left-0 right-0 z-50">
      {/* Logo */}
      <button
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2.5 group"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/40">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="text-white font-semibold text-base tracking-tight">Maritime</span>
      </button>

      {/* Nav */}
      <nav className="flex items-center gap-8">
        {[
          { id: 'home',    label: 'Home' },
          { id: 'about',   label: 'About' },
          { id: 'contact', label: 'Contact' },
          { id: 'profile', label: 'Profile' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`text-sm font-medium transition-colors duration-150 ${
              activeSection === item.id
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
