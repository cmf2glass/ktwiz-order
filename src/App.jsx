import React, { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [userName, setUserName] = useState('');
  const [page, setPage] = useState('name');
  const [allOrders, setAllOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    loadMenuData();
    loadAllOrders();
  }, []);

  const loadMenuData = async () => {
    try {
      const response = await fetch('/menuData.json');
      const data = await response.json();
      setStores(data.data.list);
    } catch (error) {
      console.error('메뉴 로드 실패:', error);
    }
    setLoading(false);
  };

  const loadAllOrders = () => {
    const saved = localStorage.getItem('ktwiz_all_orders');
    if (saved) {
      try {
        setAllOrders(JSON.parse(saved));
      } catch (e) {
        console.error('주문 로드 실패:', e);
      }
    }
  };

  const saveAllOrders = (orders) => {
    localStorage.setItem('ktwiz_all_orders', JSON.stringify(orders));
    setAllOrders(orders);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setPage('menu');
    }
  };

  const addOrder = (store, product, quantity) => {
    if (quantity <= 0) return;

    const newOrder = {
      id: Date.now() + Math.random(),
      userName,
      storeName: store.store_name,
      productName: product.store_product_name,
      productImage: product.store_product_image_medium || product.store_product_image,
      price: product.store_product_price,
      quantity,
      timestamp: new Date().getTime()
    };

    const updated = [...allOrders, newOrder];
    saveAllOrders(updated);
  };

  const removeOrder = (id) => {
    const updated = allOrders.filter(order => order.id !== id);
    saveAllOrders(updated);
  };

  const clearAllOrders = () => {
    if (window.confirm('모든 주문을 삭제하시겠습니까?')) {
      saveAllOrders([]);
    }
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
          {allOrders.length > 0 && (
            <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
              💾 저장된 주문: {allOrders.length}개
            </p>
          )}
        </div>
      </div>
    );
  }

  // 메뉴 페이지
  if (page === 'menu') {
    return (
      <div className="menu-page">
        <div className="menu-header">
          <div className="header-top">
            <h1>🏟️ KT Wiz Park</h1>
            <p>안녕하세요, <strong>{userName}</strong>님!</p>
          </div>
          <button className="btn-summary" onClick={() => setPage('summary')}>
            📋 주문 확인 ({allOrders.length})
          </button>
        </div>

        {loading ? (
          <div className="loading">로딩 중...</div>
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
    const groupedOrders = {};
    allOrders.forEach((order) => {
      if (!groupedOrders[order.userName]) {
        groupedOrders[order.userName] = [];
      }
      groupedOrders[order.userName].push(order);
    });

    const total = allOrders.reduce((sum, order) => sum + order.price * order.quantity, 0);

    return (
      <div className="summary-page">
        <div className="summary-header">
          <h1>📋 전체 주문</h1>
          <div className="summary-buttons">
            <button className="btn-back" onClick={() => setPage('menu')}>
              ◀ 메뉴로
            </button>
            {allOrders.length > 0 && (
              <button className="btn-clear" onClick={clearAllOrders}>
                🗑️ 전체 삭제
              </button>
            )}
          </div>
        </div>

        <div className="summary-content">
          {allOrders.length === 0 ? (
            <p className="no-orders">주문한 음식이 없습니다</p>
          ) : (
            <>
              {Object.entries(groupedOrders).map(([name, orders]) => (
                <div key={name} className="person-section">
                  <h3>{name}</h3>
                  {orders.map((order) => (
                    <div key={order.id} className="order-item">
                      <img 
                        src={order.productImage} 
                        alt={order.productName} 
                        className="order-image"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60?text=이미지';
                        }}
                      />
                      <div className="order-info">
                        <strong>{order.productName}</strong>
                        <span className="order-store">{order.storeName}</span>
                      </div>
                      <div className="order-details">
                        <span className="qty">x{order.quantity}</span>
                        <span className="price">₩{(order.price * order.quantity).toLocaleString()}</span>
                        <button 
                          className="btn-delete" 
                          onClick={() => removeOrder(order.id)}
                          title="삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {allOrders.length > 0 && (
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
        src={product.store_product_image_medium || product.store_product_image || 'https://via.placeholder.com/150'}
        alt={product.store_product_name}
        className="product-image"
        onError={(e) => {
          e.target.src = 'https://via.placeholder.com/150?text=이미지';
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
