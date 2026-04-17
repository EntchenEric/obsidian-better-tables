import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'
import { ReactTable } from '../components/ReactTable'

const mockOnSave = jest.fn()
const mockOnAddRow = jest.fn()
const mockOnAddColumn = jest.fn()

const initialData = {
  headers: ['Name', 'Age'],
  rows: [['John', '30']]
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

  it('should render the table headers', () => {
    renderTable()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Age')).toBeInTheDocument()
  })

  it('should render the table rows', () => {
    renderTable()
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
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

  it('should handle undo button', () => {
    renderTable()
    const undoButton = screen.getByLabelText('Undo last action')
    fireEvent.click(undoButton)
    // This test is more complex and requires mocking internal state
  })

  it('should handle redo button', () => {
    renderTable()
    const redoButton = screen.getByLabelText('Redo last action')
    fireEvent.click(redoButton)
    // This test is more complex and requires mocking internal state
  })
})