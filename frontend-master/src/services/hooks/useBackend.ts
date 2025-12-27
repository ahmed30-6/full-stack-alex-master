/*
// src/hooks/useBackend.ts
import { useState, useEffect , API_BASE} from 'react';
import { apiService, HealthResponse } from '../apiService';

// في useBackend.ts بدل process.env
const API_BASE = "http://127.0.0.1:/api";


export const useBackend = () => {
  
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  
  // في useBackend.ts، ضيف:
  useEffect(() => {
  console.log("API_BASE:", API_BASE);
  checkConnection();
  }, []);

  
  // التحقق من اتصال الباك اند
const checkConnection = async (): Promise<void> => {
  try {
    setLoading(true);
    setError(null);
    
    console.log("🔍 Checking backend connection...");
    
    const healthData = await apiService.checkHealth();
    
    setHealth(healthData);
    setIsConnected(true);
    console.log("✅ Success:", healthData);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to connect to backend';
    setError(errorMessage);
    setIsConnected(false);
    console.log("❌ Error:", errorMessage);
  } finally {
    setLoading(false);
  }
};
  // التحقق من الاتصال تلقائياً عند تحميل المكون
  useEffect(() => {
    checkConnection();
  }, []);

  return {
    isConnected,
    loading,
    error,
    health,
    checkConnection
  };
};
*/

// src/hooks/useBackend.ts
// نسخة مبسطة بدون أي تحقق من الباك-إند

export const useBackend = () => {
  // نرجع object فارغ أو أي وظائف مستقبلية محتاجها
  return {};
};
