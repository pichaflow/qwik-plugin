# @pichaflow/qwik

Integrate the **PichaFlow Engine** into your Qwik applications with fine-grained reactivity.

PichaFlow is an edge-native media orchestration service designed for global e-commerce. It features zero egress fees, sub-millisecond WASM transformations, and built-in client-side image optimization.

This package provides a highly customizable `<PichaFlowUpload>` component for handling direct-to-edge uploads from the browser, optimized for Qwik's resumability.

## Installation

You must install both the Qwik wrapper and the core SDK.

```bash
npm install @pichaflow/qwik @pichaflow/sdk
# or
yarn add @pichaflow/qwik @pichaflow/sdk
# or
pnpm add @pichaflow/qwik @pichaflow/sdk
```

---

## Quick Start

The simplest way to use the component is to drop it into your page and handle the QRL callback props (`onSuccess$`).

```tsx
import { component$, $ } from '@builder.io/qwik';
import { PichaFlowUpload } from '@pichaflow/qwik';

export default component$(() => {
  const handleSuccess$ = $((response) => {
    console.log('Upload complete! Asset ID:', response.id);
    console.log('Delivery URL:', response.url);
  });

  const handleError$ = $((error) => {
    console.error('Upload failed:', error);
  });

  return (
    <div style="max-width: 400px; margin: 0 auto;">
      <h2>Upload your Avatar</h2>
      
      <PichaFlowUpload
        apiKey="pk_live_your_public_key"
        useSecure={true}
        signatureUrl="/api/sign-upload"
        tags={['ugc', 'avatar']}
        onSuccess$={handleSuccess$}
        onError$={handleError$}
      />
    </div>
  );
});
```

---

## Understanding Secure Uploads (Crucial)

When allowing users to upload files directly from their browsers, **you must never expose your PichaFlow Secret Key (`sk_live_...`)**. If you do, malicious users could extract the key and upload terabytes of data, draining your account.

Instead, PichaFlow uses an HMAC Handshake proxy flow:

1. You initialize the component with `useSecure={true}` and provide a `signatureUrl`.
2. When the user drops a file, the component automatically sends a lightweight request to your `signatureUrl` (a route on your backend).
3. Your backend securely holds the Secret Key, generates a temporary, 60-second HMAC token, and returns it.
4. The component uses that token to upload the massive file directly to the PichaFlow Edge Network—meaning the large file never touches your backend infrastructure, saving you bandwidth and server costs.

### Example Backend Route (Qwik City Endpoint)
If your `signatureUrl` is `/api/sign-upload`, your Qwik City route might look like this:

```typescript
// src/routes/api/sign-upload/index.ts
import type { RequestHandler } from '@builder.io/qwik-city';
import crypto from 'crypto';

export const onPost: RequestHandler = async ({ json, env }) => {
  // 1. Verify user is logged in (optional but recommended)
  
  // 2. Generate HMAC signature using your SECRET key
  const secret = env.get('PICHAFLOW_SECRET_KEY');
  const timestamp = Math.floor(Date.now() / 1000);
  const dataToSign = `upload:${timestamp}`;
  
  const signature = crypto
    .createHmac('sha256', secret as string)
    .update(dataToSign)
    .digest('hex');

  // 3. Return it to the Qwik component
  json(200, { signature, timestamp });
};
```

---

## Auto-Optimization (Pre-Processing)

By default, the `<PichaFlowUpload>` component automatically performs **Client-Side Pre-Optimization**. 

If a user uploads a massive 24 Megapixel master image (e.g. 15MB), the component intercepts the file, uses the browser's native HTML5 Canvas API to strictly scale the longest edge down to 2048px (maintaining aspect ratio), and natively exports it as a highly compressed `image/webp` file (usually <500KB). 

This happens instantly in the browser *before* the network request begins, ensuring blazing-fast uploads and keeping your storage bills incredibly low.

---

## Component Props Reference

| Prop | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | No | Your PichaFlow Public Key (`pk_live_...`). Optional if using a `signatureUrl` proxy that returns credentials. |
| `useSecure` | `boolean` | No | Default `false`. Enable the HMAC-SHA256 handshake flow for secure browser uploads. |
| `signatureUrl` | `string` | If `useSecure` | The endpoint on your backend that signs the upload request. |
| `customUploadEndpoint`| `string` | No | A complete URL to a proxy endpoint for upload, bypassing the PichaFlow Edge Engine completely. |
| `tags` | `string[]` | No | Default `[]`. Array of string tags to append to the uploaded asset metadata for easier searching in the dashboard. |
| `directory` | `string` | No | Optional target folder path (e.g. `avatars/user-123`) to store uploaded assets. |

## Callback Props (QRLs)

| Prop | Signature | Description |
| --- | --- | --- |
| `onSuccess$` | `PropFunction<(res: UploadResponse) => void>` | Fired when the upload completes successfully. Includes the new asset `id` and `url`. |
| `onError$` | `PropFunction<(error: any) => void>` | Fired if the upload fails due to network or server errors. |
| `onProgress$`| `PropFunction<(progress: number) => void>` | Fired continuously during the upload with an integer (0-100). Useful for custom progress bars. |

---

## License
MIT
