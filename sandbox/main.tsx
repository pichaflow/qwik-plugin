import { render } from '@builder.io/qwik';
import { PichaFlowUpload } from '../src/PichaFlowUpload';

render(
  document.getElementById('app')!,
  <PichaFlowUpload
    apiKey="sandbox_key"
    onSuccess$={(res) => console.log('Uploaded:', res)}
    onError$={(err) => console.error('Error:', err)}
  />
);
