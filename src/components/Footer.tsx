import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Hemort</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Hitta din perfekta kommun att bo i. Vi hjälper dig jämföra och utforska Sveriges kommuner.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Utforska</h3>
            <ul className="space-y-2">
              <li><Link href="/jamfor" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">Jämför kommuner</Link></li>
              <li><Link href="/quiz" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">Hitta din kommun</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Populära kommuner</h3>
            <ul className="space-y-2">
              <li><Link href="/kommun/stockholm" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">Stockholm</Link></li>
              <li><Link href="/kommun/goteborg" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">Göteborg</Link></li>
              <li><Link href="/kommun/malmo" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">Malmö</Link></li>
              <li><Link href="/kommun/uppsala" className="text-sm text-gray-500 hover:text-emerald-600 transition-colors">Uppsala</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            Hemort.se &mdash; Data är illustrativ och baserad på öppna källor. Alla uppgifter bör verifieras.
          </p>
        </div>
      </div>
    </footer>
  );
}
