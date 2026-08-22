import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true, // Untuk mengirim cookie refreshToken
});

// Interceptor untuk menyisipkan accessToken ke setiap request
api.interceptors.request.use((config) => {
  // Access token akan disisipkan secara dinamis dari AuthContext
  return config;
});
