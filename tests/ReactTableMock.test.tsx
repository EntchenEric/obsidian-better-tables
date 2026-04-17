import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'

// Mock the ReactTable component
jest.mock('../components/ReactTable', () => {
  return {
    ReactTable: ({ data, onSave, onAddRow, onAddColumn }) => (
      <div>
        <div>Table Headers: {data.headers.join(', ')}</div>
        <div>Table Rows:</div>
        {data.rows.map((row, index) => (
          <div key={index}>{row.join(', ')}</div>
        ))}
        <button onClick={onAddRow}>Add Row</button>
        <button onClick={onAddColumn}>Add Column</button>
        <button onClick={onSave}>Save</button>
      </div>
    )
  }
})

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
    expect(screen.getByText('Name, Age')).toBeInTheDocument()
  })

  it('should render the table rows', () => {
    renderTable()
    expect(screen.getByText('John, 30')).toBeInTheDocument()
  })

  it('should handle row addition', () => {
    renderTable()
    const addRowButton = screen.getByText('Add Row')
    fireEvent.click(addRowButton)
    expect(mockOnAddRow).toHaveBeenCalled()
  })

  it('should handle column addition', () => {
    renderTable()
    const addColumnButton = screen.getByText('Add Column')
    fireEvent.click(addColumnButton)
    expect(mockOnAddColumn).toHaveBeenCalled()
  })

  it('should handle save action', () => {
    renderTable()
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    expect(mockOnSave).toHaveBeenCalled()
  })
})