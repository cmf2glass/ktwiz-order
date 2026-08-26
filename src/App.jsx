import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [userName, setUserName] = useState('');
  const [page, setPage] = useState('name'); // 'name', 'menu', 'summary'
  const [myOrders, setMyOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 메뉴 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/menuData.json');
        const data = await response.json();
        setStores(data.data.list);
        setLoading(false);
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setPage('menu');
    }
  };

  const addOrder = (store, product, quantity) => {
    if (quantity <= 0) return;
    
    const newOrder = {
      id: Date.now(),
      userName,
      storeName: store.store_name,
      productName: product.store_product_name,
      productImage: product.store_product_image_medium || product.store_product_image,
      price: product.store_product_price,
      quantity
    };
    
    setMyOrders([...myOrders, newOrder]);
  };

  const removeOrder = (id) => {
    setMyOrders(myOrders.filter(order => order.id !== id));
  };

  // 이름 입력 페이지
  if (page === 'name') {
    return (
      <div className="container name-page">
        <div className="name-box">
          <h1>🎉 야구장 음식 주문</h1>
          <p>당신의 이름을 입력해주세요</p>
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="name-input"
              autoFocus
            />
            <button type="submit" className="btn-primary">
              시작하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 메뉴 페이지
  if (page === 'menu') {
    return (
      <div className="menu-page">
        <div className="menu-header">
          <h1>🏟️ KT Wiz Park</h1>
          <p>안녕하세요, <strong>{userName}</strong>님!</p>
          <button className="btn-summary" onClick={() => setPage('summary')}>
            📋 주문 확인 ({myOrders.length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</div>
        ) : (
          <div className="stores-grid">
            {stores.map((store) => (
              <StoreCard
                key={store.store_id}
                store={store}
                onAddOrder={addOrder}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 주문 확인 페이지
  if (page === 'summary') {
    const total = myOrders.reduce((sum, order) => sum + order.price * order.quantity, 0);

    return (
      <div className="summary-page">
        <div className="summary-header">
          <h1>📋 내 주문</h1>
          <button className="btn-back" onClick={() => setPage('menu')}>
            ◀ 메뉴로
          </button>
        </div>

        <div className="summary-content">
          {myOrders.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              주문한 음식이 없습니다
            </p>
          ) : (
            myOrders.map((order) => (
              <div key={order.id} className="order-item">
                <img src={order.productImage} alt={order.productName} className="order-image" />
                <div className="order-info">
                  <strong>{order.productName}</strong>
                  <span className="order-store">{order.storeName}</span>
                </div>
                <div className="order-details">
                  <span>x{order.quantity}</span>
                  <span className="order-price">₩{order.price * order.quantity}</span>
                  <button className="btn-delete" onClick={() => removeOrder(order.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {myOrders.length > 0 && (
          <div className="summary-footer">
            <p>💰 총액: <strong>₩{total.toLocaleString()}</strong></p>
          </div>
        )}
      </div>
    );
  }
}

function StoreCard({ store, onAddOrder }) {
  const [expanded, setExpanded] = useState(false);
  const [quantities, setQuantities] = useState({});

  const handleAdd = (product) => {
    const qty = quantities[product.store_product_id] || 1;
    onAddOrder(store, product, qty);
    setQuantities({ ...quantities, [product.store_product_id]: 1 });
  };

  return (
    <div className="store-card">
      <div className="store-header" onClick={() => setExpanded(!expanded)}>
        <img src={store.store_logo} alt={store.store_name} className="store-logo" />
        <div className="store-info">
          <h3>{store.store_name}</h3>
          <p>{store.store_message}</p>
        </div>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && (
        <div className="store-products">
          {store.store_product_list?.map((product) => (
            <ProductCard
              key={product.store_product_id}
              product={product}
              quantity={quantities[product.store_product_id] || 1}
              onQuantityChange={(qty) =>
                setQuantities({ ...quantities, [product.store_product_id]: qty })
              }
              onAdd={() => handleAdd(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, quantity, onQuantityChange, onAdd }) {
  return (
    <div className="product-card">
      <img
        src={product.store_product_image_medium || 'https://via.placeholder.com/150'}
        alt={product.store_product_name}
        className="product-image"
        onError={(e) => {
          e.target.src = 'https://via.placeholder.com/150';
        }}
      />
      <div className="product-info">
        <h4>{product.store_product_name}</h4>
        <p className="product-price">₩{product.store_product_price?.toLocaleString()}</p>
      </div>
      <div className="product-controls">
        <div className="quantity-control">
          <button onClick={() => onQuantityChange(Math.max(1, quantity - 1))}>−</button>
          <span>{quantity}</span>
          <button onClick={() => onQuantityChange(quantity + 1)}>+</button>
        </div>
        <button onClick={onAdd} className="btn-add">
          담기
        </button>
      </div>
    </div>
  );
}
