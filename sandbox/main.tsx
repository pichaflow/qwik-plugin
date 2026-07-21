import { component$, useStore, $, render } from '@builder.io/qwik';
import { PichaFlowClient, type UploadResponse } from '@pichaflow/sdk';
import { PichaFlowUpload } from '../src/PichaFlowUpload';

const client = new PichaFlowClient({
  apiKey: 'your_api_key_here',
  baseUrl: 'http://localhost:8789',
  uploadUrl: 'http://localhost:8789',
  fetchUrl: 'http://localhost:8789',
});

export const QwikExampleApp = component$(() => {
  const store = useStore<{
    description: string;
    uploadedImages: UploadResponse[];
    deletingId: string | null;
  }>({
    description: '',
    uploadedImages: [],
    deletingId: null,
  });

  const handleSuccess$ = $((response: UploadResponse) => {
    store.uploadedImages = [
      ...store.uploadedImages,
      {
        ...response,
        alt: store.description || response.alt || 'Uploaded image',
      },
    ];
    store.description = '';
  });

  const handleDelete$ = $(async (id: string) => {
    store.deletingId = id;
    try {
      const res = await client.deleteAsset(id);
      if (res.success) {
        store.uploadedImages = store.uploadedImages.filter((img) => img.id !== id);
      }
    } catch (err) {
      alert(`Failed to delete image: ${err}`);
    } finally {
      store.deletingId = null;
    }
  });

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'system-ui, sans-serif' }}>
      <h2>PichaFlow Qwik Upload Example</h2>

      {/* 1. Description Input */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
          Image Description (Alt Text):
        </label>
        <input
          type="text"
          value={store.description}
          onInput$={(e) => (store.description = (e.target as HTMLInputElement).value)}
          placeholder="Enter alt text for image"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {/* 2. PichaFlowUpload Component */}
      <PichaFlowUpload
        apiKey="your_api_key_here"
        baseUrl="http://localhost:8789"
        uploadUrl="http://localhost:8789"
        alt={store.description}
        directory="examples/qwik"
        tags={['qwik_example']}
        onSuccess$={handleSuccess$}
        onError$={$((err: any) => alert(`Upload error: ${err.message || err}`))}
      />

      {/* 3. Uploaded Images List */}
      <div style={{ marginTop: '32px' }}>
        <h3>Uploaded Images ({store.uploadedImages.length})</h3>

        {store.uploadedImages.length === 0 ? (
          <p style={{ color: '#666' }}>No images uploaded yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {store.uploadedImages.map((img) => (
              <li
                key={img.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  border: '1px solid #eee',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                />
                <div style={{ flex: 1 }}>
                  <strong>{img.alt}</strong>
                  <div style={{ fontSize: '12px', color: '#888' }}>ID: {img.id}</div>
                </div>
                <button
                  onClick$={() => handleDelete$(img.id)}
                  disabled={store.deletingId === img.id}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {store.deletingId === img.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});

render(document.getElementById('app')!, <QwikExampleApp />);
