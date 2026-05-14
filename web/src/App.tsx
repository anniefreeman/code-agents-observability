import { Outlet } from 'react-router-dom';
import Nav from './components/Nav';

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container footer-inner">
          <span>Hobby Trial</span>
          <span className="muted">A demo platform for finding and hosting classes.</span>
        </div>
      </footer>
    </div>
  );
}
