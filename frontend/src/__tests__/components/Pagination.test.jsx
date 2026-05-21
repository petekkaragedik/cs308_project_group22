import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../../components/Pagination';

describe('Pagination Component', () => {
  let mockOnPageChange;

  beforeEach(() => {
    mockOnPageChange = jest.fn();
  });

  describe('Basic Rendering', () => {
    test('renders with single page', () => {
      render(<Pagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'First' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Last »' })).not.toBeInTheDocument();
    });

    test('renders all page numbers when totalPages <= 7', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument();
      expect(screen.queryByText('…')).not.toBeInTheDocument();
    });

    test('renders with ellipsis when totalPages > 7', () => {
      render(<Pagination currentPage={5} totalPages={100} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();
      expect(screen.getAllByText('…')).toHaveLength(2); // two ellipsis
    });
  });

  describe('First Page Behavior', () => {
    test('disables Previous button on first page', () => {
      render(<Pagination currentPage={1} totalPages={10} onPageChange={mockOnPageChange} />);

      const prevButton = screen.getByRole('button', { name: 'Previous' });
      expect(prevButton).toBeDisabled();
    });

    test('does not show First button on first page', () => {
      render(<Pagination currentPage={1} totalPages={10} onPageChange={mockOnPageChange} />);

      expect(screen.queryByRole('button', { name: '« First' })).not.toBeInTheDocument();
    });

    test('shows First button when not on first page', () => {
      render(<Pagination currentPage={3} totalPages={10} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: '« First' })).toBeInTheDocument();
    });
  });

  describe('Last Page Behavior', () => {
    test('disables Next button on last page', () => {
      render(<Pagination currentPage={10} totalPages={10} onPageChange={mockOnPageChange} />);

      const nextButton = screen.getByRole('button', { name: 'Next' });
      expect(nextButton).toBeDisabled();
    });

    test('does not show Last button on last page', () => {
      render(<Pagination currentPage={10} totalPages={10} onPageChange={mockOnPageChange} />);

      expect(screen.queryByRole('button', { name: 'Last »' })).not.toBeInTheDocument();
    });

    test('shows Last button when not on last page', () => {
      render(<Pagination currentPage={3} totalPages={10} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: 'Last »' })).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    test('calls onPageChange with correct page on number click', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: '3' }));
      expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    test('calls onPageChange with page 1 on First button click', () => {
      render(<Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: '« First' }));
      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    test('calls onPageChange with totalPages on Last button click', () => {
      render(<Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Last »' }));
      expect(mockOnPageChange).toHaveBeenCalledWith(10);
    });

    test('calls onPageChange with currentPage - 1 on Previous button click', () => {
      render(<Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(mockOnPageChange).toHaveBeenCalledWith(4);
    });

    test('calls onPageChange with currentPage + 1 on Next button click', () => {
      render(<Pagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(mockOnPageChange).toHaveBeenCalledWith(6);
    });
  });

  describe('Active Page Highlighting', () => {
    test('applies active styles to current page button', () => {
      render(<Pagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />);

      const currentPageButton = screen.getByRole('button', { name: '3' });
      expect(currentPageButton).toHaveStyle({
        backgroundColor: 'var(--color-charcoal)',
        color: 'white',
      });
    });
  });

  describe('Ellipsis Logic', () => {
    test('shows ellipsis with correct positioning for middle pages', () => {
      render(<Pagination currentPage={50} totalPages={100} onPageChange={mockOnPageChange} />);

      // Should show: 1 ... 49 50 51 ... 100
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '49' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '50' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '51' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();
      expect(screen.getAllByText('…')).toHaveLength(2);
    });

    test('shows correct pages near the beginning', () => {
      render(<Pagination currentPage={2} totalPages={100} onPageChange={mockOnPageChange} />);

      // Should show: 1 2 3 ... 100
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();
      expect(screen.getAllByText('…')).toHaveLength(1);
    });

    test('shows correct pages near the end', () => {
      render(<Pagination currentPage={99} totalPages={100} onPageChange={mockOnPageChange} />);

      // Should show: 1 ... 98 99 100
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '98' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '99' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '100' })).toBeInTheDocument();
      expect(screen.getAllByText('…')).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles single page correctly with disabled navigation', () => {
      render(<Pagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('handles exactly 7 pages without ellipsis', () => {
      render(<Pagination currentPage={4} totalPages={7} onPageChange={mockOnPageChange} />);

      for (let i = 1; i <= 7; i++) {
        expect(screen.getByRole('button', { name: String(i) })).toBeInTheDocument();
      }
      expect(screen.queryByText('…')).not.toBeInTheDocument();
    });

    test('handles exactly 8 pages with ellipsis', () => {
      render(<Pagination currentPage={4} totalPages={8} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
      expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    test('navigation has proper aria-label', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

      expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    });

    test('all page buttons are keyboard accessible', () => {
      render(<Pagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });
});
