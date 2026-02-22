interface Props {
  isAdmin: boolean;
  items: string[];
  showExtra?: boolean;
}

export function ConditionalDynamic({ isAdmin, items, showExtra }: Props) {
  return (
    <div>
      {isAdmin && <button onClick={() => {}}>Admin Panel</button>}
      {isAdmin ? (
        <a href="/admin">Admin Link</a>
      ) : (
        <a href="/user">User Link</a>
      )}
      {items.map((item) => (
        <button key={item} onClick={() => {}}>{item}</button>
      ))}
      {showExtra || <button onClick={() => {}}>Default Action</button>}
      <form onSubmit={() => {}}>
        <input placeholder="Always visible" />
        <button>Submit</button>
      </form>
    </div>
  );
}
