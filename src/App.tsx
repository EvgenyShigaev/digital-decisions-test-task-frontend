import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

type Item = {
  id: number;
  name: string;
};

type ListItemProps = {
  item: Item;
  selected: Set<number>;
  onToggleSelect: (id: number) => void;
  onDragStart: (id: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: number) => void;
};

const ListItem: React.FC<ListItemProps> = React.memo(
  ({ item, selected, onToggleSelect, onDragStart, onDragOver, onDrop }) => {
    return (
      <div
        data-id={item.id}
        draggable
        onDragStart={() => onDragStart(item.id)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, item.id)}
        style={{
          padding: '8px',
          border: '1px solid #ccc',
          background: '#fff',
          marginBottom: '4px',
          cursor: 'move',
        }}
      >
        <input
          type="checkbox"
          checked={selected.has(item.id)}
          onChange={() => onToggleSelect(item.id)}
        />
        {item.name}
      </div>
    );
  }
);

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [originalItems, setOriginalItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const dragItem = useRef<number | null>(null);

  const api = axios.create({
    baseURL: 'https://digital-decisions-test-task.onrender.com',
  });

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    api
      .get(`/items?page=${page}&query=${query}`)
      .then((res) => {
        setItems((prev) =>
          page === 1 ? res.data.items : [...prev, ...res.data.items]
        );
        setOriginalItems(res.data.items);
        setSelected(new Set(res.data.selected));
      })
      .catch((error) => {
        console.error('Ошибка загрузки данных:', error);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }, [api, page, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const handleScroll = () => {
    if (listRef.current && !loadingRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = listRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 10) {
        setPage((prev) => prev + 1);
      }
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelected((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }

      api.post('/save-selection', {
        selected: Array.from(newSet),
      });

      return newSet;
    });
  };

  const handleDragStart = (id: number) => {
    dragItem.current = id;
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    const draggedItemId = dragItem.current;
    if (draggedItemId === null || draggedItemId === targetId) return;

    const draggedItemIndex = items.findIndex(
      (item) => item.id === draggedItemId
    );
    const targetItemIndex = items.findIndex((item) => item.id === targetId);
    if (draggedItemIndex === -1 || targetItemIndex === -1) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedItemIndex, 1);
    newItems.splice(targetItemIndex, 0, movedItem);

    setItems(newItems);

    api.post('/save-order', {
      order: newItems.map((item) => item.id),
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setQuery(query);
    setPage(1);

    if (!query) {
      setItems(originalItems);
    }
  };

  return (
    <div>
      <h1>Список элементов</h1>
      <input
        type="text"
        placeholder="Поиск..."
        value={query}
        onChange={handleSearchChange}
      />
      <div
        ref={listRef}
        style={{ height: '450px', overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <ListItem
            key={`${item.id}-${index}`}
            item={item}
            selected={selected}
            onToggleSelect={handleToggleSelect}
            onDragStart={handleDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
