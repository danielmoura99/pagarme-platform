// types/index.ts
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "affiliate" | "customer";
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  userId: string;
  document?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Affiliate {
  id: string;
  userId: string;
  commission: number;
  active: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bankInfo?: any;
  createdAt: Date;
  updatedAt: Date;
}
