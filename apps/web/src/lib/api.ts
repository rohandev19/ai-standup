import axios from 'axios';

export const api = axios.create({
  // Use Next.js rewrite proxy to avoid CORS/Network errors in browser
  baseURL: process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : '/api',
  withCredentials: true, // Untuk mengirim cookie refreshToken
});

// Interceptor untuk menyisipkan accessToken ke setiap request
api.interceptors.request.use((config) => {
  // Access token akan disisipkan secara dinamis dari AuthContext
  return config;
});
