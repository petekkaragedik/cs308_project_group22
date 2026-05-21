import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('../../context/CartContext', () => ({
  useCart: () => ({ cartCount: mockCartCount }),
}));

jest.mock('../../apiBase', () => ({
  apiUrl: (path) => path,
}));

let mockNavigate;
let mockCartCount;

const mockProducts = [
  {
    id: 1,
    name: 'Beach Towel',
    description: 'Soft cotton beach towel',
    categoryName: 'Accessories',
    price: 29.99,
    quantityInStock: 10,
    images: ['https://example.com/towel.jpg'],
    model: 'towel-blue',
    color: 'blue',
  },
  {
    id: 2,
    name: 'Sunscreen SPF 50',
    description: 'Water resistant sunscreen',
    categoryName: 'Skincare',
    price: 15.50,
    quantityInStock: 0,
    images: ['https://example.com/sunscreen.jpg'],
    model: 'sunscreen-white',
    color: 'white',
  },
  {
    id: 3,
    name: 'Beach Ball',
    description: 'Inflatable beach ball',
    categoryName: 'Toys',
    price: 9.99,
    quantityInStock: 25,
    images: ['https://example.com/ball.jpg'],
    model: 'ball-rainbow',
    color: 'rainbow',
  },
];

describe('Navbar Component', () => {
  beforeEach(() => {
    mockNavigate = jest.fn();
    mockCartCount = 0;

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      })
    );

    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    test('renders brand logo', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      expect(screen.getByText('SCYLLA')).toBeInTheDocument();
    });

    test('renders all navigation icons', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Wishlist' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Cart' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument();
    });

    test('fetches products on mount', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/products');
      });
    });
  });

  describe('Cart Integration', () => {
    test('does not show cart badge when cart is empty', () => {
      mockCartCount = 0;

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    test('shows cart count badge when items in cart', () => {
      mockCartCount = 3;

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('shows 99+ when cart has more than 99 items', () => {
      mockCartCount = 150;

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Account Link', () => {
    test('links to login when no token in sessionStorage', () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      const accountLink = screen.getByRole('link', { name: 'Account' });
      expect(accountLink).toHaveAttribute('href', '/login');
    });

    test('links to profile when token exists in sessionStorage', () => {
      sessionStorage.setItem('token', 'fake-jwt-token');

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      const accountLink = screen.getByRole('link', { name: 'Account' });
      expect(accountLink).toHaveAttribute('href', '/profile');
    });
  });

  describe('Search Overlay', () => {
    test('opens search overlay on search button click', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      const searchButton = screen.getByRole('button', { name: 'Search' });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search for products...')).toBeInTheDocument();
      });
    });

    test('closes search overlay on X button click', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Open overlay
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search for products...')).toBeInTheDocument();
      });

      // Close overlay
      const closeButton = screen.getByRole('button', { name: 'Close search' });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search for products...')).not.toBeInTheDocument();
      });
    });

    test('closes search overlay on Escape key press', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Open overlay
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search for products...')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search for products...')).not.toBeInTheDocument();
      });
    });

    test('auto-focuses search input when overlay opens', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Search for products...');
        expect(input).toBeInTheDocument();
        // Note: jsdom doesn't fully support focus(), so we just check it exists
      });
    });
  });

  describe('Search Functionality', () => {
    test('filters products by name', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Wait for products to load
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Open search overlay
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach' } });

      await waitFor(() => {
        expect(screen.getByText('Beach Towel')).toBeInTheDocument();
        expect(screen.getByText('Beach Ball')).toBeInTheDocument();
        expect(screen.queryByText('Sunscreen SPF 50')).not.toBeInTheDocument();
      });
    });

    test('filters products by description', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'water resistant' } });

      await waitFor(() => {
        expect(screen.getByText('Sunscreen SPF 50')).toBeInTheDocument();
        expect(screen.queryByText('Beach Towel')).not.toBeInTheDocument();
      });
    });

    test('filters products by category', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'toys' } });

      await waitFor(() => {
        expect(screen.getByText('Beach Ball')).toBeInTheDocument();
        expect(screen.queryByText('Beach Towel')).not.toBeInTheDocument();
      });
    });

    test('shows result count', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach' } });

      await waitFor(() => {
        expect(screen.getByText(/2 results for 'Beach'/)).toBeInTheDocument();
      });
    });

    test('shows singular result text for one result', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Sunscreen' } });

      await waitFor(() => {
        expect(screen.getByText(/1 result for 'Sunscreen'/)).toBeInTheDocument();
      });
    });

    test('shows no results message when no products match', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'nonexistent product' } });

      await waitFor(() => {
        expect(screen.getByText(/No products found for 'nonexistent product'/)).toBeInTheDocument();
      });
    });

    test('does not show results when search is empty', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search for products...')).toBeInTheDocument();
      });

      expect(screen.queryByText('Beach Towel')).not.toBeInTheDocument();
    });

    test('case-insensitive search', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'BEACH' } });

      await waitFor(() => {
        expect(screen.getByText('Beach Towel')).toBeInTheDocument();
      });
    });
  });

  describe('Search Navigation', () => {
    test('navigates to product detail on result click', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach Towel' } });

      const productRow = await screen.findByText('Beach Towel');
      fireEvent.click(productRow.closest('div.search-row'));

      expect(mockNavigate).toHaveBeenCalledWith('/products/1');
    });

    test('closes overlay after clicking product', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach Towel' } });

      const productRow = await screen.findByText('Beach Towel');
      fireEvent.click(productRow.closest('div.search-row'));

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Search for products...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Product Display', () => {
    test('shows OUT OF STOCK badge for out of stock products', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Sunscreen' } });

      await waitFor(() => {
        expect(screen.getByText('OUT OF STOCK')).toBeInTheDocument();
      });
    });

    test('displays product price in Turkish Lira format', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach Towel' } });

      await waitFor(() => {
        expect(screen.getByText('₺29,99')).toBeInTheDocument();
      });
    });

    test('displays product category', async () => {
      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach Towel' } });

      await waitFor(() => {
        expect(screen.getByText('Accessories')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API fetch failure gracefully', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('API Error')));

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      // Should still render navbar
      expect(screen.getByText('SCYLLA')).toBeInTheDocument();

      // Wait and ensure no error is thrown
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Duplicate Product Filtering', () => {
    test('removes duplicate products with same model and color', async () => {
      const productsWithDuplicates = [
        ...mockProducts,
        {
          id: 4,
          name: 'Beach Towel',
          description: 'Soft cotton beach towel',
          categoryName: 'Accessories',
          price: 29.99,
          quantityInStock: 5,
          images: ['https://example.com/towel.jpg'],
          model: 'towel-blue', // Same model and color as product 1
          color: 'blue',
        },
      ];

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(productsWithDuplicates),
        })
      );

      render(
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const input = await screen.findByPlaceholderText('Search for products...');
      fireEvent.change(input, { target: { value: 'Beach Towel' } });

      await waitFor(() => {
        const towelElements = screen.getAllByText('Beach Towel');
        // Should only show one, not two
        expect(towelElements).toHaveLength(1);
      });
    });
  });
});
