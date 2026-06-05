import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShopUi from './shop-ui';

describe('ShopUi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ShopUi />);
    expect(baseElement).toBeTruthy();
  });

  it('should have a greeting as the title', () => {
    render(<ShopUi />);
    expect(screen.getByText('Welcome to ShopUi!')).toBeInTheDocument();
  });
});
