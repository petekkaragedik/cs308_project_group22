import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../../context/CartContext';

// Test component to interact with CartContext
function CartTestComponent() {
  const { cartItems, cartCount, addItem, removeItem, updateItem, clearCart } = useCart();

  return (
    <div>
      <div data-testid="cart-count">{cartCount}</div>
      <div data-testid="cart-items">{JSON.stringify(cartItems)}</div>

      <button onClick={() => addItem(1, 'M')}>Add Item 1 M</button>
      <button onClick={() => addItem(1, 'M')}>Add Item 1 M Again</button>
      <button onClick={() => addItem(2, 'L')}>Add Item 2 L</button>
      <button onClick={() => addItem(3, 'S', 5)}>Add Item 3 S (stock 5)</button>
      <button onClick={() => addItem(4, 'XL', 0)}>Add Item 4 XL (out of stock)</button>

      {cartItems.map((item) => (
        <div key={item.id}>
          <button onClick={() => removeItem(item.id)}>
            Remove {item.product_id} {item.size}
          </button>
          <button onClick={() => updateItem(item.id, item.quantity + 1)}>
            Increase {item.product_id} {item.size}
          </button>
          <button onClick={() => updateItem(item.id, item.quantity - 1)}>
            Decrease {item.product_id} {item.size}
          </button>
          <button onClick={() => updateItem(item.id, 0)}>
            Set Zero {item.product_id} {item.size}
          </button>
        </div>
      ))}

      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initial State', () => {
    test('starts with empty cart', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-items')).toHaveTextContent('[]');
    });

    test('loads cart from localStorage on mount', () => {
      const savedCart = [
        { id: '1_M_123', product_id: 1, size: 'M', quantity: 2 },
        { id: '2_L_456', product_id: 2, size: 'L', quantity: 1 },
      ];
      localStorage.setItem('scylla_cart', JSON.stringify(savedCart));

      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId('cart-count')).toHaveTextContent('3');
      expect(screen.getByTestId('cart-items')).toHaveTextContent(JSON.stringify(savedCart));
    });

    test('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem('scylla_cart', 'invalid-json');

      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-items')).toHaveTextContent('[]');
    });
  });

  describe('addItem', () => {
    test('adds new item to cart', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0]).toMatchObject({
        product_id: 1,
        size: 'M',
        quantity: 1,
      });
    });

    test('increases quantity for existing item', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 1 M Again'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].quantity).toBe(2);
    });

    test('adds different sizes as separate items', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems).toHaveLength(2);
    });

    test('respects stock limit', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      // Click 6 times but stock is only 5
      for (let i = 0; i < 6; i++) {
        fireEvent.click(screen.getByText('Add Item 3 S (stock 5)'));
      }

      expect(screen.getByTestId('cart-count')).toHaveTextContent('5');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems[0].quantity).toBe(5);
    });

    test('does not add item with zero stock', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 4 XL (out of stock)'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-items')).toHaveTextContent('[]');
    });
  });

  describe('removeItem', () => {
    test('removes item from cart', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');

      fireEvent.click(screen.getByText('Remove 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems).toHaveLength(1);
      expect(cartItems[0].product_id).toBe(2);
    });

    test('removing last item results in empty cart', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Remove 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-items')).toHaveTextContent('[]');
    });
  });

  describe('updateItem', () => {
    test('updates item quantity', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Increase 1 M'));
      fireEvent.click(screen.getByText('Increase 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('3');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems[0].quantity).toBe(3);
    });

    test('decreases item quantity', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 1 M Again'));
      fireEvent.click(screen.getByText('Add Item 1 M Again'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('3');

      fireEvent.click(screen.getByText('Decrease 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    });

    test('does not update quantity to less than 1', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Set Zero 1 M'));

      // Should still be 1, not 0
      expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

      const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
      expect(cartItems[0].quantity).toBe(1);
    });
  });

  describe('clearCart', () => {
    test('removes all items from cart', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');

      fireEvent.click(screen.getByText('Clear Cart'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
      expect(screen.getByTestId('cart-items')).toHaveTextContent('[]');
    });

    test('clearing empty cart does not cause error', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Clear Cart'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    });
  });

  describe('cartCount', () => {
    test('calculates correct sum of quantities', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 1 M Again'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      // 2 of item 1 + 1 of item 2 = 3 total
      expect(screen.getByTestId('cart-count')).toHaveTextContent('3');
    });

    test('updates cartCount after removing items', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 1 M Again'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('3');

      fireEvent.click(screen.getByText('Remove 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    });
  });

  describe('localStorage Persistence', () => {
    test('saves cart to localStorage on changes', async () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));

      await waitFor(() => {
        const savedCart = JSON.parse(localStorage.getItem('scylla_cart'));
        expect(savedCart).toHaveLength(1);
        expect(savedCart[0]).toMatchObject({
          product_id: 1,
          size: 'M',
          quantity: 1,
        });
      });
    });

    test('persists cart after clearing', async () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Clear Cart'));

      await waitFor(() => {
        const savedCart = JSON.parse(localStorage.getItem('scylla_cart'));
        expect(savedCart).toEqual([]);
      });
    });

    test('cart persists across component remounts', () => {
      const { unmount } = render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      unmount();

      // Remount
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    });
  });

  describe('useCart Hook', () => {
    test('throws error when used outside CartProvider', () => {
      // Suppress console.error for this test
      const consoleError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<CartTestComponent />);
      }).toThrow('useCart must be used inside CartProvider');

      console.error = consoleError;
    });
  });

  describe('Complex Scenarios', () => {
    test('handles multiple operations in sequence', () => {
      render(
        <CartProvider>
          <CartTestComponent />
        </CartProvider>
      );

      // Add items
      fireEvent.click(screen.getByText('Add Item 1 M'));
      fireEvent.click(screen.getByText('Add Item 1 M Again'));
      fireEvent.click(screen.getByText('Add Item 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('3');

      // Increase quantity
      fireEvent.click(screen.getByText('Increase 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('4');

      // Remove one item
      fireEvent.click(screen.getByText('Remove 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');

      // Decrease quantity
      fireEvent.click(screen.getByText('Decrease 2 L'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('1');

      // Add another item
      fireEvent.click(screen.getByText('Add Item 1 M'));

      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    });
  });
});
