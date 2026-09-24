import Link from 'next/link';
import DinoGame from '../components/DinoGame';

export default function NotFound() {
  return <main className="not-found-page">
    <h1>404. A little off the path.</h1>
    <p>This page isn’t here. Stay for a jump, or find your way back.</p>
    <div className="not-found-game"><DinoGame/></div>
    <Link href="/" className="not-found-home">Back to search</Link>
  </main>;
}
