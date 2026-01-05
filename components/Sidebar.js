import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠', key: 'home' },
  { href: '/workspace', label: 'Workspace', icon: '🧠', key: 'workspace' },
  { href: '/report', label: 'Report', icon: '📊', key: 'report' },
  { href: '/settings', label: 'Settings', icon: '⚙️', key: 'settings' }
];

export default function Sidebar({ active }) {
  return (
    <nav className="sidebar">
      <div className="logo">PPSS</div>
      <ul>
        {navItems.map((item) => (
          <li key={item.key}>
            <Link href={item.href} legacyBehavior>
              <a className={active === item.key ? 'active' : ''}>
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
