export default function Header() {
  const handleSignOut = () => {
    // sign out logic
  };

  return (
    <nav>
      <a data-agent-id="header.home.a" href="/">
        Home
      </a>
      <a data-agent-id="header.settings.a" href="/settings">
        Settings
      </a>
      <button data-agent-id="header.sign-out.button" onClick={handleSignOut}>
        Sign out
      </button>
    </nav>
  );
}
