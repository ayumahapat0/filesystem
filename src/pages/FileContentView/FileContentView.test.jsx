import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter } from 'react-router-dom';
import FileContentView from './FileContentView';

// Setup mocks for react-router-dom and API call
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual, // Use actual implementations for unmocked parts
    useParams: vi.fn(() => ({ userId: '1', fileId: '2' })), // Mock useParams
    useNavigate: vi.fn(), // Mock implementation for useNavigate
  };
});

describe('FileContentView', () => {
  it('edit button is hidden when user does not have write permissions', async () => {
    vi.mock('../../api/file', () => ({
      collectUserContent: vi.fn(() =>
        Promise.resolve({
          files: [
            {
              id: 2,
              path: './Test/Test File',
              name: 'Test File',
              content: 'This is test content',
              permissions: permissionsWriteFalse,
            },
          ],
        }),
      ),
      updateFile: vi.fn(() =>
        Promise.resolve({ message: 'Update successful' }),
      ),
    }));
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    // Check if Edit File buttom isn't displayed
    expect(screen.queryByText('Edit File')).not.toBeInTheDocument();

    // Check if Confirm Button isn't displayed
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();

    // Check if Cancel button isnt displayed
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('displays file content correctly after fetching', async () => {
    vi.mock('../../api/file', () => ({
      collectUserContent: vi.fn(() =>
        Promise.resolve({
          files: [
            {
              id: 2,
              path: './Test/Test File',
              name: 'Test File',
              content: 'This is test content.',
              permissions: permissionsAllTrue,
            },
          ],
        }),
      ),
      updateFile: vi.fn(() =>
        Promise.resolve({ message: 'Update successful' }),
      ),
    }));
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );

    // Check if file name is displayed
    expect(await screen.findByText('Test File')).toBeInTheDocument();

    // Check if file path is displayed
    expect(await screen.findByText('./Test/Test File')).toBeInTheDocument();

    // Check if file content is displayed
    expect(
      await screen.findByText('This is test content.'),
    ).toBeInTheDocument();
  });

  it('enables edit mode when edit button is clicked', async () => {
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    fireEvent.click(await screen.findByText('Edit File'));
    expect(await screen.findByText('Confirm')).toBeInTheDocument();
  });

  it('navigates back to the file tree view when back is clicked'),
    async () => {
      const mockNavigate = vi.fn();
      useNavigate.mockImplementation(() => mockNavigate);
      render(<FileContentView />);
      fireEvent.click(await screen.findByText('Back'));

      expect(mockNavigate).toHaveBeenCalledWith('/file');
    };

  it('handles input change correctly', async () => {
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    fireEvent.click(await screen.findByText('Edit File'));
    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    expect(textarea.value).toBe('Updated content');
  });

  it('blocks user submitting too large an edit with alert', async () => {
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    fireEvent.click(await screen.findByText('Edit File'));
    const longString =
      'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: longString } });
    fireEvent.click(await screen.findByText('Confirm'));
    expect(textarea.value).toBe(longString);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('updates content and exits edit mode on confirm', async () => {
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    fireEvent.click(await screen.findByText('Edit File'));
    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.click(await screen.findByText('Confirm'));
    await waitFor(() => {
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Updated content')).toBeInTheDocument();
  });

  it('edit button is hidden while editing', async () => {
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    fireEvent.click(await screen.findByText('Edit File'));
    await waitFor(() => {
      expect(screen.queryByText('Edit File')).not.toBeInTheDocument();
    });
  });

  it('exits edit mode and does not update content on cancel', async () => {
    render(
      <BrowserRouter>
        <FileContentView />
      </BrowserRouter>,
    );
    fireEvent.click(await screen.findByText('Edit File'));
    const textarea = await screen.findByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    fireEvent.click(await screen.findByText('Cancel'));
    await waitFor(() => {
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });
    expect(screen.getByText('This is test content.')).toBeInTheDocument();
  });
});

const permissionsAllTrue = [
  {
    id: 289,
    type: 'READ',
    userId: 47,
    enabled: true,
    directoryId: null,
    fileId: 17,
  },
  {
    id: 290,
    type: 'WRITE',
    userId: 47,
    enabled: true,
    directoryId: null,
    fileId: 17,
  },
  {
    id: 291,
    type: 'EXECUTE',
    userId: 47,
    enabled: true,
    directoryId: null,
    fileId: 17,
  },
];

const permissionsWriteFalse = [
  {
    id: 289,
    type: 'READ',
    userId: 47,
    enabled: true,
    directoryId: null,
    fileId: 17,
  },
  {
    id: 290,
    type: 'WRITE',
    userId: 47,
    enabled: false,
    directoryId: null,
    fileId: 17,
  },
  {
    id: 291,
    type: 'EXECUTE',
    userId: 47,
    enabled: true,
    directoryId: null,
    fileId: 17,
  },
];
