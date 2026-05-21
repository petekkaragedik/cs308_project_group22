import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageCarousel from '../../components/ImageCarousel';

const mockImages = [
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg',
  'https://example.com/image3.jpg',
  'https://example.com/image4.jpg',
];

describe('ImageCarousel Component', () => {
  describe('Initial Render', () => {
    test('renders with default index 0', () => {
      const { container } = render(<ImageCarousel images={mockImages} />);

      const mainImage = container.querySelector('img[src="' + mockImages[0] + '"][draggable="false"]');
      expect(mainImage).toBeInTheDocument();
      expect(mainImage).toHaveAttribute('src', mockImages[0]);
    });

    test('renders with custom initialIndex', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={2} />);

      const mainImage = container.querySelector('img[src="' + mockImages[2] + '"][draggable="false"]');
      expect(mainImage).toBeInTheDocument();
      expect(mainImage).toHaveAttribute('src', mockImages[2]);
    });

    test('renders all thumbnails', () => {
      render(<ImageCarousel images={mockImages} />);

      mockImages.forEach((_, index) => {
        expect(screen.getByRole('button', { name: `View image ${index + 1}` })).toBeInTheDocument();
      });
    });

    test('highlights active thumbnail', () => {
      render(<ImageCarousel images={mockImages} initialIndex={1} />);

      const thumbnails = screen.getAllByRole('button', { name: /View image/ });

      // Second thumbnail should be active (index 1)
      const activeThumb = thumbnails[1];
      expect(activeThumb.style.border).toContain('2px solid');
    });

    test('renders children when provided', () => {
      render(
        <ImageCarousel images={mockImages}>
          <div>Custom Content</div>
        </ImageCarousel>
      );

      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });
  });

  describe('Navigation Buttons', () => {
    test('does not show Previous button on first image', () => {
      render(<ImageCarousel images={mockImages} />);

      expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument();
    });

    test('shows Next button', () => {
      render(<ImageCarousel images={mockImages} />);

      expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument();
    });

    test('Next button navigates to next image', () => {
      const { container } = render(<ImageCarousel images={mockImages} />);

      const nextButton = screen.getByRole('button', { name: 'Next image' });
      fireEvent.click(nextButton);

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[1]);
    });

    test('Previous button navigates to previous image', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={2} />);

      const prevButton = screen.getByRole('button', { name: 'Previous image' });
      fireEvent.click(prevButton);

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[1]);
    });

    test('Next button not shown on last image', () => {
      render(<ImageCarousel images={mockImages} initialIndex={3} />);

      expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
    });

    test('Previous button not shown on first image', () => {
      render(<ImageCarousel images={mockImages} initialIndex={0} />);

      expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument();
    });
  });

  describe('Thumbnail Navigation', () => {
    test('clicking thumbnail changes main image', () => {
      const { container } = render(<ImageCarousel images={mockImages} />);

      const thirdThumbnail = screen.getByRole('button', { name: 'View image 3' });
      fireEvent.click(thirdThumbnail);

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[2]);
    });

    test('updates active thumbnail on click', () => {
      render(<ImageCarousel images={mockImages} />);

      const thirdThumbnail = screen.getByRole('button', { name: 'View image 3' });
      fireEvent.click(thirdThumbnail);

      expect(thirdThumbnail.style.border).toContain('2px solid');
    });
  });

  describe('Drag Gestures', () => {
    test('drag right navigates to previous image', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={1} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.mouseDown(mainImageContainer, { clientX: 100 });
      fireEvent.mouseUp(mainImageContainer, { clientX: 200 }); // Drag right (100px)

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[0]);
    });

    test('drag left navigates to next image', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={1} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.mouseDown(mainImageContainer, { clientX: 200 });
      fireEvent.mouseUp(mainImageContainer, { clientX: 100 }); // Drag left (100px)

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[2]);
    });

    test('small drag does not change image', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={1} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.mouseDown(mainImageContainer, { clientX: 100 });
      fireEvent.mouseUp(mainImageContainer, { clientX: 120 }); // Small drag (20px)

      // Should stay on same image
      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[1]);
    });
  });

  describe('Touch Gestures', () => {
    test('touch swipe left navigates to next image', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={1} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.touchStart(mainImageContainer, {
        touches: [{ clientX: 200 }],
      });
      fireEvent.touchEnd(mainImageContainer, {
        changedTouches: [{ clientX: 100 }],
      });

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[2]);
    });

    test('touch swipe right navigates to previous image', () => {
      const { container } = render(<ImageCarousel images={mockImages} initialIndex={1} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.touchStart(mainImageContainer, {
        touches: [{ clientX: 100 }],
      });
      fireEvent.touchEnd(mainImageContainer, {
        changedTouches: [{ clientX: 200 }],
      });

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[0]);
    });
  });

  describe('Zoom Functionality', () => {
    test('shows zoom lens on hover', () => {
      const { container } = render(<ImageCarousel images={mockImages} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.mouseEnter(mainImageContainer);

      // Component should have ic-zooming class when hovering
      expect(mainImageContainer).toBeInTheDocument();
    });

    test('hides zoom lens on mouse leave', () => {
      const { container } = render(<ImageCarousel images={mockImages} />);

      const mainImageContainer = container.querySelector('div.ic-wrap');

      fireEvent.mouseEnter(mainImageContainer);
      fireEvent.mouseLeave(mainImageContainer);

      // Should not have ic-zooming class
      expect(mainImageContainer.className).not.toContain('ic-zooming');
    });
  });

  describe('onImageClick Callback', () => {
    test('calls onImageClick when main image is clicked', () => {
      const mockOnImageClick = jest.fn();
      const { container } = render(<ImageCarousel images={mockImages} onImageClick={mockOnImageClick} />);

      const mainImage = container.querySelector('img[draggable="false"]');
      fireEvent.click(mainImage);

      expect(mockOnImageClick).toHaveBeenCalledWith(0);
    });

    test('calls onImageClick with correct index after navigation', () => {
      const mockOnImageClick = jest.fn();
      const { container } = render(<ImageCarousel images={mockImages} onImageClick={mockOnImageClick} />);

      const nextButton = screen.getByRole('button', { name: 'Next image' });
      fireEvent.click(nextButton);

      const mainImage = container.querySelector('img[draggable="false"]');
      fireEvent.click(mainImage);

      expect(mockOnImageClick).toHaveBeenCalledWith(1);
    });
  });

  describe('Accessibility', () => {
    test('navigation buttons have aria-labels', () => {
      render(<ImageCarousel images={mockImages} initialIndex={1} />);

      expect(screen.getByRole('button', { name: 'Previous image' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next image' })).toBeInTheDocument();
    });

    test('thumbnails have aria-labels', () => {
      render(<ImageCarousel images={mockImages} />);

      mockImages.forEach((_, index) => {
        expect(screen.getByRole('button', { name: `View image ${index + 1}` })).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles single image', () => {
      const { container } = render(<ImageCarousel images={[mockImages[0]]} />);

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toBeInTheDocument();
      expect(mainImage).toHaveAttribute('src', mockImages[0]);

      // No thumbnails shown for single image
      expect(screen.queryByRole('button', { name: /View image/ })).not.toBeInTheDocument();
    });

    test('handles empty images array gracefully', () => {
      const { container } = render(<ImageCarousel images={[]} />);
      expect(container).toBeInTheDocument();
    });

    test('navigation works with two images', () => {
      const twoImages = [mockImages[0], mockImages[1]];
      const { container } = render(<ImageCarousel images={twoImages} />);

      const nextButton = screen.getByRole('button', { name: 'Next image' });
      fireEvent.click(nextButton);

      const mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', twoImages[1]);
    });
  });

  describe('State Management', () => {
    test('maintains activeIndex state correctly through multiple interactions', () => {
      const { container } = render(<ImageCarousel images={mockImages} />);

      // Start at index 0
      let mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[0]);

      // Click Next twice
      const nextButton = screen.getByRole('button', { name: 'Next image' });
      fireEvent.click(nextButton);
      fireEvent.click(nextButton);

      mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[2]);

      // Click thumbnail 1 (first thumbnail)
      const firstThumbnail = screen.getByRole('button', { name: 'View image 1' });
      fireEvent.click(firstThumbnail);

      mainImage = container.querySelector('img[draggable="false"]');
      expect(mainImage).toHaveAttribute('src', mockImages[0]);
    });
  });
});
