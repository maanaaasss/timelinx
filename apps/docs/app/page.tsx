import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">WebPacked Timeline</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Professional NLE timeline engine for the web.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/docs"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
