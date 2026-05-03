import React, { useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface CloudinaryUploadProps {
  onUpload: (url: string, publicId: string) => void;
  currentUrl?: string;
  label?: string;
  buttonText?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  multiple?: boolean;
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({
  onUpload,
  currentUrl,
  label,
  buttonText,
  aspectRatio = 'square',
  multiple = false,
}) => {
  const displayLabel = buttonText || label || 'Upload Image';
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();

  const handleOpenWidget = () => {
    if (typeof window === 'undefined' || !(window as any).cloudinary) {
      addToast('Cloudinary widget not loaded', 'error');
      return;
    }

    setIsUploading(true);

    const widget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo',
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'docs_upload_example_us_preset',
        multiple: multiple,
        maxFiles: multiple ? 20 : 1,
        cropping: true,
        croppingAspectRatio: aspectRatio === 'square' ? 1 : aspectRatio === 'landscape' ? 16/9 : 3/4,
        showSkipCropButton: true,
      },
      (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          onUpload(result.info.secure_url, result.info.public_id);
        }
        if (error || result?.event === 'close') {
          setIsUploading(false);
        }
      }
    );

    widget.open();
  };

  const ratioClass = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  }[aspectRatio];

  if (multiple) {
    return (
      <button
        type="button"
        onClick={handleOpenWidget}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        {isUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
        <span className="font-medium">{isUploading ? 'Uploading...' : displayLabel}</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {currentUrl ? (
        <div className={`relative w-full ${ratioClass} bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group`}>
          <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onUpload('', ''); }}
              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
              title="Remove image"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenWidget}
          disabled={isUploading}
          className={`w-full ${ratioClass} flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors disabled:opacity-50`}
        >
          {isUploading ? <Loader2 className="animate-spin" size={32} /> : <UploadCloud size={32} />}
          <span className="font-medium">{isUploading ? 'Uploading...' : displayLabel}</span>
        </button>
      )}
    </div>
  );
};
