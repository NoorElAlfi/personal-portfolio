import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Blog from './pages/Blog';
import LucidHoverPost from './pages/blog/LucidHoverPost';
import CodeDeobfuscatorPost from './pages/blog/CodeDeobfuscatorPost';
import PokemonShowdownPost from './pages/blog/PokemonShowdownPost';
import PokeRoguePost from './pages/blog/PokeRoguePost';
import SiemGuardPost from './pages/blog/SiemGuardPost';

function getInitialDarkMode() {
  const stored = localStorage.getItem('theme');
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function App() {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-[#0b1120] dark:text-slate-100">
        {/* Decorative background gradient */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/20" />
          <div className="absolute top-64 right-0 h-72 w-72 rounded-full bg-accent-400/10 blur-3xl dark:bg-accent-500/10" />
        </div>

        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-slate-50/80 backdrop-blur dark:border-slate-800/70 dark:bg-[#0b1120]/80">
          <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
        </header>

        <main className="mx-auto max-w-5xl px-6 py-14">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/lucidhover" element={<LucidHoverPost />} />
            <Route path="/blog/codebase-deobfuscator" element={<CodeDeobfuscatorPost />} />
            <Route path="/blog/pokemon-showdown-bot" element={<PokemonShowdownPost />} />
            <Route path="/blog/pokerogue-bot" element={<PokeRoguePost />} />
            <Route path="/blog/siem-guard" element={<SiemGuardPost />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
