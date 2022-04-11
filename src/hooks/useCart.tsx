import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId)
      const { data } = await api.get(`/stock/${productId}`)
      const stock: Stock = data
      const stockAmount = stock.amount
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1
      if(amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      if(productExists) {
        const updatedCart = cart.map(product => {
          if(product.id === productExists.id) {
            return {
              ...product,
              amount
            }
          }
          return product
        })
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        return
      }
      const productRes = await api.get(`/products/${productId}`)
      const product: Product = {
        ...productRes.data,
        amount: 1
      }
      const updatedCart = [...cart, product]
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findedProduct = cart.find(product => product.id === productId)
      if(!findedProduct) {
        throw new Error('Erro na remoção do produto')
      }
      const updatedCart = cart.filter(product => product.id !== productId)
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount === 0) {
        return
      }
      const { data } = await api.get(`/stock/${productId}`)
      const productInStock: { id: number, amount: number } = data
      if((productInStock.amount - amount) <= 0) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }
      const updatedCart = cart.map(product => {
        if(product.id === productId) {
          return {
            ...product,
            amount
          }
        }
        return product
      })
      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
