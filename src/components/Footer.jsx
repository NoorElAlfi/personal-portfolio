import React from 'react';

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 text-center text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} Noor El Alfi</p>
        <div className="flex gap-4">
          <a href="https://www.linkedin.com/in/noor-el-alfi-527a1a20a/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400">
            LinkedIn
          </a>
          <a href="https://github.com/NoorElAlfi" target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-400">
            GitHub
          </a>
          <a href="mailto:noor.alfi@gmail.com" className="hover:text-brand-600 dark:hover:text-brand-400">
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
