import Link from 'next/link';
import './globals.css';

// Only reached for URLs outside /en and /nl that no route matches.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="container-page py-16">
          <h1 className="text-3xl font-extrabold">Page not found / Pagina niet gevonden</h1>
          <p className="mt-4">
            <Link className="link" href="/en">
              Go to Wanted Level
            </Link>{' '}
            ·{' '}
            <Link className="link" href="/nl" lang="nl-BE">
              Naar Wanted Level
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
