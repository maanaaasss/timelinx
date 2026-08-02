import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-fd-background text-fd-foreground flex flex-col items-center justify-center px-6">
      <p className="text-6xl font-bold tracking-tight mb-4">404</p>
      <p className="text-lg text-fd-muted-foreground mb-8">This page could not be found.</p>
      <Link
        href="/docs"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-fd-primary text-fd-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Back to Docs
      </Link>
    </div>
  );
}
