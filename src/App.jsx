import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

const SUPABASE_URL = 'https://lcfkvkxirslvpozqeyyf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Bf7gy63pXShqJ8Uxyf2s_Q_wZyYYjrT';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [userName, setUserName] = useState('');
  const [page, setPage] = useState('loading');
  const [allOrders, setAllOrders] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    const init = async () => {
      // 메뉴 데이터 로드
      try {
        const response = await fetch('/menuData.json');
        const data = await response.json();
        setStores(data.data.list);
      } catch (error) {
        console.error('메뉴 로드 실패:', error);
      }

      // 저장된 이름 불러오기
      const savedName = localStorage.getItem('ktwiz_user_name');
      if (savedName) {
        setUserName(savedName);
        setPage('menu');
      } else {
        setPage('name');
      }

      // Supabase 실시간 구독
      loadAllOrders();
      subscribeToOrders();
      setLoading(false);
    };
    init();

    return () => {
      // cleanup
    };
  }, []);

  const loadAllOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('주문 로드 실패:', error);
      } else {
        setAllOrders(data || []);
      }
    } catch (error) {
      console.error('Supabase 연결 실패:', error);
    }
  };

  const subscribeToOrders = () => {
    try {
      const subscription = supabase
        .channel('public:orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
          loadAllOrders();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('실시간 구독 실패:', error);
    }
  };

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      localStorage.setItem('ktwiz_user_name', userName);
      setPage('menu');
    }
  };

  const changeUserName = () => {
    localStorage.removeItem('ktwiz_user_name');
    setUserName('');
    setPage('name');
  };

  const addOrder = async (store, product, quantity) => {
    if (quantity <= 0 || !userName) return;

    const newOrder = {
      session_id: 'shared_session',
      user_name: userName,
      store_id: store.store_id,
      store_name: store.store_name,
      product_id: product.store_product_id,
      product_name: product.store_product_name,
      product_image: product.store_product_image_medium,
      product_price: product.store_product_price,
      quantity: quantity
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([newOrder]);
      
      if (error) {
        console.error('주문 저장 실패:', error);
        alert('주문 저장 실패: ' + error.message);
      } else {
        loadAllOrders();
      }
    } catch (error) {
      console.error('Supabase 저장 실패:', error);
    }
  };

  const removeOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('삭제 실패:', error);
      } else {
        loadAllOrders();
      }
    } catch (error) {
      console.error('Supabase 삭제 실패:', error);
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm('모든 주문을 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .neq('id', -1); // 모든 행 삭제

      if (error) {
        console.error('전체 삭제 실패:', error);
      } else {
        loadAllOrders();
      }
    } catch (error) {
      console.error('Supabase 삭제 실패:', error);
    }
  };

  // 로딩
  if (loading) {
    return (
      <div className="container loading-page">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>로딩 중...</h2>
        </div>
      </div>
    );
  }

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
          <div className="header-buttons">
            <button className="btn-summary" onClick={() => setPage('summary')}>
              📋 주문 확인 ({allOrders.length})
            </button>
            <button className="btn-change-user" onClick={changeUserName}>
              👤 이름 변경
            </button>
          </div>
        </div>

        <div className="stores-grid">
          {stores.map((store) => (
            <StoreCard
              key={store.store_id}
              store={store}
              onAddOrder={addOrder}
            />
          ))}
        </div>
      </div>
    );
  }

  // 주문 확인 페이지
  if (page === 'summary') {
    const groupedOrders = {};
    allOrders.forEach((order) => {
      if (!groupedOrders[order.user_name]) {
        groupedOrders[order.user_name] = [];
      }
      groupedOrders[order.user_name].push(order);
    });

    const total = allOrders.reduce((sum, order) => sum + order.product_price * order.quantity, 0);

    return (
      <div className="summary-page">
        <div className="summary-header">
          <h1>📋 전체 주문 현황</h1>
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
                      <div className="order-info">
                        <strong>{order.product_name}</strong>
                        <span className="order-store">{order.store_name}</span>
                      </div>
                      <div className="order-details">
                        <span className="qty">x{order.quantity}</span>
                        <span className="price">₩{(order.product_price * order.quantity).toLocaleString()}</span>
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
