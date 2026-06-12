import { Button as ButtonPrimitive } from '@base-ui/react';
import * as React from 'react';
import { cn } from '@/lib/cn';

export type FileMetadata = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

export type FileWithPreview = {
  file: File | FileMetadata;
  id: string;
  preview?: string;
};

type UseFileUploadOptions = {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  initialFiles?: FileMetadata[];
  onFilesChange?: (files: FileWithPreview[]) => void;
  onFilesAdded?: (files: FileWithPreview[]) => void;
  onError?: (errors: string[]) => void;
};

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    accept = '*',
    multiple = false,
    maxSize = Infinity,
    maxFiles = Infinity,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
    onError,
  } = options;

  const inputRef = React.useRef<HTMLInputElement>(null);

  const [files, setFiles] = React.useState<FileWithPreview[]>(() =>
    initialFiles.map((f) => ({ file: f, id: f.id, preview: f.url })),
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    return () => {
      for (const f of files) {
        if (f.preview && f.file instanceof File) URL.revokeObjectURL(f.preview);
      }
    };
  }, []); // intentionally empty — only runs on unmount to revoke object URLs

  const addFiles = React.useCallback(
    (incoming: File[]) => {
      const errs: string[] = [];
      const valid: FileWithPreview[] = [];

      for (const file of incoming) {
        if (file.size > maxSize) {
          errs.push(`"${file.name}" vượt quá ${formatBytes(maxSize)}`);
          continue;
        }
        const wouldExceed = !multiple ? valid.length >= 1 : files.length + valid.length >= maxFiles;
        if (wouldExceed) {
          if (!multiple) break;
          errs.push(`Chỉ được tải lên tối đa ${maxFiles} file`);
          break;
        }
        const id = crypto.randomUUID();
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        valid.push(preview ? { file, id, preview } : { file, id });
      }

      if (errs.length > 0) {
        setErrors(errs);
        onError?.(errs);
      }

      if (valid.length > 0) {
        setFiles((prev) => {
          const next = multiple ? [...prev, ...valid] : valid;
          onFilesChange?.(next);
          onFilesAdded?.(valid);
          return next;
        });
      }
    },
    [files, multiple, maxSize, maxFiles, onFilesChange, onFilesAdded, onError],
  );

  const removeFile = React.useCallback(
    (id: string) => {
      setFiles((prev) => {
        const next = prev.filter((f) => {
          if (f.id !== id) return true;
          if (f.preview && f.file instanceof File) URL.revokeObjectURL(f.preview);
          return false;
        });
        onFilesChange?.(next);
        return next;
      });
    },
    [onFilesChange],
  );

  const clearFiles = React.useCallback(() => {
    setFiles((prev) => {
      for (const f of prev) {
        if (f.preview && f.file instanceof File) URL.revokeObjectURL(f.preview);
      }
      onFilesChange?.([]);
      return [];
    });
  }, [onFilesChange]);

  const clearErrors = React.useCallback(() => setErrors([]), []);
  const openFileDialog = React.useCallback(() => inputRef.current?.click(), []);

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) addFiles(dropped);
    },
    [addFiles],
  );

  const getInputProps = React.useCallback(
    (): React.InputHTMLAttributes<HTMLInputElement> => ({
      type: 'file',
      accept,
      multiple,
      onChange: (e) => {
        const selected = Array.from(e.target.files ?? []);
        if (selected.length > 0) addFiles(selected);
        e.target.value = '';
      },
    }),
    [accept, multiple, addFiles],
  );

  return [
    { files, isDragging, errors },
    {
      inputRef,
      openFileDialog,
      removeFile,
      clearFiles,
      clearErrors,
      addFiles,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
  ] as const;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

type FileUploadContextValue = ReturnType<typeof useFileUpload>[0] &
  ReturnType<typeof useFileUpload>[1];

const FileUploadContext = React.createContext<FileUploadContextValue | null>(null);

function useFileUploadContext() {
  const ctx = React.useContext(FileUploadContext);
  if (!ctx) throw new Error('Must be used inside <FileUpload>');
  return ctx;
}

type FileUploadRootProps = UseFileUploadOptions & { children: React.ReactNode };

function FileUpload({ children, ...options }: FileUploadRootProps) {
  const [state, actions] = useFileUpload(options);
  return (
    <FileUploadContext.Provider value={{ ...state, ...actions }}>
      {children}
    </FileUploadContext.Provider>
  );
}

function FileUploadDropzone({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } =
    useFileUploadContext();

  return (
    <div
      data-slot="file-upload-dropzone"
      data-dragging={isDragging || undefined}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background transition-colors',
        'data-[dragging]:border-primary data-[dragging]:bg-primary/5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function FileUploadTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ButtonPrimitive>) {
  const { inputRef, openFileDialog, getInputProps } = useFileUploadContext();

  return (
    <>
      <input ref={inputRef} className="sr-only" tabIndex={-1} {...getInputProps()} />
      <ButtonPrimitive
        data-slot="file-upload-trigger"
        type="button"
        onClick={openFileDialog}
        className={cn(
          'inline-flex cursor-pointer items-center gap-2 rounded-md text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </ButtonPrimitive>
    </>
  );
}

function FileUploadPreview({
  className,
  alt = 'preview',
  ...props
}: Omit<React.ComponentProps<'div'>, 'children'> & { alt?: string }) {
  const { files } = useFileUploadContext();
  const file = files[0];

  if (!file?.preview) return null;

  return (
    <div
      data-slot="file-upload-preview"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <img src={file.preview} alt={alt} className="h-full w-full object-cover" />
    </div>
  );
}

function FileUploadClear({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ButtonPrimitive>) {
  const { files, clearFiles } = useFileUploadContext();

  if (files.length === 0) return null;

  return (
    <ButtonPrimitive
      data-slot="file-upload-clear"
      type="button"
      onClick={clearFiles}
      className={cn(className)}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  );
}

function FileUploadErrors({ className, ...props }: React.ComponentProps<'ul'>) {
  const { errors } = useFileUploadContext();

  if (errors.length === 0) return null;

  return (
    <ul
      data-slot="file-upload-errors"
      className={cn('space-y-1 text-xs text-destructive', className)}
      {...props}
    >
      {errors.map((err, i) => (
        <li key={i}>{err}</li>
      ))}
    </ul>
  );
}

export {
  FileUpload,
  FileUploadClear,
  FileUploadDropzone,
  FileUploadErrors,
  FileUploadPreview,
  FileUploadTrigger,
};
