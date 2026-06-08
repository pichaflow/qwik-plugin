import { describe, it, expect } from 'vitest';
import { createDOM } from '@builder.io/qwik/testing';
import { PichaFlowUpload } from './PichaFlowUpload';

describe('PichaFlowUpload (Qwik)', () => {
  it('renders the upload drop zone', async () => {
    const { render, screen } = await createDOM();
    await render(<PichaFlowUpload apiKey="test" />);
    expect(screen.outerHTML).toContain('drag');
  });

  it('renders with a valid apiKey without crashing', async () => {
    const { render, screen } = await createDOM();
    await render(<PichaFlowUpload apiKey="sk_test_123" />);
    expect(screen.outerHTML).toBeTruthy();
  });
});
