import { component$, useSignal, useStore, $, useStylesScoped$ } from '@builder.io/qwik';
import { PichaFlowClient, type UploadResponse, optimizeImageForUpload } from '@pichaflow/sdk';

export interface PichaUploadProps {
  apiKey: string;
  baseUrl?: string;
  engineUrl?: string;
  tenantId?: string;
  useSecure?: boolean;
  tags?: string[];
  class?: string;
  onSuccess$?: (response: UploadResponse) => void;
  onSuccessAll$?: (responses: UploadResponse[]) => void;
  onError$?: (error: any) => void;
  onProgress$?: (progress: number) => void;
}

type UploadTask = {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  response?: UploadResponse;
};

export const PichaUpload = component$((props: PichaUploadProps) => {
  const isDragging = useSignal(false);
  const tasksStore = useStore<{ tasks: UploadTask[] }>({ tasks: [] }, { deep: true });
  const inputRef = useSignal<HTMLInputElement>();

  useStylesScoped$(`
    .picha-upload-zone {
      border: 2px dashed #e2e8f0;
      border-radius: 0.75rem;
      padding: 2rem;
      transition: all 0.2s ease;
      background: #f8fafc;
    }
    .picha-upload-zone.is-dragging {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .picha-upload-content {
      text-align: center;
    }
    .picha-upload-icon { width: 2rem; height: 2rem; color: #94a3b8; margin: 0 auto 1rem; display: block; }
    .picha-upload-text { color: #64748b; font-size: 0.875rem; margin: 0; }
    .picha-upload-link { color: #3b82f6; font-weight: 600; cursor: pointer; }
    
    .picha-uploading-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .picha-task-item {
      background: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      border: 1px solid #f1f5f9;
    }
    .picha-task-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .picha-file-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 70%;
    }
    .picha-status-text {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
    }
    .picha-status-text.success { color: #10b981; }
    .picha-status-text.error { color: #ef4444; }
    
    .picha-progress-bar { background: #e2e8f0; height: 0.5rem; border-radius: 999px; overflow: hidden; }
    .picha-progress-fill { background: #3b82f6; height: 100%; transition: width 0.1s ease; }
    .picha-progress-fill.success { background: #10b981; }
    .picha-progress-fill.error { background: #ef4444; }
    
    .picha-error-text {
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: #ef4444;
    }
    .picha-add-more { text-align: center; margin-top: 1.5rem; }

    @media (prefers-color-scheme: dark) {
      .picha-upload-zone { background: #0f172a; border-color: #1e293b; }
      .picha-task-item { background: #1e293b; border-color: #334155; }
      .picha-file-name { color: #f8fafc; }
      .picha-progress-bar { background: #334155; }
    }
  `);

  const handleFiles = $(async (files: File[]) => {
    if (files.length === 0) return;

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      props.onError$?.(new Error('Only image files are supported.'));
      return;
    }

    const previewTasks: UploadTask[] = imageFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending' as const
    }));

    tasksStore.tasks.push(...previewTasks);

    const client = new PichaFlowClient({ 
      apiKey: props.apiKey, 
      baseUrl: props.baseUrl,
      engineUrl: props.engineUrl,
      tenantId: props.tenantId
    });

    const optimizedTasks = await Promise.all(
      previewTasks.map(async (t) => {
        const optimizedFile = await optimizeImageForUpload(t.file);
        return { ...t, file: optimizedFile };
      })
    );

    let completedCount = 0;
    const successfulResponses: UploadResponse[] = [];

    await Promise.all(optimizedTasks.map(async (rawTask) => {
      const getTaskIndex = () => tasksStore.tasks.findIndex(t => t.id === rawTask.id);

      const updateTask = (updates: Partial<UploadTask>) => {
        const index = getTaskIndex();
        if (index !== -1) {
          Object.assign(tasksStore.tasks[index], updates);
        }
      };

      updateTask({ status: 'uploading' });

      try {
        const options = {
          tags: props.tags,
          onProgress: (p: number) => {
            updateTask({ progress: p });
            props.onProgress$?.(p);
          }
        };
        
        const response = props.useSecure 
          ? await client.secureUpload(rawTask.file, options)
          : await client.upload(rawTask.file, options);
          
        updateTask({ status: 'success', progress: 100, response });
        successfulResponses.push(response);
        props.onSuccess$?.(response);
      } catch (err: any) {
        updateTask({ status: 'error', error: err.message || 'Upload failed' });
        props.onError$?.(err);
      } finally {
        completedCount++;
        if (completedCount === optimizedTasks.length) {
          if (successfulResponses.length > 0) {
            props.onSuccessAll$?.(successfulResponses);
          }
        }
      }
    }));
  });

  return (
    <div 
      class={`picha-upload-zone ${isDragging.value ? 'is-dragging' : ''} ${props.class || ''}`}
      preventdefault:dragover
      preventdefault:dragleave
      preventdefault:drop
      onDragOver$={() => isDragging.value = true}
      onDragLeave$={() => isDragging.value = false}
      onDrop$={(e) => {
        isDragging.value = false;
        const files = Array.from(e.dataTransfer?.files || []) as File[];
        if (files.length) handleFiles(files);
      }}
    >
      {tasksStore.tasks.length === 0 ? (
        <div class="picha-upload-content">
          <svg class="picha-upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          <p class="picha-upload-text">
            Drag & drop or <label class="picha-upload-link">
              browse
              <input 
                type="file" 
                accept="image/*"
                multiple
                ref={inputRef}
                onChange$={(e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
                  if (files.length) handleFiles(files);
                  (e.target as HTMLInputElement).value = '';
                }}
                hidden 
              />
            </label>
          </p>
        </div>
      ) : (
        <div class="picha-uploading-list">
          {tasksStore.tasks.map(task => (
            <div key={task.id} class="picha-task-item">
              <div class="picha-task-info">
                <span class="picha-file-name">{task.file.name}</span>
                <span class={`picha-status-text ${task.status}`}>
                  {task.status === 'success' ? 'Uploaded' : task.status === 'error' ? 'Failed' : `${task.progress}%`}
                </span>
              </div>
              <div class="picha-progress-bar">
                <div class={`picha-progress-fill ${task.status}`} style={{ width: `${task.progress}%` }}></div>
              </div>
              {task.error && <p class="picha-error-text">{task.error}</p>}
            </div>
          ))}
          
          <div class="picha-add-more">
            <p class="picha-upload-text">
              <label class="picha-upload-link">
                Upload more files
                <input 
                  type="file" 
                  accept="image/*"
                  multiple
                  onChange$={(e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
                    if (files.length) handleFiles(files);
                    (e.target as HTMLInputElement).value = '';
                  }}
                  hidden 
                />
              </label>
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
