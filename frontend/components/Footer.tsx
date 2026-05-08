export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 py-6">
      <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-600">
          © 2025 MaritimeDocs. Built for demonstration purposes.
        </p>
        <p className="text-xs text-gray-600">
          Powered by PaddleOCR · Ollama · Next.js · FastAPI
        </p>
      </div>
    </footer>
  )
}
