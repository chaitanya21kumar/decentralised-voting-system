import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

interface UseAuthOptions {
  redirectTo?: string;
  role?: 'voter' | 'admin';
}

export function useAuth(options: UseAuthOptions = {}) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  const { redirectTo, role = 'voter' } = options;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const endpoint = role === 'admin' ? '/api/admin/me' : '/api/voter/me';
        const response = await axios.get(endpoint);
        
        if (response.data.authenticated) {
          setAuthenticated(true);
          setUser(response.data);
        } else {
          setAuthenticated(false);
          if (redirectTo) {
            router.push(redirectTo);
          }
        }
      } catch (error) {
        setAuthenticated(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [role, redirectTo, router]);

  const logout = async () => {
    try {
      const endpoint = role === 'admin' ? '/api/admin/logout' : '/api/voter/logout';
      await axios.post(endpoint);
      setAuthenticated(false);
      setUser(null);
      router.push(role === 'admin' ? '/admin' : '/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    loading,
    authenticated,
    user,
    logout
  };
}

export function useVoterAuth(redirectTo: string = '/signin') {
  return useAuth({ redirectTo, role: 'voter' });
}

export function useAdminAuth(redirectTo: string = '/admin') {
  return useAuth({ redirectTo, role: 'admin' });
}
