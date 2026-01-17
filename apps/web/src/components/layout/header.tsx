import Link from 'next/link';

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">Office Detective</span>
        </Link>
        <nav className="ml-auto flex items-center space-x-4">
          <Link
            href="/cases"
            className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
          >
            Cases
          </Link>
        </nav>
      </div>
    </header>
  );
}
