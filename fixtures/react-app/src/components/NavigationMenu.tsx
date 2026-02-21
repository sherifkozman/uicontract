export default function NavigationMenu() {
  const handleLogout = () => {
    // logout logic
  };

  return (
    <nav>
      <a href="/">Home</a>
      <a href="/settings">Settings</a>
      <button onClick={handleLogout}>Log out</button>
    </nav>
  );
}
