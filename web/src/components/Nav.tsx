import { NavLink, Link } from 'react-router-dom';

export default function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          Hobby<span className="brand-accent">Trial</span>
        </Link>
        <nav className="nav-links">
          <NavLink to="/explore" className={({ isActive }) => (isActive ? 'active' : '')}>
            Find a class
          </NavLink>
          <NavLink to="/host" className={({ isActive }) => (isActive ? 'active' : '')}>
            Host a class
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
