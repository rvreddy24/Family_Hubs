import { NavLink, Link, useLocation } from 'react-router-dom';
import { Heart } from 'lucide-react';

export type Audience = 'family' | 'provider' | 'hub';

const TABS: { id: Audience; label: string; to: string }[] = [
  { id: 'family', label: 'For families', to: '/' },
  { id: 'provider', label: 'For partners', to: '/providers' },
  { id: 'hub', label: 'For hubs', to: '/hubs' },
];

/**
 * Top navigation shared by the three role-specific landing pages. Highlights the
 * active audience tab and exposes a "Sign in" affordance that always points back to
 * the page's own auth panel anchor (#auth).
 */
export function MarketingNav({ active }: { active: Audience }) {
  const { pathname } = useLocation();
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-gray-100">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-100 group-hover:scale-105 transition-transform">
            <Heart className="w-4 h-4 fill-current" />
          </div>
          <span className="font-black tracking-tight text-primary hidden sm:inline">FamilyHubs</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 p-1 bg-gray-50 rounded-full">
          {TABS.map(t => (
            <NavLink
              key={t.id}
              to={t.to}
              className={() => {
                const isActive = active === t.id;
                return [
                  'px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all',
                  isActive
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-primary',
                ].join(' ');
              }}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <a
          href={`${pathname}#auth`}
          className="px-4 py-2 rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-widest hover:bg-accent transition-colors"
        >
          Sign in
        </a>
      </div>

      {/* Mobile audience tabs */}
      <div className="md:hidden border-t border-gray-100 bg-white/95">
        <div className="flex items-center justify-around">
          {TABS.map(t => (
            <NavLink
              key={t.id}
              to={t.to}
              className={() => {
                const isActive = active === t.id;
                return [
                  'flex-1 py-2.5 text-center text-[10px] font-black uppercase tracking-widest',
                  isActive ? 'text-primary border-b-2 border-accent' : 'text-gray-400',
                ].join(' ');
              }}
            >
              {t.label.replace('For ', '')}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
}
