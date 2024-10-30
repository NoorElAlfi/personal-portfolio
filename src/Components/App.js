
import React, { useState } from 'react';
import AboutMe from './AboutMe';
import Skills from './Skills';
import Experience from './Experience';
import Projects from './Projects';
import Education from './Education';
import Navbar from './Navbar';
import '../App.css';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100`}>
      <header className="bg-gray-900 text-white p-4 fixed top-0 left-0 right-0 z-10 shadow-lg">
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
      </header>
      <main className="container mx-auto pt-24 px-4 space-y-12">
        <AboutMe />
        <Education />
        <Skills />
        <Experience />
        <Projects />
      </main>
      <footer className="bg-gray-900 text-white p-4 text-center mt-8">
        Noor El Alfi ©2024 - Created with React & Tailwind CSS
      </footer>
    </div>
  );
}

export default App;
