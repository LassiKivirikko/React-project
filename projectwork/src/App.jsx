import { BrowserRouter, Routes, Route, Link, Outlet } from "react-router-dom";
import Settings from './Settings';
import Home from "./home";
import Info from "./Info";
import './App.css';

export default function App() {

  return (
    <div>
      <BrowserRouter>
        <div className="navbar">
          <nav>
            <Link to="/">Home</Link>
            <Link to="Info">Info</Link>
            <Link to="Setting">Setting</Link>
          </nav>
        </div>
        <div className="content">
          <Routes>
            <Route path="Setting" element={<Settings />} />
            <Route path="/" element={<Home />} />
            <Route path="Info" element={<Info />} />
          </Routes>
          <Outlet />
        </div>
      </BrowserRouter>
    </div>
  );
}