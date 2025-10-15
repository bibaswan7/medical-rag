import Link from 'next/link';
import Github from './GitHub';

export default function Header() {
  return (
    <header className="flex justify-between items-center w-full p-4 absolute top-0 left-0 z-10">
      <Link href="/" className="flex items-center space-x-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Burke Chat
        </h1>
      </Link>
      <a
        className="text-muted-foreground hover:text-foreground transition-colors"
        href="https://github.com/bibaswan7/medical-rag"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Github />
      </a>
    </header>
  );
}