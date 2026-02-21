import Header from '../components/Header';

export default function HomePage() {
  const handleGetStarted = () => {
    // navigate to onboarding
  };

  return (
    <main>
      <Header />
      <section>
        <h1>Welcome to the App</h1>
        <p>Get started by exploring our features.</p>
        <button data-agent-id="get-started.button" onClick={handleGetStarted}>
          Get started
        </button>
        <input data-agent-id="search.input" placeholder="Search..." />
        <a data-agent-id="learn-more.a" href="/docs">
          Learn more
        </a>
      </section>
    </main>
  );
}
