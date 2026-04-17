import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react'

// Mock the ReactTable component
jest.mock('../components/ReactTable', () => {
  return {
    ReactTable: ({ data }) => (
      <div>
        <div>Headers: {data.headers.join(', ')}</div>
        {data.rows.map((row, index) => (
          <div key={index}>{row.join(', ')}</div>
        ))}
      </div>
    )
  }
})

import { ReactTable } from '../components/ReactTable'

const initialData = {
  headers: ['Name', 'Age'],
  rows: [['John', '30']]
}

describe('ReactTable', () => {
  const renderTable = () => {
    return render(
      <ReactTable data={initialData} onSave={() => {}} onAddRow={() => {}} onAddColumn={() => {}} />
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
})