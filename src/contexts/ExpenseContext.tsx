
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface ExpenseContextType {
  expenses: Expense[];
  categories: ExpenseCategory[];
  addExpense: (expense: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  loading: boolean;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};

const defaultCategories: ExpenseCategory[] = [
  { id: '1', name: 'Food & Dining', color: '#FF6B6B', icon: '🍽️' },
  { id: '2', name: 'Transportation', color: '#4ECDC4', icon: '🚗' },
  { id: '3', name: 'Shopping', color: '#45B7D1', icon: '🛍️' },
  { id: '4', name: 'Entertainment', color: '#96CEB4', icon: '🎬' },
  { id: '5', name: 'Bills & Utilities', color: '#FFEAA7', icon: '⚡' },
  { id: '6', name: 'Healthcare', color: '#DDA0DD', icon: '🏥' },
  { id: '7', name: 'Education', color: '#98D8C8', icon: '📚' },
  { id: '8', name: 'Travel', color: '#F7DC6F', icon: '✈️' },
  { id: '9', name: 'Income', color: '#58D68D', icon: '💰' },
  { id: '10', name: 'Other', color: '#AEB6BF', icon: '📦' }
];

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>(defaultCategories);
  const [loading, setLoading] = useState(false);

  // Load user-specific expenses from localStorage
  useEffect(() => {
    if (user) {
      const userExpenses = localStorage.getItem(`expenser_expenses_${user.uid}`);
      if (userExpenses) {
        setExpenses(JSON.parse(userExpenses));
      } else {
        // Add some demo data for new users
        const demoExpenses: Expense[] = [
          {
            id: '1',
            userId: user.uid,
            amount: 25.50,
            description: 'Lunch at restaurant',
            category: 'Food & Dining',
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            tags: ['restaurant', 'lunch'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            userId: user.uid,
            amount: 3000.00,
            description: 'Monthly salary',
            category: 'Income',
            date: new Date().toISOString().split('T')[0],
            type: 'income',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '3',
            userId: user.uid,
            amount: 120.00,
            description: 'Electricity bill',
            category: 'Bills & Utilities',
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            type: 'expense',
            tags: ['utilities', 'monthly'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        setExpenses(demoExpenses);
        localStorage.setItem(`expenser_expenses_${user.uid}`, JSON.stringify(demoExpenses));
      }
    }
  }, [user]);

  const saveExpenses = (newExpenses: Expense[]) => {
    if (user) {
      localStorage.setItem(`expenser_expenses_${user.uid}`, JSON.stringify(newExpenses));
    }
  };

  const addExpense = (expenseData: Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedExpenses = [...expenses, newExpense];
    setExpenses(updatedExpenses);
    saveExpenses(updatedExpenses);
  };

  const updateExpense = (id: string, expenseData: Partial<Expense>) => {
    const updatedExpenses = expenses.map(expense =>
      expense.id === id
        ? { ...expense, ...expenseData, updatedAt: new Date().toISOString() }
        : expense
    );
    setExpenses(updatedExpenses);
    saveExpenses(updatedExpenses);
  };

  const deleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    setExpenses(updatedExpenses);
    saveExpenses(updatedExpenses);
  };

  const addCategory = (categoryData: Omit<ExpenseCategory, 'id'>) => {
    const newCategory: ExpenseCategory = {
      ...categoryData,
      id: Date.now().toString()
    };
    setCategories([...categories, newCategory]);
  };

  const value = {
    expenses,
    categories,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    loading
  };

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
};
