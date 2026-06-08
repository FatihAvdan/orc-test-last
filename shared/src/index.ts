export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
}

export type AsyncHandler<T = void> = () => Promise<T>;

export interface HealthStatus {
  status: "ok" | "degraded" | "down";
  uptime: number;
  timestamp: string;
  services: {
    database: "connected" | "disconnected";
    redis: "connected" | "disconnected";
  };
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

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  isPreset: boolean;
  createdAt: string;
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

export interface ThemePreset {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
}

export interface ProjectData {
  id: string;
  portfolioId: string;
  title: string;
  description?: string;
  url?: string;
  image?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CVSectionData {
  id: string;
  userId: string;
  bio?: string;
  skills: CVSkill[];
  experience: CVExperience[];
  education: CVEducation[];
  createdAt: string;
  updatedAt: string;
}

export interface CVSkill {
  name: string;
  level: number;
}

export interface CVExperience {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface CVEducation {
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
}

export interface SocialLinkData {
  id: string;
  userId: string;
  platform: string;
  url: string;
  label?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
  portfolioSlug?: string;
}

export interface PostData {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  isPublished: boolean;
  publishedAt?: string;
  tags: PostTag[];
  createdAt: string;
  updatedAt: string;
}

export interface PostTag {
  id: string;
  name: string;
  slug: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  isPublished?: boolean;
  tags?: string[];
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  topPage: string;
  todayViews: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface PageCount {
  path: string;
  count: number;
}

export interface ReferrerCount {
  referrer: string;
  count: number;
}

export interface ExportOptions {
  includeProjects?: boolean;
  includeCV?: boolean;
  theme?: string;
}

export interface PublicPortfolio {
  id: string;
  slug: string;
  title: string;
  description: string;
  template: string;
  theme: string;
  projects?: ProjectData[];
  cv?: CVSectionData;
  socialLinks?: SocialLinkData[];
  customDomain?: string;
}
