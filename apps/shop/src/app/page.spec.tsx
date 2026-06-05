import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Index from './page';

describe('Index', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Index />);
    expect(baseElement).toBeTruthy();
  });

  it('should have a greeting as the title', () => {
    render(<Index />);
    expect(screen.getByText('Hello Shop')).toBeInTheDocument();
  });
});
