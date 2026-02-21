import LoginForm from '../components/LoginForm';
import SearchBar from '../components/SearchBar';

export default function HomePage() {
  return (
    <main>
      <h1>Welcome</h1>
      <SearchBar />
      <LoginForm />
    </main>
  );
}
