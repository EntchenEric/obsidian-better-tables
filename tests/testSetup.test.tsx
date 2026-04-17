import React from 'react';
import { render } from '@testing-library/react';

describe('Test Setup', () => {
  test('should render without crashing', () => {
    const { getByTestId } = render(<div data-testid="test-element">Hello World</div>);
    expect(getByTestId('test-element')).toBeInTheDocument();
  });
});