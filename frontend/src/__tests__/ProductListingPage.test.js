import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// React Router v7 uses conditional package exports that CRA's Jest cannot resolve.
// Mock the module to provide only what ProductListingPage needs.
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('../components/Navbar', () => () => <nav data-testid="navbar" />);
jest.mock('../components/Footer', () => () => <footer data-testid="footer" />);
jest.mock('../context/CartContext', () => ({
  useCart: () => ({ addItem: jest.fn(), items: [] }),
}));

import ProductListingPage from '../pages/ProductListingPage';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  );
  localStorage.clear();
});

test('sort dropdown renders with all 4 options', async () => {
  render(<ProductListingPage />);
  await waitFor(() =>
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  );

  // Open the custom sort dropdown (button shows current selection)
  fireEvent.click(screen.getByRole('button', { name: /default/i }));

  expect(screen.getAllByText('Default').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Price: Low to High')).toBeInTheDocument();
  expect(screen.getByText('Price: High to Low')).toBeInTheDocument();
  expect(screen.getByText('Popularity')).toBeInTheDocument();
});

test('category filter renders and "All" pill is present', async () => {
  render(<ProductListingPage />);
  await waitFor(() =>
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  );

  expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
});
