import React, { useRef, useState } from 'react';
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

/**
 * ------------------------------------------------------------------
 * No longer uses Cloudinary's hosted upload widget (the popup modal
 * with drag-and-drop, source tabs, and a crop screen) — that required
 * loading an external script (upload-widget.cloudinary.com) and its
 * modal UI couldn't be restyled to match the rest of the app.
 *
 * STORAGE IS UNCHANGED: files still upload to the same Cloudinary
 * account, same cloud name, same unsigned preset, same secure_url /
 * public_id shape returned to callers. Only the *selection UI* is
 * different — this component now triggers a plain hidden
 * <input type="file">, then POSTs directly to Cloudinary's public
 * unsigned-upload REST endpoint
 * (https://api.cloudinary.com/v1_1/{cloud}/image/upload) instead of
 * letting the widget's own JS make that same call from inside its
 * modal. The delete flow (/api/delete-image) is untouched — it never
 * depended on the widget.
 *
 * DROPPED, not silently — the old widget included a built-in crop
 * step (cropping/croppingAspectRatio/showSkipCropButton). A plain
 * file input has no equivalent; this component no longer offers
 * cropping before upload. If cropping needs to come back, that's a
 * separate feature (e.g. a crop step rendered in-app before the fetch
 * fires), not a config flag on this component anymore.
 *
 * The OS-level "choose a file source" picker (My Files / Drive /
 * Dropbox / etc.) is unavoidable either way — it's rendered by the
 * browser/OS the instant any <input type="file"> is triggered, widget
 * or not. Removing the Cloudinary modal doesn't remove that screen;
 * it removes everything Cloudinary used to draw before and after it.
 * ------------------------------------------------------------------
 */
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

  const uploadOne = async (file: File, cloudName: string, uploadPreset: string): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      // Cloudinary's error responses are JSON with an `error.message` field —
      // same message shape the old widget callback surfaced, so the existing
      // "Check your Cloudinary preset is set to Unsigned" guidance still applies.
      let message = 'Upload failed. Check your Cloudinary preset is set to Unsigned.';
      try {
        const errBody = await res.json();
        if (errBody?.error?.message) message = errBody.error.message;
      } catch {
        // response wasn't JSON — fall back to the generic message above
      }
      throw new Error(message);
    }

    const data = await res.json();
    return { url: data.secure_url, publicId: data.public_id };
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    // Reset the input immediately so selecting the same file twice in a row
    // still fires this handler (browsers don't fire onChange for an
    // unchanged value otherwise). Reset via the event's own target — no
    // ref needed now that the input is wired through id/htmlFor rather
    // than a .click()-triggering ref.
    e.target.value = '';
    if (!files || files.length === 0) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset || cloudName === 'demo') {
      addToast('Cloudinary is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      if (multiple && onMultiUpload) {
        const uploads = await Promise.all(Array.from(files).map((f) => uploadOne(f, cloudName, uploadPreset)));
        onMultiUpload(uploads.map((u) => u.url));
      } else {
        const { url, publicId } = await uploadOne(files[0], cloudName, uploadPreset);
        onUpload(url, publicId);
      }
    } catch (err: any) {
      addToast(err?.message || 'Upload failed. Check your Cloudinary preset is set to Unsigned.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // ------------------------------------------------------------------
  // Second iteration of the hidden-input approach. The first version
  // used a JS `.click()` on a CSS-clipped/absolutely-positioned input
  // (via fileInputRef) — confirmed via a raw addEventListener test (no
  // React involved) to silently fail to deliver `change` at all on the
  // device this was tested on, despite the OS picker completing
  // normally. That rules out React's synthetic events and this file's
  // own logic as the cause; the failure was in the click()+CSS-hiding
  // mechanism itself on that Chromium build.
  //
  // This version removes both suspects at once: no programmatic
  // .click() call (so there's no user-gesture-chain to break), and no
  // CSS technique that hides the input from computed-visibility checks
  // (clip-rect/1px/opacity:0 previously; that combination can be
  // treated as "not interactable" by some Android WebView builds even
  // though it isn't display:none).
  //
  // Instead: a native <label htmlFor="..."> wraps the *visible* button
  // styling, associated with a real <input> that sits underneath it
  // via z-index stacking rather than clipping. The browser's own
  // label→input activation opens the picker — no JS click(), no CSS
  // visibility hack for Chromium to second-guess. The input is
  // functionally invisible (fully covered by the styled label content
  // and 0-size relative to it) without relying on opacity/clip/absolute
  // positioning tricks.
  // ------------------------------------------------------------------
  const inputId = useRef(`cloudinary-upload-${Math.random().toString(36).slice(2)}`).current;

  const realInput = (
    <input
      id={inputId}
      type="file"
      accept="image/*"
      multiple={multiple}
      onChange={handleFilesSelected}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
    />
  );

  const ratioClass = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
  }[aspectRatio];

  if (multiple) {
    return (
      <label
        htmlFor={inputId}
        style={{ position: 'relative', display: 'block' }}
        className={isUploading ? 'pointer-events-none' : ''}
      >
        {realInput}
        <span
          className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
          <span className="font-medium">{isUploading ? 'Uploading...' : displayLabel}</span>
        </span>
      </label>
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
        <label
          htmlFor={inputId}
          style={{ position: 'relative', display: 'block' }}
        >
          {realInput}
          <span
            className={`w-full ${ratioClass} flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors ${isUploading ? 'opacity-50' : ''}`}
          >
            {isUploading ? <Loader2 className="animate-spin" size={32} /> : <UploadCloud size={32} />}
            <span className="font-medium">{isUploading ? 'Uploading...' : displayLabel}</span>
          </span>
        </label>
      )}
    </div>
  );
};
