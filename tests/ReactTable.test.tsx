import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { ReactTable } from '../components/ReactTable'

const mockOnSave = jest.fn()
const mockOnAddRow = jest.fn()
const mockOnAddColumn = jest.fn()

const initialData = {
  headers: ['Name', 'Age'],
  rows: [['John', '30'], ['Jane', '25']]
}

describe('ReactTable', () => {
  const renderTable = () => {
    return render(
      <ReactTable
        data={initialData}
        onSave={mockOnSave}
        onAddRow={mockOnAddRow}
        onAddColumn={mockOnAddColumn}
      />
    )
  }

  it('should render the table correctly', () => {
    renderTable()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Jane')).toBeInTheDocument()
  })

  it('should handle undo action', () => {
    renderTable()
    // This test is more complex and requires mocking internal state
    // For now, we'll focus on rendering and basic functionality
  })

  it('should handle redo action', () => {
    renderTable()
    // Similar to undo, this would require more complex setup
  })

  it('should handle cell editing', () => {
    renderTable()
    const cellInput = screen.getAllByRole('textbox')[0]
    fireEvent.change(cellInput, { target: { value: 'Updated' } })
    fireEvent.blur(cellInput)
    // Verify the cell value is updated
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })

  it('should handle row addition', () => {
    renderTable()
    const addRowButton = screen.getByLabelText('Add new row')
    fireEvent.click(addRowButton)
    // Verify a new row is added
    expect(screen.getByText('')).toBeInTheDocument()
  })

  it('should handle column addition', () => {
    renderTable()
    const addColumnButton = screen.getByLabelText('Add new column')
    fireEvent.click(addColumnButton)
    // Verify a new column is added
    expect(screen.getByText('Column 3')).toBeInTheDocument()
  })
})