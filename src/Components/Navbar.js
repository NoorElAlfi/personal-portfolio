
import React from 'react';
import logo from '../Img/logo.png';

function Navbar({ darkMode, setDarkMode }) {
  return (
    <nav className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <img src={logo} alt="Logo" className="w-10 h-10" />
      </div>
      <div className="flex space-x-4 text-lg">
          <a href="https://www.linkedin.com/in/noor-el-alfi-527a1a20a/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition duration-300">LinkedIn</a>
          <a href="https://github.com/NoorElAlfi" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition duration-300">GitHub</a>
          <a href="mailto:noor.alfi@gmail.com" className="hover:text-blue-400 transition duration-300">Email</a>
      </div>
    </nav>
  );
}

export default Navbar;
