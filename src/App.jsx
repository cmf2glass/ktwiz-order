import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';
import menuData from './menuData.json';

const SUPABASE_URL = 'https://lcfkvkxirslvpozqeyyf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Bf7gy63pXShqJ8Uxyf2s_Q_wZyYYjrT';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [page, setPage] = useState('name'); // 'name', 'menu', 'summary'
  const [myCart, setMyCart] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [stores] = useState(menuData.data.list);

  // 세션 ID 생성
  useEffect(() => {
    const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    setSessionId(id);
  }, []);

  // 실시간 주문 구독
  useEffect(() => {
    if (!sessionId) return;

    const subscription = supabase
      .from('orders')
      .on('*', (payload) => {
        loadAllOrders();
      })
      .subscribe();

    loadAllOrders();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  const loadAllOrders = async () => {
    const { data } = await supabase.from('orders').select('*');
    setAllOrders(data || []);
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setPage('menu');
    }
  };

  const addToCart = async (store, product, quantity) => {
    if (quantity <= 0) return;

    const cartItem = {
      session_id: sessionId,
      user_name: userName,
      store_id: store.store_id,
      store_name: store.store_name,
      product_id: product.store_product_id,
      product_name: product.store_product_name,
      product_image: product.store_product_image_medium,
      product_price: product.store_product_price,
      quantity: quantity,
    };

    // 내 장바구니에 추가
    setMyCart([...myCart, cartItem]);

    // Supabase에 저장
    await supabase.from('orders').insert([cartItem]);
  };

  const removeFromMyCart = (index) => {
    setMyCart(myCart.filter((_, i) => i !== index));
  };

  // 페이지별 렌더링
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

  if (page === 'menu') {
    return (
      <div className="menu-page">
        <div className="menu-header">
          <h1>KT Wiz Park 🏟️</h1>
          <p>안녕하세요, {userName}님!</p>
          <button
            onClick={() => setPage('summary')}
            className="btn-summary"
          >
            📋 주문 확인 ({myCart.length})
          </button>
        </div>

        <div className="stores-grid">
          {stores.map((store) => (
            <StoreCard
              key={store.store_id}
              store={store}
              onAddProduct={addToCart}
            />
          ))}
        </div>
      </div>
    );
  }

  if (page === 'summary') {
    const groupedOrders = {};
    allOrders.forEach((order) => {
      if (!groupedOrders[order.user_name]) {
        groupedOrders[order.user_name] = [];
      }
      groupedOrders[order.user_name].push(order);
    });

    return (
      <div className="summary-page">
        <div className="summary-header">
          <h1>📋 주문 현황</h1>
          <button
            onClick={() => setPage('menu')}
            className="btn-back"
          >
            ◀ 메뉴로
          </button>
        </div>

        <div className="summary-content">
          {Object.entries(groupedOrders).map(([name, orders]) => (
            <div key={name} className="person-section">
              <h3>{name}</h3>
              {orders.map((order, idx) => (
                <div key={idx} className="order-item">
                  <div className="order-info">
                    <strong>{order.product_name}</strong>
                    <span className="order-store">{order.store_name}</span>
                  </div>
                  <div className="order-qty">
                    x{order.quantity}
                  </div>
                  <div className="order-price">
                    ₩{order.product_price * order.quantity}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="summary-footer">
          <p>💰 총액: ₩{allOrders.reduce((sum, o) => sum + o.product_price * o.quantity, 0)}</p>
        </div>
      </div>
    );
  }
}

function StoreCard({ store, onAddProduct }) {
  const [expanded, setExpanded] = useState(false);
  const [quantities, setQuantities] = useState({});

  const handleAddClick = (product) => {
    const qty = quantities[product.store_product_id] || 1;
    onAddProduct(store, product, qty);
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
          {store.store_product_list.map((product) => (
            <ProductCard
              key={product.store_product_id}
              product={product}
              quantity={quantities[product.store_product_id] || 1}
              onQuantityChange={(qty) =>
                setQuantities({
                  ...quantities,
                  [product.store_product_id]: qty,
                })
              }
              onAdd={() => handleAddClick(product)}
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
      />
      <div className="product-info">
        <h4>{product.store_product_name}</h4>
        <p className="product-price">₩{product.store_product_price}</p>
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
