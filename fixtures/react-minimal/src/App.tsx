export default function App() {
  return (
    <div>
      <button onClick={() => alert('clicked')}>Click me</button>
      <input type="text" placeholder="Type here" onChange={() => {}} />
      <a href="/about">About</a>
    </div>
  );
}
