import { notFound } from 'next/navigation';

// Unknown paths under /en or /nl render the localized 404.
export default function CatchAll() {
  notFound();
}
