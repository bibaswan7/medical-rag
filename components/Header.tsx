// components/Header.tsx
import Link from 'next/link';
import Github from './GitHub';

export default function Header() {
  return (
    <header className="flex justify-between items-center w-full px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-sm">
      <Link href="/" className="flex items-center space-x-3 group">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight">
          Burke AI
        </h1>
      </Link>
      <a
        className="flex items-center justify-center space-x-2 rounded-full border border-slate-300 bg-white/50 px-4 py-2 text-sm text-slate-700 shadow-md backdrop-blur-sm transition-all hover:bg-slate-100 hover:shadow-lg hover:scale-105"
        href="https://github.com/bibaswan7/medical-rag"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Github />
        <p>Star on GitHub</p>
      </a>
    </header>
  );
}
