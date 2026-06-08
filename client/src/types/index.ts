export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  title: string;
  description: string;
  template: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isPreset: boolean;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface CreatePortfolioRequest {
  title: string;
  description: string;
  template: string;
}

export interface UpdatePortfolioRequest {
  title?: string;
  description?: string;
  template?: string;
  published?: boolean;
}
