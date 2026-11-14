import Link from "next/link";
export default function NotFound() {
  return (
    <div className="loading-state">
      <h1>A small detour.</h1>
      <p>This page isn’t on your itinerary.</p>
      <Link className="btn btn-primary" href="/app">
        Back to your overview
      </Link>
    </div>
  );
}
