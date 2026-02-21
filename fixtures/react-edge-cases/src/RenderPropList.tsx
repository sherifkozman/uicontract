interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function RenderPropList<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, index) => <li key={index}>{renderItem(item)}</li>)}</ul>;
}

export default function ItemList() {
  const handleSelect = (id: string) => {};

  return (
    <RenderPropList
      items={[{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }]}
      renderItem={(item) => (
        <button onClick={() => handleSelect(item.id)}>{item.name}</button>
      )}
    />
  );
}
