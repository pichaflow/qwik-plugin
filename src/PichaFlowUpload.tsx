import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import { PichaFlowClient, type UploadResponse } from '@pichaflow/sdk';

interface PichaUploadProps {
  apiKey: string;
  baseUrl?: string;
  useSecure?: boolean;
  tags?: string[];
  onSuccess$?: (response: UploadResponse) => void;
  onError$?: (error: any) => void;
}

export const PichaUpload = component$((props: PichaUploadProps) => {
  const isDragging = useSignal(false);
  const isUploading = useSignal(false);
  const progress = useSignal(0);
  const inputRef = useSignal<HTMLInputElement>();

  const handleFile = $(async (file: File) => {
    if (isUploading.value) return;
    isUploading.value = true;
    progress.value = 0;

    const client = new PichaFlowClient({ 
      apiKey: props.apiKey, 
      baseUrl: props.baseUrl 
    });

    try {
      const options = {
        tags: props.tags,
        onProgress: (p: number) => {
          progress.value = p;
        }
      };
      
      const response = props.useSecure 
        ? await client.secureUpload(file, options)
        : await client.upload(file, options);
        
      props.onSuccess$?.(response);
    } catch (err) {
      props.onError$?.(err);
    } finally {
      isUploading.value = false;
    }
  });

  return (
    <div 
      class={`picha-upload-zone ${isDragging.value ? 'bg-blue-50' : 'bg-slate-50'}`}
      preventdefault:dragover
      onDragOver$={() => isDragging.value = true}
      onDragLeave$={() => isDragging.value = false}
      onDrop$={(e) => {
        isDragging.value = false;
        const file = e.dataTransfer?.files[0];
        if (file) handleFile(file);
      }}
      style={{
        border: '2px dashed #e2e8f0',
        borderRadius: '0.75rem',
        padding: '2rem',
        textAlign: 'center',
        cursor: 'pointer'
      }}
    >
      {!isUploading.value ? (
        <p class="text-sm text-slate-500">
          Drag & drop or <span 
            class="text-blue-500 font-bold"
            onClick$={() => inputRef.value?.click()}
          >browse</span>
          <input 
            type="file" 
            ref={inputRef}
            onChange$={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleFile(file);
            }}
            hidden 
          />
        </p>
      ) : (
        <div class="w-full">
          <div class="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 transition-all" style={{ width: `${progress.value}%` }}></div>
          </div>
          <p class="text-xs text-slate-400 mt-2">Uploading... {progress.value}%</p>
        </div>
      )}
    </div>
  );
});
