export default function Footer() {
  return (
    <footer className="border-t bg-surface py-6">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-text-secondary sm:px-6">
        &copy; {new Date().getFullYear()} Receptenboek. Alle rechten voorbehouden.
      </div>
    </footer>
  );
}
