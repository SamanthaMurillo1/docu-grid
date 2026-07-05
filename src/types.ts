export interface LineItem {
  id: string;
  name: string;
  quantity: number | null;
  price: number | null;
}

export interface ExtractedData {
  storeName: string | null;
  date: string | null;
  subtotal: number | null;
  tax: number | null;
  category: ExpenseCategory | null;
  total: number | null;
  items: LineItem[];
}

export interface MappedField {
  extractedKey: string;
  excelColumn: string;
}

export interface MappingTemplate {
  id: string;
  name: string;
  fields: MappedField[];
  createdAt: number;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  fileName: string;
  uploadedAt: number;
  data: ExtractedData;
}

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Restaurants & Dining",
  "Coffee & Cafes",
  "Transportation",
  "Fuel & Gas",
  "Travel & Lodging",
  "Clothing & Apparel",
  "Electronics",
  "Home & Office Supplies",
  "Health & Pharmacy",
  "Personal Care",
  "Entertainment",
  "Subscriptions",
  "Utilities",
  "Insurance",
  "Education",
  "Gifts & Donations",
  "Investments & Savings",
  "Other",
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
