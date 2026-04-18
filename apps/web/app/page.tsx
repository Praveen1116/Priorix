export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      
      <h1 className="text-4xl font-bold mb-4">
        Priorix 🚀
      </h1>

      <p className="text-lg mb-6 text-gray-600">
        Smart task reminders that actually work
      </p>

      <a
        href="/login"
        className="bg-black text-white px-6 py-3 rounded-lg"
      >
        Start Now
      </a>

    </main>
  );
}