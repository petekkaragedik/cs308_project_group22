import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../../components/Footer';

describe('Footer Component', () => {
  describe('Brand Section', () => {
    test('renders brand name', () => {
      render(<Footer />);
      expect(screen.getByText('SCYLLA')).toBeInTheDocument();
    });

    test('renders tagline', () => {
      render(<Footer />);
      expect(screen.getByText('Handcrafted for the shore')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    test('renders "Explore" heading', () => {
      render(<Footer />);
      expect(screen.getByText('Explore')).toBeInTheDocument();
    });

    test('renders Home link', () => {
      render(<Footer />);
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    test('renders Shop link', () => {
      render(<Footer />);
      const shopLink = screen.getByRole('link', { name: 'Shop' });
      expect(shopLink).toBeInTheDocument();
      expect(shopLink).toHaveAttribute('href', '/products');
    });

    test('renders Our Story link', () => {
      render(<Footer />);
      const storyLink = screen.getByRole('link', { name: 'Our Story' });
      expect(storyLink).toBeInTheDocument();
      expect(storyLink).toHaveAttribute('href', '/our-story');
    });
  });

  describe('Social Media Section', () => {
    test('renders "Follow us" heading', () => {
      render(<Footer />);
      expect(screen.getByText('Follow us')).toBeInTheDocument();
    });

    test('renders Instagram button', () => {
      render(<Footer />);
      expect(screen.getByRole('button', { name: 'Instagram' })).toBeInTheDocument();
    });

    test('renders Pinterest button', () => {
      render(<Footer />);
      expect(screen.getByRole('button', { name: 'Pinterest' })).toBeInTheDocument();
    });

    test('renders TikTok button', () => {
      render(<Footer />);
      expect(screen.getByRole('button', { name: 'TikTok' })).toBeInTheDocument();
    });
  });

  describe('Copyright Section', () => {
    test('renders copyright text', () => {
      render(<Footer />);
      expect(screen.getByText('© 2026 Scylla. All rights reserved.')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    test('renders footer element', () => {
      const { container } = render(<Footer />);
      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    test('contains all three main sections', () => {
      render(<Footer />);

      // Brand section
      expect(screen.getByText('SCYLLA')).toBeInTheDocument();

      // Links section
      expect(screen.getByText('Explore')).toBeInTheDocument();

      // Social section
      expect(screen.getByText('Follow us')).toBeInTheDocument();
    });
  });

  describe('Snapshot', () => {
    test('matches snapshot', () => {
      const { container } = render(<Footer />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
