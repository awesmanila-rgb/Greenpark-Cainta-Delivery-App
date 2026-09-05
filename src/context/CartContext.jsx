import { createContext, useContext, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [merchantId, setMerchantId] = useState(null)
  const [merchantName, setMerchantName] = useState(null)
  const [items, setItems] = useState([]) // { productId, name, price, unit, qty, photoUrl, stockQty }

  function addItem(merchant, product) {
    // Cart is scoped to one merchant at a time (matches how pickup works —
    // a rider collects from a single shop per delivery).
    if (merchantId && merchantId !== merchant.id) {
      const confirmed = window.confirm(
        `Your cart has items from ${merchantName}. Start a new cart for ${merchant.shopName} instead?`
      )
      if (!confirmed) return
      setItems([])
    }

    setMerchantId(merchant.id)
    setMerchantName(merchant.shopName)

    setItems((list) => {
      const existing = list.find((i) => i.productId === product.id)
      if (existing) {
        return list.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      }
      return [
        ...list,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          qty: 1,
          photoUrl: product.photo_url,
          stockQty: product.stock_qty,
        },
      ]
    })
  }

  function updateQty(productId, qty) {
    if (qty <= 0) {
      setItems((list) => list.filter((i) => i.productId !== productId))
      return
    }
    setItems((list) => list.map((i) => (i.productId === productId ? { ...i, qty } : i)))
  }

  function removeItem(productId) {
    setItems((list) => list.filter((i) => i.productId !== productId))
  }

  function clearCart() {
    setItems([])
    setMerchantId(null)
    setMerchantName(null)
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  const value = {
    merchantId,
    merchantName,
    items,
    subtotal,
    addItem,
    updateQty,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
