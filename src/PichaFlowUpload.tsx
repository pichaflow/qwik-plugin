import { component$, useSignal, useStore, $, useStylesScoped$ } from '@builder.io/qwik';
import { PichaFlowClient, type UploadResponse, optimizeImageForUpload } from '@pichaflow/sdk';

export interface PichaFlowUploadProps {
  apiKey?: string;
  baseUrl?: string;
  uploadUrl?: string;
  fetchUrl?: string;
  tenantId?: string;
  signatureUrl?: string;
  customUploadEndpoint?: string;
  useSecure?: boolean;
  tags?: string[];
  directory?: string;
  class?: string;
  onSuccess$?: (response: UploadResponse) => void;
  onSuccessAll$?: (responses: UploadResponse[]) => void;
  onError$?: (error: any) => void;
  onProgress$?: (progress: number) => void;
  allowDeletion?: boolean;
  onDelete$?: (id: string) => void;
  onDeleteError$?: (error: any) => void;
  multiple?: boolean;
}

type UploadTask = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error' | 'deleting' | 'deleted';
  error?: string;
  response?: UploadResponse;
};

export const PichaFlowUpload = component$((props: PichaFlowUploadProps) => {
  const isDragging = useSignal(false);
  const tasksStore = useStore<{ tasks: UploadTask[] }>({ tasks: [] }, { deep: true });
  const inputRef = useSignal<HTMLInputElement>();
  
  const multiple = props.multiple !== false;
  const allowDeletion = props.allowDeletion !== false;

  useStylesScoped$(`
    .picha-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      font-family: inherit;
      width: 100%;
    }
    .picha-upload-zone {
      border: 1px dashed #e4e4e7;
      border-radius: 0.75rem;
      padding: 2.5rem 2rem;
      transition: all 0.2s ease;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .picha-upload-zone:hover {
      border-color: #a1a1aa;
    }
    .picha-upload-zone.is-dragging {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .picha-upload-circle {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
    }
    .picha-upload-icon {
      width: 1.25rem;
      height: 1.25rem;
      color: #71717a;
    }
    .picha-upload-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: #09090b;
      margin: 0 0 0.25rem 0;
    }
    .picha-upload-description {
      font-size: 0.75rem;
      color: #71717a;
      margin: 0;
      text-align: center;
    }
    .picha-upload-link {
      color: #00a3ff;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 600;
    }
    .picha-upload-remove-current {
      font-size: 0.75rem;
      color: #ef4444;
      text-decoration: underline;
      cursor: pointer;
      margin-top: 0.5rem;
      background: none;
      border: none;
      padding: 0;
    }
    
    .picha-uploading-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .picha-task-item {
      background: #ffffff;
      padding: 0.75rem;
      border-radius: 0.5rem;
      border: 1px solid #e4e4e7;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
    }
    .picha-task-thumbnail-container {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.375rem;
      overflow: hidden;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .picha-task-thumbnail {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: all 0.2s ease;
    }
    .picha-task-thumbnail.greyed {
      filter: grayscale(100%);
      opacity: 0.5;
    }
    .picha-task-details {
      flex-grow: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .picha-file-name {
      font-size: 0.875rem;
      font-weight: 500;
      color: #09090b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .picha-file-size {
      font-size: 0.75rem;
      color: #71717a;
    }
    .picha-progress-container {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .picha-progress-bar {
      flex-grow: 1;
      background: #e4e4e7;
      height: 0.25rem;
      border-radius: 999px;
      overflow: hidden;
    }
    .picha-progress-fill {
      background: #09090b;
      height: 100%;
      transition: width 0.1s ease;
    }
    .picha-progress-percent {
      font-size: 0.75rem;
      color: #71717a;
      flex-shrink: 0;
    }
    .picha-delete-btn {
      background: none;
      border: none;
      color: #71717a;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .picha-delete-btn:hover:not(:disabled) {
      color: #ef4444;
      background: #f4f4f5;
    }
    .picha-delete-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .picha-remove-all-btn {
      align-self: flex-start;
      background: none;
      border: 1px solid #e4e4e7;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 0.375rem;
      color: #09090b;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }
    .picha-remove-all-btn:hover {
      background: #f4f4f5;
    }
    .picha-error-text {
      margin: 0;
      font-size: 0.75rem;
      color: #ef4444;
    }

    @media (prefers-color-scheme: dark) {
      .picha-upload-zone {
        background: #0c0c0e;
        border-color: #27272a;
      }
      .picha-upload-zone:hover {
        border-color: #71717a;
      }
      .picha-upload-circle {
        background: #18181b;
        border-color: #27272a;
      }
      .picha-upload-icon {
        color: #a1a1aa;
      }
      .picha-upload-title {
        color: #ffffff;
      }
      .picha-upload-description {
        color: #a1a1aa;
      }
      .picha-task-item {
        background: #0f0f11;
        border-color: #27272a;
      }
      .picha-task-thumbnail-container {
        background: #18181b;
        border-color: #27272a;
      }
      .picha-file-name {
        color: #ffffff;
      }
      .picha-file-size {
        color: #a1a1aa;
      }
      .picha-progress-bar {
        background: #27272a;
      }
      .picha-progress-fill {
        background: #ffffff;
      }
      .picha-progress-percent {
        color: #a1a1aa;
      }
      .picha-delete-btn {
        color: #a1a1aa;
      }
      .picha-delete-btn:hover:not(:disabled) {
        background: #18181b;
      }
      .picha-remove-all-btn {
        border-color: #27272a;
        color: #ffffff;
      }
      .picha-remove-all-btn:hover {
        background: #18181b;
      }
    }
  `);

  const handleFiles = $(async (files: File[]) => {
    if (files.length === 0) return;

    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      props.onError$?.(new Error('Only image files are supported.'));
      return;
    }

    const filesToUpload = multiple ? imageFiles : [imageFiles[0]];

    const client = new PichaFlowClient({
      apiKey: props.apiKey,
      baseUrl: props.baseUrl,
      uploadUrl: props.uploadUrl,
      fetchUrl: props.fetchUrl,
      tenantId: props.tenantId,
      signatureUrl: props.signatureUrl,
      customUploadEndpoint: props.customUploadEndpoint
    });

    if (!multiple) {
      // Clear/delete existing tasks
      tasksStore.tasks.forEach(t => {
        if (t.response?.id && allowDeletion) {
          client.deleteAsset(t.response.id).catch(() => {});
        }
      });
      tasksStore.tasks = [];
    }

    const previewTasks: UploadTask[] = imageFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'pending' as const
    }));

    if (multiple) {
      tasksStore.tasks.push(...previewTasks);
    } else {
      tasksStore.tasks = previewTasks;
    }

    let completedCount = 0;
    const successfulResponses: UploadResponse[] = [];

    await Promise.all(previewTasks.map(async (task) => {
      const getTaskIndex = () => tasksStore.tasks.findIndex(t => t.id === task.id);

      const updateTask = (updates: Partial<UploadTask>) => {
        const index = getTaskIndex();
        if (index !== -1) {
          Object.assign(tasksStore.tasks[index], updates);
        }
      };

      try {
        const optimizedFile = await optimizeImageForUpload(task.file);
        updateTask({ status: 'uploading', file: optimizedFile });

        const options = {
          tags: props.tags,
          directory: props.directory,
          signatureUrl: props.signatureUrl,
          customUploadEndpoint: props.customUploadEndpoint,
          onProgress: (p: number) => {
            updateTask({ progress: p });
            props.onProgress$?.(p);
          }
        };

        const response = props.useSecure
          ? await client.secureUpload(optimizedFile, options)
          : await client.upload(optimizedFile, options);

        updateTask({ status: 'success', progress: 100, response });
        successfulResponses.push(response);
        props.onSuccess$?.(response);
      } catch (err: any) {
        updateTask({ status: 'error', error: err.message || 'Upload failed' });
        props.onError$?.(err);
      } finally {
        completedCount++;
        if (completedCount === previewTasks.length) {
          if (successfulResponses.length > 0) {
            props.onSuccessAll$?.(successfulResponses);
          }
        }
      }
    }));
  });

  const handleDelete = $(async (taskId: string, assetId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    const getTaskIndex = () => tasksStore.tasks.findIndex(t => t.id === taskId);
    const index = getTaskIndex();
    if (index === -1) return;
    
    tasksStore.tasks[index].status = 'deleting';

    const client = new PichaFlowClient({
      apiKey: props.apiKey,
      baseUrl: props.baseUrl,
      uploadUrl: props.uploadUrl,
      fetchUrl: props.fetchUrl,
      tenantId: props.tenantId
    });

    try {
      await client.deleteAsset(assetId);
      tasksStore.tasks = tasksStore.tasks.filter(t => t.id !== taskId);
      props.onDelete$?.(assetId);
    } catch (err: any) {
      const errorIndex = getTaskIndex();
      if (errorIndex !== -1) {
        tasksStore.tasks[errorIndex].status = 'success';
      }
      props.onDeleteError$?.(err);
    }
  });

  const handleRemoveAll = $(async () => {
    if (!window.confirm('Are you sure you want to remove all files?')) {
      return;
    }
    const uploadedTasks = tasksStore.tasks.filter(t => t.response?.id);
    tasksStore.tasks = [];
    if (allowDeletion) {
      const client = new PichaFlowClient({
        apiKey: props.apiKey,
        baseUrl: props.baseUrl,
        uploadUrl: props.uploadUrl,
        fetchUrl: props.fetchUrl,
        tenantId: props.tenantId
      });
      await Promise.all(uploadedTasks.map(t => client.deleteAsset(t.response!.id).catch(() => {})));
    }
  });

  const handleClearSingle = $(async () => {
    if (tasksStore.tasks.length > 0) {
      const task = tasksStore.tasks[0];
      if (task.response?.id && allowDeletion) {
        if (!window.confirm('Are you sure you want to delete this file?')) {
          return;
        }
        const client = new PichaFlowClient({
          apiKey: props.apiKey,
          baseUrl: props.baseUrl,
          uploadUrl: props.uploadUrl,
          fetchUrl: props.fetchUrl,
          tenantId: props.tenantId
        });
        client.deleteAsset(task.response.id).catch(() => {});
      }
      tasksStore.tasks = [];
    }
  });

  const formatSize = $((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  });

  return (
    <div class={`picha-container ${props.class || ''}`}>
      <div
        class={`picha-upload-zone ${isDragging.value ? 'is-dragging' : ''}`}
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
        onClick$={() => inputRef.value?.click()}
      >
        <div class="picha-upload-circle">
          <svg class="picha-upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
        </div>
        <p class="picha-upload-title">
          {multiple ? 'Upload files' : 'Upload file'}
        </p>
        <p class="picha-upload-description">
          Drag & drop or <span class="picha-upload-link">browse</span>
        </p>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          ref={inputRef}
          onChange$={(e) => {
            const files = Array.from((e.target as HTMLInputElement).files || []) as File[];
            if (files.length) handleFiles(files);
            (e.target as HTMLInputElement).value = '';
          }}
          hidden
        />
        {!multiple && tasksStore.tasks.length > 0 && (
          <button
            type="button"
            class="picha-upload-remove-current"
            onClick$={(e) => {
              e.stopPropagation();
              handleClearSingle();
            }}
          >
            Remove the current file to upload a new one.
          </button>
        )}
      </div>

      {tasksStore.tasks.length > 0 && (
        <div class="picha-uploading-list">
          {tasksStore.tasks.map(task => (
            <div key={task.id} class="picha-task-item">
              <div class="picha-task-thumbnail-container">
                <img
                  src={task.previewUrl}
                  alt={task.file.name}
                  class={`picha-task-thumbnail ${task.status !== 'success' ? 'greyed' : ''}`}
                />
              </div>
              <div class="picha-task-details">
                <span class="picha-file-name" title={task.file.name}>{task.file.name}</span>
                <span class="picha-file-size">{formatSize(task.file.size)}</span>
                
                {task.status !== 'success' && task.status !== 'error' && (
                  <div class="picha-progress-container">
                    <div class="picha-progress-bar">
                      <div class="picha-progress-fill" style={{ width: `${task.progress}%` }}></div>
                    </div>
                    <span class="picha-progress-percent">{task.progress}%</span>
                  </div>
                )}

                {task.error && <p class="picha-error-text">{task.error}</p>}
              </div>
              
              <div class="picha-task-right">
                {allowDeletion && (
                  <button
                    type="button"
                    onClick$={(e) => {
                      e.stopPropagation();
                      if (task.response?.id) {
                        handleDelete(task.id, task.response.id);
                      } else {
                        tasksStore.tasks = tasksStore.tasks.filter(t => t.id !== task.id);
                      }
                    }}
                    class="picha-delete-btn"
                    title="Remove file"
                    disabled={task.status === 'deleting'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            </div>
          ))}

          {multiple && tasksStore.tasks.length > 0 && (
            <button
              type="button"
              class="picha-remove-all-btn"
              onClick$={handleRemoveAll}
            >
              Remove all files
            </button>
          )}
        </div>
      )}
    </div>
  );
});
