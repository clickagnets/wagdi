import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import Icon from './Icon';
import Spinner from './Spinner';

interface ImageCropModalProps {
  imageSrc: string;
  mimeType: string;
  aspect: number;
  onSave: (croppedImage: { base64: string, mimeType: string }) => void;
  onClose: () => void;
}

// Helper to get the cropped image data from a canvas
function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
  mimeType: string
): Promise<{ base64: string, mimeType: string }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = Math.floor(crop.width * scaleX);
    canvas.height = Math.floor(crop.height * scaleY);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const cropX = crop.x * scaleX;
    const cropY = crop.y * scaleY;
    const cropWidth = crop.width * scaleX;
    const cropHeight = crop.height * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          if (reader.result) {
            const base64data = (reader.result as string).split(',')[1];
            resolve({ base64: base64data, mimeType: mimeType });
          } else {
             reject(new Error('Failed to read blob as data URL'));
          }
        };
        reader.onerror = (error) => reject(error);
      },
      mimeType,
      1 // quality
    );
  });
}


const ImageCropModal: React.FC<ImageCropModalProps> = ({ imageSrc, mimeType, aspect, onSave, onClose }) => {
  const [crop, setCrop] = useState<Crop>();
  const [isSaving, setIsSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height, naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ width, height });

    if (naturalWidth > 0 && naturalHeight > 0) {
      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspect,
          naturalWidth,
          naturalHeight
        ),
        naturalWidth,
        naturalHeight
      );
      setCrop(newCrop);
    }
  }
  
  // Recalculate crop when aspect ratio changes after image has loaded
  useEffect(() => {
    if (imgRef.current) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      if (naturalWidth > 0 && naturalHeight > 0) {
        const newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: '%',
              width: 90,
            },
            aspect,
            naturalWidth,
            naturalHeight
          ),
          naturalWidth,
          naturalHeight
        );
        setCrop(newCrop);
      }
    }
  }, [aspect]);

  const handleSaveClick = async () => {
    if (imgRef.current && crop?.width && crop?.height) {
      setIsSaving(true);
      try {
        const croppedImage = await getCroppedImg(imgRef.current, crop, mimeType);
        onSave(croppedImage);
      } catch (e) {
        console.error('Cropping failed', e);
        // In a real app, you might want to show an error to the user here.
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="crop-modal-title">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="p-4 flex items-center justify-between border-b border-gray-700 flex-shrink-0">
          <h2 id="crop-modal-title" className="text-xl font-semibold text-white">
             Crop Product Image
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close cropping tool">
             <Icon type="close" />
          </button>
        </header>

        <main className="p-6 flex-grow flex items-center justify-center overflow-auto bg-black/50">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                alt="Image to crop"
                src={imageSrc}
                onLoad={onImageLoad}
                style={{
                    ...(!imgSize.width && { // Before load, use constraints
                        maxHeight: '65vh',
                        maxWidth: '100%',
                    }),
                    ...(imgSize.width && { // After load, use explicit scaled size
                        width: imgSize.width * scale,
                        height: imgSize.height * scale,
                        maxWidth: 'none',
                    })
                }}
                className="object-contain"
              />
            </ReactCrop>
        </main>
        
        <footer className="p-4 flex justify-between items-center gap-4 border-t border-gray-700 flex-shrink-0">
           <div className="flex items-center gap-2 w-1/2 max-w-xs">
              <Icon type="zoomOut" className="w-5 h-5 text-gray-400" />
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                aria-label="Image zoom"
              />
              <Icon type="zoomIn" className="w-5 h-5 text-gray-400" />
            </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClick}
              disabled={isSaving || !crop?.width || !crop?.height}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {isSaving ? <><Spinner size="sm" /> Saving...</> : 'Crop & Save Image'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ImageCropModal;