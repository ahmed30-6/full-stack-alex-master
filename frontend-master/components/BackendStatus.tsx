// src/components/BackendStatus.tsx
/*import React from 'react';
import { useBackend } from '../src/services/hooks/useBackend';

const BackendStatus: React.FC = () => {
  const { isConnected, loading, error, health, checkConnection } = useBackend();

  return (
    <div style={{ 
      padding: '10px', 
      margin: '10px 0',
      border: '2px solid ' + (isConnected ? 'green' : 'red'),
      borderRadius: '5px',
      backgroundColor: isConnected ? '#f0fff0' : '#fff0f0'
    }}>
      <h3>حالة الخادم الخلفي (Backend)</h3>
      
      {loading && <p>🔄 جاري التحقق من الاتصال...</p>}
      
      {error && (
        <div>
          <p style={{ color: 'red' }}>❌ خطأ: {error}</p>
          <button onClick={checkConnection}>🔄 إعادة المحاولة</button>
        </div>
      )}
      
      {isConnected && health && (
        <div style={{ color: 'green' }}>
          <p>✅ متصل بالخادم الخلفي</p>
          <p>📊 حالة قاعدة البيانات: {health.database}</p>
          <p>💬 الرسالة: {health.message}</p>
        </div>
      )}
      
      {!loading && !error && !isConnected && (
        <p>⚠ لم يتم الاتصال بالخادم الخلفي بعد</p>
      )}
    </div>
  );
};

export default BackendStatus;*/