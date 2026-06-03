import React, { useState } from 'react';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { supabase } from '../supabase';

interface CloudinaryUploadProps {
  onUpload: (url: string, publicId: string) => void;
  onMultiUpload?: (urls: string[]) => void;
  currentUrl?: string;
  currentPublicId?: string;
  label?: string;
  buttonText?: string;
  aspectRatio?: 'square' | 'landscape' | 'portrait';
  multiple?: boolean;
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({
  onUpload,
  onMultiUpload,
  currentUrl,
  currentPublicId,
  label,
  buttonText,
  aspectRatio = 'square',
  multiple = false,
}) => {
  const displayLabel = buttonText || label || 'Upload Image';
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();

  const handleOpenWidget = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset || cloudName === 'demo') {
      addToast('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.', 'error');
      return;
    }

    if (typeof window === 'undefined' || !(window as any).cloudinary) {
      addToast('Cloudinary widget not loaded', 'error');
      return;
    }

    setIsUploading(true);

    // Collect all uploaded URLs when multiple mode is on
    const batchUrls: string[] = [];

    const widget = (window as any).cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        multiple: multiple,
        maxFiles: multiple ? 20 : 1,
        cropping: !multiple, // disable cropping in multi-upload for smoother batch experience
        croppingAspectRatio: aspectRatio === 'square' ? 1 : aspectRatio === 'landscape' ? 16/9 : 3/4,
        showSkipCropButton: true,
      },
      (error: any, result: any) => {
        if (error) {
          addToast(error.message || 'Upload failed. Check your Cloudinary preset is set to Unsigned.', 'error');
          setIsUploading(false);
          return;
        }

        if (result?.event === 'success') {
          const url = result.info.secure_url;
          const publicId = result.info.public_id;
          if (multiple && onMultiUpload) {
            // Collect — don't close yet; flush when widget closes
            batchUrls.push(url);
          } else {
            // Single-image mode: fire immediately
            onUpload(url, publicId);
            setIsUploading(false);
          }
        }

        if (result?.event === 'close') {
          setIsUploading(false);
          // Flush all collected multi-upload URLs at once when widget closes
          if (multiple && onMultiUpload && batchUrls.length > 0) {
            onMultiUpload([...batchUrls]);
          }
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
              onClick={async (e) => {
                e.stopPropagation();

                // Use the stored publicId prop — reliable; the regex approach fails on many URL formats
                const idToDelete = currentPublicId || null;

                if (idToDelete && currentUrl && currentUrl.includes('cloudinary.com')) {
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token;
                    await fetch('/api/delete-image', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ publicId: idToDelete }),
                    });
                  } catch (err) {
                    console.error('Failed to call delete API', err);
                  }
                }

                onUpload('', '');
              }}
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
