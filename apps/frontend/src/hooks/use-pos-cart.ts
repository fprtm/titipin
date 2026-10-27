import { useState, useCallback, useMemo } from 'react';
import type { ProductItem, CustomerItem } from '@titipin/shared';

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

export function isCustomerBirthdayToday(birthDateStr?: string | null): boolean {
  if (!birthDateStr) return false;
  try {
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const parts = birthDateStr.split('-');
    if (parts.length >= 3) {
      return parts[1] === todayMonth && parts[2].slice(0, 2) === todayDay;
    }
  } catch {
    return false;
  }
  return false;
}

export function usePosCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerType, setCustomerTypeState] = useState<'WALK_IN' | 'MEMBER'>('WALK_IN');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);

  const setCustomerType = useCallback((type: 'WALK_IN' | 'MEMBER') => {
    setCustomerTypeState(type);
    if (type === 'WALK_IN') {
      setSelectedCustomer(null);
    }
  }, []);

  const setCustomer = useCallback((customer: CustomerItem | null) => {
    setSelectedCustomer(customer);
    if (customer) {
      setCustomerTypeState('MEMBER');
    }
  }, []);

  const addItem = useCallback((product: ProductItem) => {
    if (product.stock <= 0) return;

    setItems((prevItems) => {
      const existingIdx = prevItems.findIndex((it) => it.product.id === product.id);
      if (existingIdx >= 0) {
        const existing = prevItems[existingIdx];
        if (existing.quantity >= product.stock) {
          return prevItems; // Capped at available stock
        }
        const updated = [...prevItems];
        updated[existingIdx] = {
          ...existing,
          quantity: existing.quantity + 1,
        };
        return updated;
      }
      return [...prevItems, { product, quantity: 1 }];
    });
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prevItems) => {
      if (quantity <= 0) {
        return prevItems.filter((it) => it.product.id !== productId);
      }
      return prevItems.map((it) => {
        if (it.product.id === productId) {
          const clampedQty = Math.min(quantity, it.product.stock);
          return { ...it, quantity: clampedQty };
        }
        return it;
      });
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prevItems) => prevItems.filter((it) => it.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const resetAll = useCallback(() => {
    setItems([]);
    setCustomerTypeState('WALK_IN');
    setSelectedCustomer(null);
  }, []);

  const loadDraft = useCallback(
    (customer: CustomerItem | null, draftItems: CartItem[]) => {
      setItems(draftItems);
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerTypeState('MEMBER');
      } else {
        setSelectedCustomer(null);
        setCustomerTypeState('WALK_IN');
      }
    },
    [],
  );

  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.product.price) * it.quantity, 0);
  }, [items]);

  const isBirthday = useMemo(() => {
    if (customerType !== 'MEMBER' || !selectedCustomer) return false;
    return isCustomerBirthdayToday(selectedCustomer.birthDate || selectedCustomer.birth_date);
  }, [customerType, selectedCustomer]);

  // BR-006: 5% discount capped at Rp 50.000 for member birthday
  const birthdayDiscount = useMemo(() => {
    if (!isBirthday) return 0;
    return Math.min(50000, Math.round(subtotal * 0.05));
  }, [isBirthday, subtotal]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - birthdayDiscount);
  }, [subtotal, birthdayDiscount]);

  const totalItemsCount = useMemo(() => {
    return items.reduce((acc, it) => acc + it.quantity, 0);
  }, [items]);

  return {
    items,
    customerType,
    selectedCustomer,
    subtotal,
    isBirthday,
    birthdayDiscount,
    totalAmount,
    totalItemsCount,
    setCustomerType,
    setCustomer,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    resetAll,
    loadDraft,
  };
}
